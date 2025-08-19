/** biome-ignore-all lint/correctness/useUniqueElementIds: maplibre requires static ids */
import "./App.css";

import type {
	LngLat,
	MapLayerMouseEvent,
	MarkerDragEvent,
} from "react-map-gl/maplibre";
import {
	Layer,
	Map as M,
	Marker,
	NavigationControl,
	Popup,
	Source,
} from "react-map-gl/maplibre";

import "maplibre-gl/dist/maplibre-gl.css";
import {
	booleanPointInPolygon,
	buffer,
	explode,
	nearestPoint,
	points,
} from "@turf/turf";
import PathFinder, { pathToGeoJSON } from "geojson-path-finder";
import { useEffect, useState } from "react";

function App() {
	const [popupCoord, setPopupCoord] = useState<LngLat>();
	const [showPopup, setShowPopup] = useState<boolean>(false);
	const [doorPointCollection, setDoorPointCollection] =
		useState<GeoJSON.FeatureCollection<GeoJSON.Point> | null>(null);
	const [floorplan, setFloorplan] =
		useState<GeoJSON.FeatureCollection<GeoJSON.Polygon> | null>(null);
	const [floorCollection, setfloorCollection] =
		useState<GeoJSON.FeatureCollection | null>(null);
	const [wallCollection, setWallCollection] =
		useState<GeoJSON.FeatureCollection | null>(null);
	const [walkwayCollection, setWalkwayCollection] =
		useState<GeoJSON.FeatureCollection<GeoJSON.LineString> | null>(null);
	const [start, setStart] = useState({
		lng: -79.35988895104677,
		lat: 43.812871320851855,
	});
	const [finish, setFinish] = useState({
		lng: -79.35984380982431,
		lat: 43.81274916336028,
	});
	const [path, setPath] = useState(null);

	function handleFloormapClick(e: MapLayerMouseEvent) {
		if (e.features) {
			setPopupCoord(e.lngLat);
			setShowPopup(true);
		}
	}

	useEffect(() => {
		if (!(floorplan && walkwayCollection)) return;
		const walkwayPoints = explode(walkwayCollection);
		const bufferedBooths = floorplan.features
			.map((booth) => buffer(booth, 0.0000001))
			.filter((booth): booth is GeoJSON.Feature<GeoJSON.Polygon> =>
				Boolean(booth),
			);

		const doorCoordinates: number[][] = [];
		for (const booth of bufferedBooths) {
			for (const point of walkwayPoints.features) {
				if (booleanPointInPolygon(point, booth)) {
					doorCoordinates.push(point.geometry.coordinates);
					break;
				}
			}
		}
		const doorPointCollection = points(doorCoordinates, { isdoor: true });
		setDoorPointCollection(doorPointCollection);
	}, [floorplan, walkwayCollection]);

	useEffect(() => {
		if (!walkwayCollection) return;

		const startPoint: GeoJSON.Feature<GeoJSON.Point> = {
			type: "Feature",
			id: 1,
			geometry: {
				type: "Point",
				coordinates: [start.lng, start.lat],
			},
			properties: {},
		};

		const finishPoint: GeoJSON.Feature<GeoJSON.Point> = {
			type: "Feature",
			id: 2,
			geometry: {
				type: "Point",
				coordinates: [finish.lng, finish.lat],
			},
			properties: {},
		};

		const walkwayPoints = explode(walkwayCollection);
		const nearestStartPoint = nearestPoint(startPoint, walkwayPoints);
		const nearestFinishPoint = nearestPoint(finishPoint, walkwayPoints);

		const pathFinder = new PathFinder(walkwayCollection, { tolerance: 1e-7 });
		const path = pathFinder.findPath(nearestStartPoint, nearestFinishPoint);
		setPath(pathToGeoJSON(path));
	}, [start, finish, walkwayCollection]);

	function handleDragEnd(e: MarkerDragEvent, which: string) {
		if (which === "start") {
			setStart(e.lngLat);
		}
		if (which === "finish") {
			setFinish(e.lngLat);
		}
	}

	useEffect(() => {
		async function processFeatures() {
			const response = await fetch("/floorplan.geojson");
			const floorplan = await response.json();

			const response_walkways = await fetch(
				"../public/walkway-connected-complete-single.geojson",
			);
			const walkwayCollection = await response_walkways.json();

			const floorFeatures = [];
			const wallFeatures = [];
			for (const feature of floorplan.features) {
				let floorFeature = {
					...feature,
					properties: {
						...feature.properties,
						type: "floor",
					},
				};
				floorFeature = buffer(feature, -0.0000015, { units: "degrees" });
				floorFeatures.push(floorFeature);

				// Create a LineString from the polygon coordinates
				const perimeterLine = {
					...feature, // Copy all properties from original feature
					geometry: {
						coordinates: feature.geometry.coordinates[0],
						type: "LineString",
					},
					properties: {
						...feature.properties,
						type: "wall",
					},
				};

				// Buffer the line to create a polygon with actual width
				const wallFeature = buffer(perimeterLine, 0.0000003, {
					units: "degrees",
				});
				wallFeature
					? wallFeatures.push(wallFeature)
					: console.log("wall not built, something went wrong!");
			}
			const floorCollection: GeoJSON.FeatureCollection<GeoJSON.Polygon> = {
				type: "FeatureCollection",
				features: floorFeatures,
			};
			const wallFeatureCollection: GeoJSON.FeatureCollection = {
				type: "FeatureCollection",
				features: wallFeatures,
			};

			setFloorplan(floorplan);
			setfloorCollection(floorCollection);
			setWallCollection(wallFeatureCollection);
			setWalkwayCollection(walkwayCollection);
		}
		processFeatures();
	}, []);

	return (
		<M
			interactiveLayerIds={["floormap-extrusion"]}
			onClick={(e) => handleFloormapClick(e)}
			initialViewState={{
				longitude: -79.35934795,
				latitude: 43.81288656,
				zoom: 19.3,
				bearing: 74.5,
			}}
			style={{ position: "relative", width: "100%", height: "100%" }}
			mapStyle={{
				name: "marketmap",
				version: 8,

				sources: {
					"raster-tiles": {
						type: "raster",
						tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
						tileSize: 256,
						minzoom: 0,
						maxzoom: 19,
					},
				},
				layers: [
					{
						id: "simple-tiles",
						type: "raster",
						source: "raster-tiles",
					},
				],
			}}
		>
			{floorCollection && (
				<Source id="floor" type="geojson" data={floorCollection}>
					<Layer
						id="floor-extrusion"
						type="fill-extrusion"
						paint={{
							"fill-extrusion-color": "#f5f5dc", // Light beige
							// Set floor height
							"fill-extrusion-height": 1,
							// Start at base level
							"fill-extrusion-base": 1,
							// Add slight opacity
							"fill-extrusion-opacity": 1,
							"fill-extrusion-vertical-gradient": true,
						}}
					/>
				</Source>
			)}
			{wallCollection && (
				<Source id="wall" type="geojson" data={wallCollection}>
					<Layer
						id="wall-3d-extrusion"
						type="fill-extrusion"
						paint={{
							"fill-extrusion-color": "#dddddd", // Light gray for walls
							"fill-extrusion-height": 2, // Wall height (taller than floors)
							"fill-extrusion-base": 1, // Start from floor height
							"fill-extrusion-opacity": 1,
							"fill-extrusion-vertical-gradient": true,
						}}
					/>
				</Source>
			)}
			{path && (
				<Source id="path" type="geojson" data={path}>
					<Layer
						id="path-layer"
						type="line"
						paint={{ "line-color": "green", "line-width": 4 }}
					/>
				</Source>
			)}
			{doorPointCollection && (
				<Source id="door" type="geojson" data={doorPointCollection}>
					<Layer id="door-layer" type="circle" />
				</Source>
			)}

			{showPopup && popupCoord && (
				<Popup
					longitude={popupCoord.lng}
					latitude={popupCoord.lat}
					onClose={() => setShowPopup(false)}
				>
					<button
						type="button"
						onClick={() => {
							setStart({ lng: popupCoord.lng, lat: popupCoord.lat });
							setShowPopup(false);
						}}
					>
						Im here
					</button>
					<button
						type="button"
						onClick={() => {
							setFinish({ lng: popupCoord.lng, lat: popupCoord.lat });
							setShowPopup(false);
						}}
					>
						Get here
					</button>
				</Popup>
			)}
			<Marker
				onDragEnd={(e) => handleDragEnd(e, "start")}
				color="green"
				longitude={start.lng}
				latitude={start.lat}
				anchor="center"
				draggable={true}
			>
				<img style={{ height: "2rem" }} src="./start.png" alt="humanoid" />
			</Marker>
			<Marker
				onDragEnd={(e) => handleDragEnd(e, "finish")}
				color="red"
				longitude={finish.lng}
				latitude={finish.lat}
				anchor="bottom"
				draggable={true}
			></Marker>
			<NavigationControl />
		</M>
	);
}

export default App;
