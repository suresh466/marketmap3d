/** biome-ignore-all lint/correctness/useUniqueElementIds: maplibre requires static ids */

import "./App.css";

import type { LngLatBoundsLike, Map as MapLibreMap } from "maplibre-gl";
import { LngLatBounds } from "maplibre-gl";
import type {
	IControl,
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
	useControl,
} from "react-map-gl/maplibre";

import "maplibre-gl/dist/maplibre-gl.css";
import {
	booleanPointInPolygon,
	buffer,
	explode,
	nearestPoint,
	points,
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
import { useEffect, useState } from "react";

class _FitToViewControl implements IControl {
	#container: HTMLDivElement | undefined;

	onAdd(map: MapLibreMap): HTMLElement {
		this.#container = document.createElement("div");
		this.#container.className = "maplibregl-ctrl";
		this.#container.style.marginBottom = "8rem";

		const button = document.createElement("button");
		button.className = "maplibregl-ctrl-icon";
		button.innerHTML = "👆";
		button.onclick = () => {
			const bounds: LngLatBoundsLike = [
				[-79.36003227, 43.81250021],
				[-79.3585528, 43.813410058],
			];
			map.fitBounds(bounds);
		};

		this.#container.appendChild(button);
		return this.#container;
	}

	onRemove() {
		this.#container?.remove();
	}
}

function SearchBox({ booths }: { booths: FeatureCollection<Polygon> }) {
	const [filteredBooths, setFilteredBooths] = useState<Feature<Polygon>[]>(
		booths.features,
	);
	const [searchTerm, setSearchTerm] = useState<string | null>(null);

	useEffect(() => {
		if (!searchTerm) return;

		const timeoutId = setTimeout(() => {
			const filteredBooths = booths.features.filter((booth) =>
				booth.properties?.label?.toLowerCase().includes(searchTerm),
			);
			setFilteredBooths(filteredBooths);
		}, 500);
		return () => clearTimeout(timeoutId);
	}, [searchTerm, booths]);

	return (
		<>
			<input
				id="boothsSearch"
				className="maplibregl-ctrl"
				style={{
					padding: "1rem",
					borderRadius: "0.5rem",
					width: "100%",
					boxSizing: "border-box",
				}}
				placeholder="Search Booth Number"
				onChange={(e) => setSearchTerm(e.target.value.toLowerCase())}
			/>
			<ul
				style={{
					listStyle: "none",
					padding: 0,
					width: "100%",
					color: "black",
				}}
			>
				{filteredBooths.map((booth) => {
					if (!booth.properties?.label) return null;
					return (
						<li style={{ padding: "1rem" }} key={booth.properties.id}>
							{booth.properties.label}
						</li>
					);
				})}
			</ul>
		</>
	);
}

function FitToViewControl() {
	useControl(() => new _FitToViewControl(), { position: "bottom-right" });
	return null;
}

function App() {
	const [popupCoord, setPopupCoord] = useState<LngLat>();
	const [doorPointCollection, setDoorPointCollection] =
		useState<FeatureCollection<Point> | null>(null);
	const [floorplan, setFloorplan] = useState<FeatureCollection<Polygon> | null>(
		null,
	);
	const [boothCollection, setBoothCollection] =
		useState<FeatureCollection<Polygon> | null>(null);
	const [wallCollection, setWallCollection] = useState<FeatureCollection<
		Polygon | MultiPolygon
	> | null>(null);
	const [walkwayCollection, setWalkwayCollection] =
		useState<FeatureCollection<LineString> | null>(null);
	const [start, setStart] = useState({
		lng: -79.35914121022692,
		lat: 43.81261407787761,
	});
	const [finish, setFinish] = useState({
		lng: -79.35974282681403,
		lat: 43.812829177963664,
	});
	const [path, setPath] = useState(null);

	function handleFloormapClick(e: MapLayerMouseEvent) {
		if (e.features) {
			const bounds = new LngLatBounds([
				[-79.36003227, 43.81250021],
				[-79.3585528, 43.813410058],
			]);

			const isInside = bounds.contains(e.lngLat);
			if (isInside) {
				setPopupCoord(e.lngLat);
			}
		}
	}

	useEffect(() => {
		if (!(floorplan && walkwayCollection)) return;
		const walkwayPoints = explode(walkwayCollection);
		const bufferedBooths = floorplan.features
			.map((booth) => buffer(booth, 0.0000001))
			.filter((booth): booth is Feature<Polygon> => Boolean(booth));

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

		const startPoint: Feature<Point> = {
			type: "Feature",
			id: 1,
			geometry: {
				type: "Point",
				coordinates: [start.lng, start.lat],
			},
			properties: {},
		};

		const finishPoint: Feature<Point> = {
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

			const boothFeatures = [];
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
				boothFeatures.push(floorFeature);

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

			setFloorplan(floorplan);
			setBoothCollection({
				type: "FeatureCollection",
				features: boothFeatures,
			});
			setWallCollection({ type: "FeatureCollection", features: wallFeatures });
			setWalkwayCollection(walkwayCollection);
		}
		processFeatures();
	}, []);

	return (
		<div style={{ position: "relative", width: "100%", height: "100%" }}>
			<div
				style={{
					position: "absolute",
					zIndex: 8,
					width: "100%",
					height: "100%",
				}}
			>
				<M
					interactiveLayerIds={["floormap-extrusion"]}
					onClick={(e) => handleFloormapClick(e)}
					initialViewState={{
						longitude: -79.35929253500002,
						latitude: 43.81295513573272,
						zoom: 17.5,
						// bearing: 74.5,
					}}
					style={{
						position: "relative",
						width: "100%",
						height: "100%",
					}}
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
					{boothCollection && (
						<Source id="floor" type="geojson" data={boothCollection}>
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
					{popupCoord && (
						<Popup
							longitude={popupCoord.lng}
							latitude={popupCoord.lat}
							onClose={() => setPopupCoord(undefined)}
						>
							<button
								type="button"
								onClick={() => {
									setStart({ lng: popupCoord.lng, lat: popupCoord.lat });
									setPopupCoord(undefined);
								}}
							>
								Im here
							</button>
							<button
								type="button"
								onClick={() => {
									setFinish({ lng: popupCoord.lng, lat: popupCoord.lat });
									setPopupCoord(undefined);
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
					<NavigationControl
						position="bottom-left"
						style={{ marginBottom: "8rem" }}
					></NavigationControl>
					<FitToViewControl />
				</M>
			</div>
			<div
				style={{
					position: "absolute",
					zIndex: 9,
					left: "1rem",
					right: "1rem",
					top: "1rem",
					backgroundColor: "white",
					padding: "1rem",
					borderRadius: "0.5rem",
				}}
			>
				{boothCollection && <SearchBox booths={boothCollection} />}
			</div>
		</div>
	);
}

export default App;
