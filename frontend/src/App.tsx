/** biome-ignore-all lint/correctness/useUniqueElementIds: maplibre requires static ids */

export interface SearchBoxProps {
	activeOverlay: "searchbox" | "popup" | null;
	setActiveOverlay: React.Dispatch<
		React.SetStateAction<"searchbox" | "popup" | null>
	>;
	onBoothSelect: (coords: { lng: number; lat: number }, which: string) => void;
	doors: FeatureCollection<Point>;
}
export interface MyMapProps {
	activeOverlay: "popup" | "searchbox" | null;
	setActiveOverlay: React.Dispatch<
		React.SetStateAction<"searchbox" | "popup" | null>
	>;
	origin: { lng: number; lat: number };
	dest: { lng: number; lat: number };
	boothCollection: FeatureCollection<Polygon> | null;
	walkwayCollection: FeatureCollection<LineString> | null;
	wallCollection: FeatureCollection<Polygon | MultiPolygon> | null;
	doorPointCollection: FeatureCollection<Point> | null;
	setOrigin: React.Dispatch<React.SetStateAction<{ lng: number; lat: number }>>;
	setDest: React.Dispatch<React.SetStateAction<{ lng: number; lat: number }>>;
}

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
import type React from "react";
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

function FitToViewControl() {
	useControl(() => new _FitToViewControl(), { position: "bottom-right" });
	return null;
}

function SearchBox({
	activeOverlay,
	setActiveOverlay,
	onBoothSelect,
	doors,
}: SearchBoxProps) {
	const [filteredBooths, setFilteredBooths] = useState<Feature<Point>[] | null>(
		doors.features,
	);
	const [originSearchTerm, setOriginSearchTerm] = useState<string | null>(null);
	const [destSearchTerm, setDestSearchTerm] = useState<string | null>(null);
	const [focusedSearchbox, setFocusedSearchbox] = useState<string | null>(null);
	const originSearchboxRef = useRef<HTMLInputElement | null>(null);
	const destSearchboxRef = useRef<HTMLInputElement | null>(null);

	useEffect(() => {
		const handleBackNavigation = () => {
			setFocusedSearchbox(null);
		};
		addEventListener("popstate", handleBackNavigation);
		return () => removeEventListener("popstate", handleBackNavigation);
	}, []);

	useEffect(() => {
		if (activeOverlay === "popup" && history.state?.collapseSearchbox) {
			history.back();
		}
	}, [activeOverlay]);

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

			const filteredBooths = doors.features.filter((booth) =>
				booth.properties?.label?.toLowerCase().includes(searchTerm),
			);
			setFilteredBooths(filteredBooths);
		}, 100);
		return () => clearTimeout(timeoutId);
	}, [focusedSearchbox, originSearchTerm, destSearchTerm, doors]);

	const isSelected = (boothLabel: string) => {
		const isSelected =
			(focusedSearchbox === "origin" &&
				originSearchTerm === boothLabel.toLowerCase()) ||
			(focusedSearchbox === "dest" &&
				destSearchTerm === boothLabel.toLowerCase());
		return isSelected;
	};

	return (
		<>
			{focusedSearchbox === null ? (
				// dummy searchbox
				<input
					className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 pl-10 text-gray-700 placeholder-gray-400 transition-all duration-200 focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
					readOnly
					value={destSearchTerm?.toUpperCase() || ""}
					id="boothsSearchDummy"
					style={{
						padding: "1rem",
						borderRadius: "0.5rem",
						width: "100%",
						boxSizing: "border-box",
					}}
					placeholder="Search For a Booth"
					onFocus={() => {
						if (activeOverlay !== "searchbox") setActiveOverlay("searchbox");
						if (!history.state?.collapseSearchbox) {
							history.pushState({ collapseSearchbox: true }, "", "");
						}
						if (originSearchTerm === null || originSearchTerm === "") {
							setFocusedSearchbox("origin");
						} else {
							setFocusedSearchbox("dest");
						}
					}}
				/>
			) : (
				<div className="flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
					{/* origin searchbox */}
					<div className="border-b border-gray-100 p-4">
						<input
							type="search"
							className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-gray-700 placeholder-gray-400 transition-all duration-200 focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
							value={originSearchTerm || ""}
							ref={originSearchboxRef}
							id="boothsSearch"
							placeholder="Search Origin Booth"
							onChange={(e) =>
								setOriginSearchTerm(e.target.value.toLowerCase())
							}
							onFocus={() => {
								if (focusedSearchbox !== "origin") {
									setFocusedSearchbox("origin");
								}
							}}
						/>
					</div>

					{/* dest searchbox */}
					<div className="border-b border-gray-100 p-4">
						<input
							type="search"
							className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-gray-700 placeholder-gray-400 transition-all duration-200 focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
							value={destSearchTerm || ""}
							ref={destSearchboxRef}
							id="destBoothsSearch"
							placeholder="Search Destination Booth"
							onChange={(e) => setDestSearchTerm(e.target.value.toLowerCase())}
							onFocus={() => {
								if (focusedSearchbox !== "dest") setFocusedSearchbox("dest");
							}}
						/>
					</div>

					<ul className="max-h-[60vh] overflow-y-auto scroll-smooth divide-y divide-gray-100">
						{filteredBooths?.map((booth) => {
							if (!booth.properties?.label) return null;
							return (
								<li
									className="transition-colors duration-200"
									key={booth.properties.id}
								>
									<button
										className={`w-full px-4 py-3 text-left transition-all duration-200 hover:bg-amber-50 font-medium ${isSelected(booth.properties.label) ? "bg-amber-50 text-amber-900" : "bg-white text-gray-900"}`}
										type="button"
										onClick={() => {
											const coords = {
												lng: booth.geometry.coordinates[0],
												lat: booth.geometry.coordinates[1],
											};
											onBoothSelect(coords, focusedSearchbox);

											if (focusedSearchbox === "origin") {
												setOriginSearchTerm(
													booth.properties?.label || "NO-Number",
												);
												if (destSearchTerm) {
													// event listener sets focusedSearchbox to null
													history.back();
												} else setFocusedSearchbox("dest");
											} else {
												setDestSearchTerm(
													booth.properties?.label || "No-Number",
												);
												if (originSearchTerm) {
													history.back();
												} else setFocusedSearchbox("origin");
											}
										}}
									>
										{booth.properties.label.toUpperCase()}
									</button>
								</li>
							);
						})}
					</ul>
				</div>
			)}
		</>
	);
}

function MyMap({
	activeOverlay,
	setActiveOverlay,
	boothCollection,
	walkwayCollection,
	wallCollection,
	doorPointCollection,
	origin,
	dest,
	setOrigin,
	setDest,
}: MyMapProps) {
	const [popupCoord, setPopupCoord] = useState<LngLat>();
	const [path, setPath] = useState(null);

	useEffect(() => {
		if (activeOverlay !== "popup") setPopupCoord(undefined);
	}, [activeOverlay]);

	function handleMapClick(e: MapLayerMouseEvent) {
		if (activeOverlay !== "popup") setActiveOverlay("popup");
		const bounds = new LngLatBounds([
			[-79.36003227, 43.81250021],
			[-79.3585528, 43.813410058],
		]);

		const isInside = bounds.contains(e.lngLat);
		if (isInside) {
			setPopupCoord(e.lngLat);
		}
	}

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

	return (
		<M
			doubleClickZoom={false}
			interactiveLayerIds={["floormap-extrusion"]}
			onClick={(e) => handleMapClick(e)}
			initialViewState={{
				longitude: -79.35929253500002,
				latitude: 43.81295513573272,
				zoom: 18,
				// bearing: 74.5,
			}}
			maxBounds={[
				[-79.364172095, 43.81073395],
				[-79.354266405, 43.814891107],
			]}
			style={{
				position: "relative",
				width: "100%",
				height: "100%",
			}}
			mapStyle="https://tiles.openfreemap.org/styles/bright"
		>
			{boothCollection && (
				<Source id="floor" type="geojson" data={boothCollection}>
					<Layer
						id="floor-extrusion"
						type="fill-extrusion"
						paint={{
							"fill-extrusion-color": "#FFFFE0", // Light beige
							// Set floor height
							"fill-extrusion-height": 2,
							// Start at base level
							"fill-extrusion-base": 0,
							// Add slight opacity
							"fill-extrusion-opacity": 1,
							"fill-extrusion-vertical-gradient": true,
						}}
					/>
					<Layer
						id="booth-label"
						type="symbol"
						layout={{
							"text-field": ["get", "label"],
							"text-font": ["Noto Sans Regular"],
							"text-size": 14,
							"text-anchor": "center",
						}}
						paint={{
							"text-color": "#000000",
							"text-halo-color": "#ffffff",
							"text-halo-width": 1,
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
							"fill-extrusion-base": 0, // Start from floor height
							"fill-extrusion-opacity": 1,
							"fill-extrusion-vertical-gradient": true,
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
			{doorPointCollection && null && (
				<Source id="door" type="geojson" data={doorPointCollection}>
					<Layer id="door-layer" type="circle" />
				</Source>
			)}
			{popupCoord && (
				<Popup
					closeButton={false}
					closeOnMove={true}
					focusAfterOpen={false}
					anchor="top-right"
					longitude={popupCoord.lng}
					latitude={popupCoord.lat}
					onClose={() => setPopupCoord(undefined)}
				>
					<div className="flex flex-col">
						{/* Custom close button */}
						<button
							className="absolute -right-1 top-0 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow-md transition-all duration-200 hover:bg-red-600 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-1"
							onClick={() => setPopupCoord(undefined)}
							aria-label="Close popup"
							type="button"
						>
							<span className="text-xs font-bold">×</span>
						</button>
						<button
							className="mt-4 w-full rounded-lg bg-amber-500 px-6 py-2 text-xs font-extrabold text-white transition-colors duration-200 hover:bg-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:ring-offset-2"
							type="button"
							onClick={() => {
								setOrigin({ lng: popupCoord.lng, lat: popupCoord.lat });
								setPopupCoord(undefined);
							}}
						>
							Im here
						</button>
						<button
							className="mt-1 w-full rounded-lg bg-teal-500 px-6 py-2 text-xs font-extrabold text-white transition-colors duration-200 hover:bg-teal-600 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:ring-offset-2"
							type="button"
							onClick={() => {
								setDest({ lng: popupCoord.lng, lat: popupCoord.lat });
								setPopupCoord(undefined);
							}}
						>
							Get here
						</button>
					</div>
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
	);
}

function App() {
	const [activeOverlay, setActiveOverlay] = useState<
		"popup" | "searchbox" | null
	>(null);
	const [boothCollection, setBoothCollection] =
		useState<FeatureCollection<Polygon> | null>(null);
	const [floorplan, setFloorplan] = useState<FeatureCollection<Polygon> | null>(
		null,
	);
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
		useState<FeatureCollection<Point> | null>(null);
	const [dest, setDest] = useState<{ lng: number; lat: number }>({
		lng: -79.35974282681403,
		lat: 43.812829177963664,
	});

	function handleBoothSelect(
		coords: { lng: number; lat: number },
		which: string,
	) {
		which === "origin" ? setOrigin(coords) : setDest(coords);
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
							label: booth.properties?.label || null,
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
				<MyMap
					activeOverlay={activeOverlay}
					setActiveOverlay={setActiveOverlay}
					doorPointCollection={doorPointCollection}
					boothCollection={boothCollection}
					walkwayCollection={walkwayCollection}
					wallCollection={wallCollection}
					origin={origin}
					dest={dest}
					setOrigin={setOrigin}
					setDest={setDest}
				></MyMap>
			</div>
			{/* searchbox */}
			<div className="absolute inset-x-4 top-2 z-20 md:inset-auto md:left-6 md:top-6 md:w-1/4">
				{doorPointCollection && (
					<SearchBox
						activeOverlay={activeOverlay}
						setActiveOverlay={setActiveOverlay}
						onBoothSelect={handleBoothSelect}
						doors={doorPointCollection}
					/>
				)}
			</div>
		</div>
	);
}

export default App;
