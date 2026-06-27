import {
  booleanPointInPolygon,
  buffer,
  featureCollection,
  nearestPoint,
  point,
  polygonToLine,
} from "@turf/turf";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useState } from "react";
import "./App.css";
import MyMap from "./components/MyMap";
import SearchBox from "./components/searchbox";
import type {
  Doors,
  Entrances,
  Floorplan,
  HandleBoothSelect,
  MyCoord,
  Walkways,
  Walls,
} from "./types";

function App() {
  // undefined means: "This variable hasn't been given a value."
  // null means: "This variable has been explicitly set to an empty object."
  // undefined is strongly preferred over null for optional state.
  const [entrances, setEntrances] = useState<Entrances>();
  const [bufferedFloorplan, setBufferedFloorplan] = useState<Floorplan>();
  const [walls, setWalls] = useState<Walls>();
  const [walkways, setWalkways] = useState<Walkways>();
  const [doors, setDoors] = useState<Doors>();
  const [origin, setOrigin] = useState<MyCoord>({
    lng: -79.35914121022692,
    lat: 43.81261407787761,
  });
  const [dest, setDest] = useState<MyCoord>({
    lng: -79.35974282681403,
    lat: 43.812829177963664,
  });

  useEffect(() => {
    async function processFeatures() {
      const response_floorplan = await fetch("/floorplan.geojson");
      const response_walkways = await fetch("/walkways.geojson");
      const response_entrances = await fetch("/entrance.geojson");
      const response_doors = await fetch("/doors.geojson");

      const floorplan: Floorplan = await response_floorplan.json();
      const walkways: Walkways = await response_walkways.json();
      const entrances: Entrances = await response_entrances.json();
      const doors: Doors = await response_doors.json();

      const bufferedFloorplan = buffer(floorplan, -0.1, {
        units: "meters",
      });
      // 1. Filter out everything that isn't a room
      const booths = featureCollection(
        floorplan.features.filter((poly) => poly.properties?.type === "booth"),
      );
      const boothPerimeters = featureCollection(
        booths.features.flatMap((booth) => {
          const wall = polygonToLine(booth);
          return wall.type === "FeatureCollection" ? wall.features : [wall];
        }),
      );

      const walls = buffer(boothPerimeters, 0.1, {
        units: "meters",
      });

      setBufferedFloorplan(bufferedFloorplan);
      setWalls(walls);
      setWalkways(walkways);
      setEntrances(entrances);
      setDoors(doors);
    }
    processFeatures();
  }, []);

  const handleBoothSelect: HandleBoothSelect = (coords, which) => {
    if (!bufferedFloorplan || !doors) return;
    let nearestDoor = null;

    for (const booth of bufferedFloorplan.features) {
      if (booleanPointInPolygon(point([coords.lng, coords.lat]), booth)) {
        nearestDoor = doors.features.find(
          (b) => b.properties?.id === booth.properties?.id,
        );
        break;
      }
    }
    if (!nearestDoor) {
      nearestDoor = nearestPoint(point([coords.lng, coords.lat]), doors);
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
        onBoothSelect={handleBoothSelect}
        bufferedFloorplan={bufferedFloorplan}
        walkways={walkways}
        entrances={entrances}
        walls={walls}
        origin={origin}
        dest={dest}
      ></MyMap>
      {/* searchbox */}
      {doors && (
        <div className="absolute top-2 inset-x-4 z-20 md:top-6 md:left-6 md:inset-auto md:w-1/4">
          <SearchBox onBoothSelect={handleBoothSelect} doors={doors} />
        </div>
      )}
    </>
  );
}

export default App;
