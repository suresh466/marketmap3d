import "./App.css";
import {
  booleanPointInPolygon,
  buffer,
  featureCollection,
  nearestPoint,
  point,
  polygonToLine,
} from "@turf/turf";
import type {
  FeatureCollection,
  LineString,
  MultiPolygon,
  Polygon,
} from "geojson";
import { LngLatBounds } from "maplibre-gl";
import MyMap from "./components/MyMap";
import SearchBox from "./components/searchbox";
import type {
  DoorCollection,
  HandleActiveOverlay,
  HandleBoothSelect,
  MyCoord,
} from "./types";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useState } from "react";

function App() {
  // undefined means: "This variable hasn't been given a value."
  // null means: "This variable has been explicitly set to an empty object."
  // undefined is strongly preferred over null for optional state.
  const [popupCoord, setPopupCoord] = useState<MyCoord | undefined>();
  const [entranceCollection, setEntranceCollection] =
    useState<FeatureCollection<Polygon | MultiPolygon> | null>(null);
  const [visibleFeatureCollection, setVisibleFeatureCollection] =
    useState<FeatureCollection<Polygon | MultiPolygon> | null>(null);
  const [floorCollection, setFloorCollection] = useState<FeatureCollection<
    Polygon | MultiPolygon
  > | null>(null);
  const [wallCollection, setWallCollection] = useState<FeatureCollection<
    Polygon | MultiPolygon
  > | null>(null);
  const [walkwayCollection, setWalkwayCollection] =
    useState<FeatureCollection<LineString> | null>(null);
  const [origin, setOrigin] = useState<{ lng: number; lat: number }>({
    lng: -79.35914121022692,
    lat: 43.81261407787761,
  });
  const [doorCollection, setDoorCollection] = useState<DoorCollection | null>(
    null,
  );
  const [dest, setDest] = useState<{ lng: number; lat: number }>({
    lng: -79.35974282681403,
    lat: 43.812829177963664,
  });

  useEffect(() => {
    async function processFeatures() {
      const response = await fetch("/floorplan.geojson");
      const response_walkways = await fetch(
        "/walkway-connected-complete-single.geojson",
      );
      const response_entrance = await fetch("/entrance.geojson");
      const response_door = await fetch("/doors.geojson");

      const floorplanCollection: FeatureCollection<Polygon | MultiPolygon> =
        await response.json();
      const walkwayCollection = await response_walkways.json();
      const entranceCollection: FeatureCollection<Polygon | MultiPolygon> =
        await response_entrance.json();
      const doorCollection: DoorCollection = await response_door.json();

      const visibleFeatures = buffer(floorplanCollection, -0.1, {
        units: "meters",
      });
      // 1. Filter out everything that isn't a room
      const roomFeatures = featureCollection(
        floorplanCollection.features.filter(
          (poly) => poly.properties?.type === "room",
        ),
      );
      const roomPerimeters = featureCollection(
        roomFeatures.features.flatMap((poly) => {
          const line = polygonToLine(poly);
          return line.type === "FeatureCollection" ? line.features : [line];
        }),
      );

      const wallFeatures = buffer(roomPerimeters, 0.1, {
        units: "meters",
      });

      setFloorCollection(floorplanCollection);
      setVisibleFeatureCollection(visibleFeatures || null);
      setWallCollection(wallFeatures || null);
      setWalkwayCollection(walkwayCollection);
      setEntranceCollection(entranceCollection);
      setDoorCollection(doorCollection);
    }
    processFeatures();
  }, []);

  const handleActiveOverlay: HandleActiveOverlay = (overlay, coords) => {
    if (overlay !== "searchbox" && history.state?.collapseSearchbox) {
      history.back();
    }
    if (overlay === null) {
      setPopupCoord(undefined);
      return;
    }

    if (overlay === "popup" && coords) {
      const isInside = new LngLatBounds([
        [-79.36003227, 43.81250021],
        [-79.3585528, 43.813410058],
      ]).contains(coords);

      if (isInside) {
        setPopupCoord(coords);
      }
    } else {
      setPopupCoord(undefined);
      if (!history.state?.collapseSearchbox) {
        history.pushState({ collapseSearchbox: true }, "", "");
      }
    }
  };

  const handleBoothSelect: HandleBoothSelect = (coords, which) => {
    if (!floorCollection || !doorCollection) return;
    let nearestDoor = null;

    for (const booth of floorCollection.features) {
      if (booleanPointInPolygon(point([coords.lng, coords.lat]), booth)) {
        nearestDoor = doorCollection?.features.find(
          (b) => b.properties?.id === booth.properties?.id,
        );
        break;
      }
    }
    if (!nearestDoor) {
      nearestDoor = nearestPoint(
        point([coords.lng, coords.lat]),
        doorCollection,
      );
    }

    coords = {
      lng: nearestDoor.geometry.coordinates[0],
      lat: nearestDoor.geometry.coordinates[1],
    };
    which === "origin" ? setOrigin(coords) : setDest(coords);
  };

  return (
    <>
      <MyMap
        popupCoord={popupCoord}
        onMapClick={handleActiveOverlay}
        onBoothSelect={handleBoothSelect}
        visibleFeatureCollection={visibleFeatureCollection}
        walkwayCollection={walkwayCollection}
        entranceCollection={entranceCollection}
        wallCollection={wallCollection}
        origin={origin}
        dest={dest}
      ></MyMap>
      {/* searchbox */}
      <div className="absolute top-2 inset-x-4 z-20 md:top-6 md:left-6 md:inset-auto md:w-1/4">
        {doorCollection && (
          <SearchBox
            onBoothSelect={handleBoothSelect}
            onInputActive={handleActiveOverlay}
            doors={doorCollection}
          />
        )}
      </div>
    </>
  );
}

export default App;
