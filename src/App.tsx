import "./App.css";
import {
  booleanPointInPolygon,
  buffer,
  explode,
  featureCollection,
  nearestPoint,
  point,
  polygonToLine,
} from "@turf/turf";
import type {
  Feature,
  FeatureCollection,
  LineString,
  MultiPolygon,
  Point,
  Polygon,
} from "geojson";
import PathFinder, { pathToGeoJSON } from "geojson-path-finder";
import type { ControlPosition, NavigationControlOptions } from "maplibre-gl";
import { LngLatBounds } from "maplibre-gl";
import PoiPopup from "./components/popup";
import SearchBox from "./components/searchbox";
import type {
  DoorCollection,
  HandleActiveOverlay,
  HandleBoothSelect,
  MyCoord,
  Overlay,
} from "./types";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import type { MapLayerMouseEvent, MapRef } from "react-map-gl/maplibre";
import {
  AttributionControl,
  Layer,
  Map as M,
  Marker,
  Source,
  useControl,
} from "react-map-gl/maplibre";
export type NavControlWithFitBoundsProps = NavigationControlOptions & {
  position?: ControlPosition;
};

// interfaces

export interface MyMapProps {
  popupCoord: MyCoord | undefined;
  onBoothSelect: HandleBoothSelect;
  onMapClick: HandleActiveOverlay;
  origin: { lng: number; lat: number };
  dest: { lng: number; lat: number };
  visibleFeatureCollection: FeatureCollection<Polygon | MultiPolygon> | null;
  walkwayCollection: FeatureCollection<LineString> | null;
  entranceCollection: FeatureCollection<Polygon | MultiPolygon> | null;
  wallCollection: FeatureCollection<Polygon | MultiPolygon> | null;
}

function App() {
  const [popupCoord, setPopupCoord] = useState<MyCoord | undefined>();
  const [activeOverlay, setActiveOverlay] = useState<Overlay>("");

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
  const [doorPointCollection, setDoorPointCollection] =
    useState<DoorCollection | null>(null);
  const [dest, setDest] = useState<{ lng: number; lat: number }>({
    lng: -79.35974282681403,
    lat: 43.812829177963664,
  });

  useEffect(() => {
    if (!(floorCollection && walkwayCollection)) return;
    const walkwayPoints = explode(walkwayCollection);
    const bufferedBooths = floorCollection.features.flatMap((poly) => {
      const booth = buffer(poly, 0.0000001);
      return booth ? [booth] : [];
    });

    const doorFeatures: Feature<Point>[] = [];
    for (const booth of bufferedBooths) {
      for (const walkwayPoint of walkwayPoints.features) {
        if (booleanPointInPolygon(walkwayPoint, booth)) {
          doorFeatures.push(
            point(walkwayPoint.geometry.coordinates, {
              id: booth.properties?.id || null,
              label: booth.properties?.label || null,
            }),
          );
          break;
        }
      }
    }
    const doorPointCollection = featureCollection(doorFeatures);
    setDoorPointCollection(doorPointCollection);
  }, [floorCollection, walkwayCollection]);

  useEffect(() => {
    async function processFeatures() {
      const response = await fetch("/floorplan.geojson");
      const response_walkways = await fetch(
        "/walkway-connected-complete-single.geojson",
      );
      const response_entrance = await fetch("/entrance.geojson");

      const floorplanCollection: FeatureCollection<Polygon | MultiPolygon> =
        await response.json();
      const walkwayCollection = await response_walkways.json();
      const entranceCollection: FeatureCollection<Polygon | MultiPolygon> =
        await response_entrance.json();

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
    }
    processFeatures();
  }, []);

  const handleActiveOverlay: HandleActiveOverlay = (coords, overlay) => {
    if (overlay === "") {
      setPopupCoord(undefined);
      return;
    }

    if (overlay === "popup") {
      const isInside = new LngLatBounds([
        [-79.36003227, 43.81250021],
        [-79.3585528, 43.813410058],
      ]).contains(coords);

      if (isInside) {
        setPopupCoord(coords);
        if (history.state?.collapseSearchbox) {
          history.back();
        }
        if (activeOverlay !== "popup") {
          setActiveOverlay("popup");
        }
      }
    } else {
      if (activeOverlay !== "searchbox") setActiveOverlay("searchbox");
      if (!history.state?.collapseSearchbox) {
        history.pushState({ collapseSearchbox: true }, "", "");
      }
      setPopupCoord(undefined);
    }
  };

  const handleBoothSelect: HandleBoothSelect = (coords, which) => {
    if (!floorCollection || !doorPointCollection) return;
    let nearestDoor = null;

    for (const booth of floorCollection.features) {
      if (booleanPointInPolygon(point([coords.lng, coords.lat]), booth)) {
        nearestDoor = doorPointCollection?.features.find(
          (b) => b.properties?.id === booth.properties?.id,
        );
        break;
      }
    }
    if (!nearestDoor) {
      nearestDoor = nearestPoint(
        point([coords.lng, coords.lat]),
        doorPointCollection,
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
        {doorPointCollection && (
          <SearchBox
            onBoothSelect={handleBoothSelect}
            onInputActive={handleActiveOverlay}
            doors={doorPointCollection}
          />
        )}
      </div>
    </>
  );
}

function NavControlWithFitBounds(props: NavControlWithFitBoundsProps) {
  useControl(
    ({ mapLib }) => {
      const nav = new mapLib.NavigationControl(props);

      return {
        onAdd: (map) => {
          const container = nav.onAdd(map);
          container.style.marginBottom =
            "calc(2rem + env(safe-area-inset-bottom))";
          const compassBtn = container.getElementsByClassName(
            "maplibregl-ctrl-compass",
          )[0] as HTMLButtonElement;

          compassBtn.onclick = () => {
            map.fitBounds([
              [-79.36003227, 43.81250021],
              [-79.3585528, 43.813410058],
            ]);
          };
          return container;
        },
        onRemove: () => nav.onRemove(),
      };
    },
    { position: props.position },
  );

  return null;
}

function MyMap({
  popupCoord,
  onMapClick,
  onBoothSelect,
  visibleFeatureCollection,
  walkwayCollection,
  entranceCollection,
  wallCollection,
  origin,
  dest,
}: MyMapProps) {
  const [path, setPath] = useState(null);
  const mapRef = useRef<MapRef>(null);

  useEffect(() => {
    if (!walkwayCollection) return;

    const originPoint: Feature<Point> = {
      type: "Feature",
      id: 1,
      geometry: {
        type: "Point",
        coordinates: [origin.lng, origin.lat],
      },
      properties: {},
    };

    const destPoint: Feature<Point> = {
      type: "Feature",
      id: 2,
      geometry: {
        type: "Point",
        coordinates: [dest.lng, dest.lat],
      },
      properties: {},
    };

    const walkwayPoints = explode(walkwayCollection);
    const nearestStartPoint = nearestPoint(originPoint, walkwayPoints);
    const nearestFinishPoint = nearestPoint(destPoint, walkwayPoints);

    const pathFinder = new PathFinder(walkwayCollection, { tolerance: 1e-7 });
    const path = pathFinder.findPath(nearestStartPoint, nearestFinishPoint);
    (path?.path.length || 0) > 2 ? setPath(pathToGeoJSON(path)) : setPath(null);
  }, [origin, dest, walkwayCollection]);

  function handleMapClick(e: MapLayerMouseEvent) {
    onMapClick(e.lngLat, "popup");
  }

  return (
    <M
      ref={mapRef}
      onLoad={() => {
        mapRef.current?.fitBounds([
          [-79.36003227, 43.81250021],
          [-79.3585528, 43.813410058],
        ]);
      }}
      attributionControl={false}
      interactiveLayerIds={["floormap-extrusion"]}
      onClick={(e) => handleMapClick(e)}
      initialViewState={{
        longitude: -79.35929253500002,
        latitude: 43.81295513573272,
        zoom: 18,
        // pitch: 50,
        // bearing: 74.5,
      }}
      maxBounds={[
        [-79.364172095, 43.81073395],
        [-79.354266405, 43.814891107],
      ]}
      style={{
        position: "absolute",
        width: "100%",
        height: "100%",
      }}
      // mapStyle="https://tiles.openfreemap.org/styles/positron"
      mapStyle="https://tiles.openfreemap.org/styles/positron"
    >
      {entranceCollection && (
        <Source id="entrances-source" type="geojson" data={entranceCollection}>
          <Layer
            id="entrance-layer"
            type="fill-extrusion"
            paint={{
              "fill-extrusion-color": "#fb2c36",
              "fill-extrusion-height": 3,
              "fill-extrusion-base": 0,
              "fill-extrusion-opacity": 0.6,
            }}
          ></Layer>
        </Source>
      )}

      {visibleFeatureCollection && (
        <Source
          id="booths-source"
          type="geojson"
          data={visibleFeatureCollection}
        >
          <Layer
            id="booths-layer"
            type="fill-extrusion"
            paint={{
              "fill-extrusion-color": "#cbd5e1",
              "fill-extrusion-height": 0.4,
              "fill-extrusion-base": 0,
              "fill-extrusion-opacity": 0.5,
            }}
          />
          <Layer
            id="labels-layer"
            type="symbol"
            layout={{
              "text-field": ["get", "label"],
              "text-font": ["Noto Sans Regular"],
              "text-size": [
                "interpolate",
                ["linear"],
                ["zoom"],
                19,
                10,
                22,
                16,
              ],
              "text-anchor": "bottom",
              "text-padding": 2,
              "text-transform": "uppercase",
              "text-letter-spacing": 0.05,
              "text-pitch-alignment": "viewport",
              "text-rotation-alignment": "viewport",
            }}
            paint={{
              "text-color": "#333333",
              "text-halo-color": "rgba(255, 255, 255, 0.9)",
              "text-halo-width": 1.5,
              "text-opacity": [
                "interpolate",
                ["linear"],
                ["zoom"],
                18.5,
                0,
                19,
                1,
              ],
            }}
            minzoom={19}
          />
        </Source>
      )}
      {wallCollection && (
        <Source id="wall" type="geojson" data={wallCollection}>
          <Layer
            id="wall-layer"
            type="fill-extrusion"
            paint={{
              "fill-extrusion-color": "#94a3b8",
              "fill-extrusion-height": 0.4,
              "fill-extrusion-base": 0,
              "fill-extrusion-opacity": 1,
            }}
          />
        </Source>
      )}
      {path && (
        <Source id="path" type="geojson" data={path} lineMetrics={true}>
          <Layer
            layout={{ "line-join": "bevel" }}
            id="path-layer"
            type="line"
            paint={{
              "line-width": 6,
              "line-gradient": [
                "interpolate",
                ["linear"],
                ["line-progress"],
                0,
                "rgba(102, 130, 153, 0.5)",
                0.1,
                "rgba(102, 130, 153, 1)",
                0.8,
                "rgba(102, 130, 153, 1)",
                0.9,
                "rgba(229, 0, 0, 1)",
                1,
                "rgba(229, 0, 0, 0.5)",
              ],
            }}
          />
        </Source>
      )}
      {popupCoord && (
        <PoiPopup
          popupCoord={popupCoord}
          onBoothSelect={onBoothSelect}
          onClose={() => onMapClick({ lng: 0, lat: 0 }, "")}
        />
      )}
      <Marker
        onDragEnd={(e) => onBoothSelect(e.lngLat, "origin")}
        color="green"
        longitude={origin.lng}
        latitude={origin.lat}
        anchor="bottom"
        draggable={true}
      >
        <img className="h-10" src="./start-512.png" alt="humanoid" />
      </Marker>
      <Marker
        onDragEnd={(e) => onBoothSelect(e.lngLat, "dest")}
        color="red"
        longitude={dest.lng}
        latitude={dest.lat}
        anchor="bottom"
        draggable={true}
      ></Marker>
      <AttributionControl position="bottom-left" />
      <NavControlWithFitBounds position="bottom-right" />
    </M>
  );
}

export default App;
