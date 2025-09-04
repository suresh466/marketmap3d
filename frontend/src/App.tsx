/** biome-ignore-all lint/correctness/useUniqueElementIds: maplibre requires static ids */

import "./App.css";

import {
	booleanPointInPolygon,
	buffer,
	explode,
	featureCollection,
	nearestPoint,
	point,
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
import type { LngLatBoundsLike, Map as MapLibreMap } from "maplibre-gl";
import { LngLatBounds } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
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

function SearchBox({
	booths,
	onBoothSelect,
	doors,
}: {
	booths: FeatureCollection<Polygon>;
	onBoothSelect: (coords: { lng: number; lat: number }, which: string) => void;
	doors: FeatureCollection<Point>;
}) {
	const [filteredBooths, setFilteredBooths] = useState<
		Feature<Polygon>[] | null
	>(booths.features);
	const [originSearchTerm, setOriginSearchTerm] = useState<string | null>(null);
	const [destSearchTerm, setDestSearchTerm] = useState<string | null>(null);
	const [focusedSearchbox, setFocusedSearchbox] = useState<string | null>(null);
	const originSearchboxRef = useRef<HTMLInputElement | null>(null);
	const destSearchboxRef = useRef<HTMLInputElement | null>(null);

	useEffect(() => {
		if (!focusedSearchbox) return;

		if (focusedSearchbox === "origin") {
			originSearchboxRef.current?.focus();
		}
		if (focusedSearchbox === "dest") {
			destSearchboxRef.current?.focus();
		}
	}, [focusedSearchbox]);

	useEffect(() => {
		// don't filter the booths before initial search
		if (originSearchTerm === null && destSearchTerm === null) {
			return;
		}
		const timeoutId = setTimeout(() => {
			const searchTerm =
				focusedSearchbox === "origin"
					? originSearchTerm || ""
					: destSearchTerm || "";

			const filteredBooths = booths.features.filter((booth) =>
				booth.properties?.label?.toLowerCase().includes(searchTerm),
			);
			setFilteredBooths(filteredBooths);
		}, 100);
		return () => clearTimeout(timeoutId);
	}, [focusedSearchbox, originSearchTerm, destSearchTerm, booths]);

	return (
		<>
			{focusedSearchbox === null ? (
				// dummy searchbox
				<input
					readOnly
					value={destSearchTerm || ""}
					id="boothsSearchDummy"
					className="maplibregl-ctrl"
					style={{
						padding: "1rem",
						borderRadius: "0.5rem",
						width: "100%",
						boxSizing: "border-box",
					}}
					placeholder="Search For a Booth"
					onFocus={() => {
						if (focusedSearchbox !== "origin") setFocusedSearchbox("origin");
					}}
				/>
			) : (
				<>
					{/* origin searchbox */}
					<input
						value={originSearchTerm || ""}
						ref={originSearchboxRef}
						id="boothsSearch"
						className="maplibregl-ctrl"
						style={{
							padding: "1rem",
							borderRadius: "0.5rem",
							width: "100%",
							boxSizing: "border-box",
						}}
						placeholder="Search Origin Booth"
						onChange={(e) => setOriginSearchTerm(e.target.value.toLowerCase())}
						onFocus={() => {
							if (focusedSearchbox !== "origin") {
								setFocusedSearchbox("origin");
							}
						}}
					/>
					{/* dest searchbox */}
					<input
						value={destSearchTerm || ""}
						ref={destSearchboxRef}
						id="destBoothsSearch"
						className="maplibregl-ctrl"
						style={{
							padding: "1rem",
							borderRadius: "0.5rem",
							width: "100%",
							boxSizing: "border-box",
						}}
						placeholder="Search Destination Booth"
						onChange={(e) => setDestSearchTerm(e.target.value.toLowerCase())}
						onFocus={() => {
							if (focusedSearchbox !== "dest") setFocusedSearchbox("dest");
						}}
					/>
					<ul
						style={{
							listStyle: "none",
							padding: 0,
							width: "100%",
							color: "black",
						}}
					>
						{filteredBooths?.map((booth) => {
							if (!booth.properties?.label) return null;
							return (
								<li style={{ padding: "1rem" }} key={booth.properties.id}>
									<button
										type="button"
										onClick={() => {
											for (const door of doors.features) {
												if (door.properties?.id === booth.properties?.id) {
													const coords = {
														lng: door.geometry.coordinates[0],
														lat: door.geometry.coordinates[1],
													};
													onBoothSelect(coords, focusedSearchbox);
													focusedSearchbox === "origin"
														? setOriginSearchTerm(booth.properties?.label)
														: setDestSearchTerm(booth.properties?.label);

													if (focusedSearchbox === "origin") {
														setOriginSearchTerm(booth.properties?.label);
														setFocusedSearchbox("dest");
													}
													if (focusedSearchbox === "dest") {
														setDestSearchTerm(booth.properties?.label);
														setFocusedSearchbox(null);
													}
													break;
												}
											}
										}}
									>
										{booth.properties.label}
									</button>
								</li>
							);
						})}
					</ul>
				</>
			)}
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
	const [origin, setOrigin] = useState<{ lng: number; lat: number }>({
		lng: -79.35914121022692,
		lat: 43.81261407787761,
	});
	const [dest, setDest] = useState<{ lng: number; lat: number }>({
		lng: -79.35974282681403,
		lat: 43.812829177963664,
	});
	const [path, setPath] = useState(null);

	function handleBoothSelect(
		coords: { lng: number; lat: number },
		which: string,
	) {
		which === "origin" ? setOrigin(coords) : setDest(coords);
	}

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

		const doorFeatures: Feature<Point>[] = [];
		for (const booth of bufferedBooths) {
			for (const walkwayPoint of walkwayPoints.features) {
				if (booleanPointInPolygon(walkwayPoint, booth)) {
					doorFeatures.push(
						point(walkwayPoint.geometry.coordinates, {
							id: booth.properties?.id || null,
						}),
					);
					break;
				}
			}
		}
		const doorPointCollection = featureCollection(doorFeatures);
		setDoorPointCollection(doorPointCollection);
	}, [floorplan, walkwayCollection]);

	useEffect(() => {
		if (!walkwayCollection) return;

		const startPoint: Feature<Point> = {
			type: "Feature",
			id: 1,
			geometry: {
				type: "Point",
				coordinates: [origin.lng, origin.lat],
			},
			properties: {},
		};

		const finishPoint: Feature<Point> = {
			type: "Feature",
			id: 2,
			geometry: {
				type: "Point",
				coordinates: [dest.lng, dest.lat],
			},
			properties: {},
		};

		const walkwayPoints = explode(walkwayCollection);
		const nearestStartPoint = nearestPoint(startPoint, walkwayPoints);
		const nearestFinishPoint = nearestPoint(finishPoint, walkwayPoints);

		const pathFinder = new PathFinder(walkwayCollection, { tolerance: 1e-7 });
		const path = pathFinder.findPath(nearestStartPoint, nearestFinishPoint);
		(path?.path.length || 0) > 2 ? setPath(pathToGeoJSON(path)) : setPath(null);
	}, [origin, dest, walkwayCollection]);

	function handleDragEnd(e: MarkerDragEvent, which: string) {
		if (which === "start") {
			setOrigin(e.lngLat);
		}
		if (which === "finish") {
			setDest(e.lngLat);
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
									setOrigin({ lng: popupCoord.lng, lat: popupCoord.lat });
									setPopupCoord(undefined);
								}}
							>
								Im here
							</button>
							<button
								type="button"
								onClick={() => {
									setDest({ lng: popupCoord.lng, lat: popupCoord.lat });
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
						longitude={origin.lng}
						latitude={origin.lat}
						anchor="center"
						draggable={true}
					>
						<img style={{ height: "2rem" }} src="./start.png" alt="humanoid" />
					</Marker>
					<Marker
						onDragEnd={(e) => handleDragEnd(e, "finish")}
						color="red"
						longitude={dest.lng}
						latitude={dest.lat}
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
				{boothCollection && doorPointCollection && (
					<SearchBox
						booths={boothCollection}
						onBoothSelect={handleBoothSelect}
						doors={doorPointCollection}
					/>
				)}
			</div>
		</div>
	);
}

export default App;
