import { explode, nearestPoint } from "@turf/turf";
import PathFinder, { pathToGeoJSON } from "geojson-path-finder";
import { LngLatBounds } from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import type {
  Booth,
  Entrances,
  Floorplan,
  HandleBoothSelect,
  HandleMapClick,
  MyCoord,
  Walkways,
  Walls,
} from "../types";
import NavControlWithFitBounds from "./NavControl";
import PoiPopup from "./popup";

export interface MyMapProps {
  onBoothSelect: HandleBoothSelect;
  origin: MyCoord;
  dest: MyCoord;
  bufferedFloorplan?: Floorplan;
  walkways?: Walkways;
  entrances?: Entrances;
  walls?: Walls;
}

import type { MapLayerMouseEvent, MapRef } from "react-map-gl/maplibre";
import {
  AttributionControl,
  Layer,
  Map as M,
  Marker,
  Source,
} from "react-map-gl/maplibre";

export default function MyMap({
  onBoothSelect,
  bufferedFloorplan,
  walkways,
  entrances,
  walls,
  origin,
  dest,
}: MyMapProps) {
  const [path, setPath] = useState(null);
  const mapRef = useRef<MapRef>(null);
  const [popupCoord, setPopupCoord] = useState<MyCoord>();

  useEffect(() => {
    if (!walkways) return;

    const originPoint: Booth = {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [origin.lng, origin.lat],
      },
      properties: {},
    };

    const destPoint: Booth = {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [dest.lng, dest.lat],
      },
      properties: {},
    };

    const walkwayPoints = explode(walkways);
    const nearestStartPoint = nearestPoint(originPoint, walkwayPoints);
    const nearestFinishPoint = nearestPoint(destPoint, walkwayPoints);

    const pathFinder = new PathFinder(walkways, { tolerance: 1e-7 });
    const foundPath = pathFinder.findPath(
      nearestStartPoint,
      nearestFinishPoint,
    );
    (foundPath?.path.length || 0) > 2
      ? setPath(pathToGeoJSON(foundPath))
      : setPath(null);
  }, [origin, dest, walkways]);

  const handlePopupClose = () => {
    setPopupCoord(undefined);
  };

  const handleMapClick: HandleMapClick = (coords) => {
    if (coords) {
      const isInside = new LngLatBounds([
        [-79.36003227, 43.81250021],
        [-79.3585528, 43.813410058],
      ]).contains(coords);
      if (isInside) setPopupCoord(coords);

      // collapseSearchbox
      if (history.state?.collapseSearchbox) history.back();
    }
  };

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
      onClick={(e: MapLayerMouseEvent) => handleMapClick(e.lngLat)}
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
      {entrances && (
        <Source id="entrances-source" type="geojson" data={entrances}>
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

      {bufferedFloorplan && (
        <Source id="booths-source" type="geojson" data={bufferedFloorplan}>
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
      {walls && (
        <Source id="wall" type="geojson" data={walls}>
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
          onClose={handlePopupClose}
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
