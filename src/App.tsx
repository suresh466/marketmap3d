/** biome-ignore-all lint/correctness/useUniqueElementIds: maplibre requires static ids */

export type NavControlWithFitBoundsProps = NavigationControlOptions & {
	position?: ControlPosition;
};

export interface SearchBoxProps {
	activeOverlay: "searchbox" | "popup" | null;
	setActiveOverlay: React.Dispatch<
		React.SetStateAction<"searchbox" | "popup" | null>
	>;
	onBoothSelect: (
		coords: { lng: number; lat: number },
		which: "origin" | "dest",
	) => void;
	doors: FeatureCollection<Point>;
}
export interface MyMapProps {
	activeOverlay: "popup" | "searchbox" | null;
	setActiveOverlay: React.Dispatch<
		React.SetStateAction<"searchbox" | "popup" | null>
	>;
	handleBoothSelect: (
		coords: { lng: number; lat: number },
		which: "origin" | "dest",
	) => void;

	origin: { lng: number; lat: number };
	dest: { lng: number; lat: number };
	roofCollection: FeatureCollection<Polygon> | null;
	floorCollection: FeatureCollection<Polygon> | null;
	walkwayCollection: FeatureCollection<LineString> | null;
	entranceCollection: FeatureCollection<Polygon> | null;
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
import "maplibre-gl/dist/maplibre-gl.css";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import type { LngLat, MapLayerMouseEvent, MapRef } from "react-map-gl/maplibre";
import {
	AttributionControl,
	Layer,
	Map as M,
	Marker,
	Popup,
	Source,
	useControl,
} from "react-map-gl/maplibre";

function App() {
	const [activeOverlay, setActiveOverlay] = useState<
		"popup" | "searchbox" | null
	>(null);

	const [entranceCollection, setEntranceCollection] =
		useState<FeatureCollection<Polygon> | null>(null);
	const [roofCollection, setRoofCollection] =
		useState<FeatureCollection<Polygon> | null>(null);
	const [floorCollection, setFloorCollection] =
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
	const [doorPointCollection, setDoorPointCollection] =
		useState<FeatureCollection<Point> | null>(null);
	const [dest, setDest] = useState<{ lng: number; lat: number }>({
		lng: -79.35974282681403,
		lat: 43.812829177963664,
	});

	useEffect(() => {
		if (!(floorCollection && walkwayCollection)) return;
		const walkwayPoints = explode(walkwayCollection);
		const bufferedBooths = floorCollection.features
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
	}, [floorCollection, walkwayCollection]);

	useEffect(() => {
		async function processFeatures() {
			const response = await fetch("/floorplan.geojson");
			const response_walkways = await fetch(
				"/walkway-connected-complete-single.geojson",
			);
			const response_entrance = await fetch("/entrance.geojson");

			const floorplanCollection = await response.json();
			const walkwayCollection = await response_walkways.json();
			const entranceCollection = await response_entrance.json();

			const roofFeatures = buffer(floorplanCollection, -0.1, {
				units: "meters",
			}) as unknown as FeatureCollection<Polygon>;

			const lineCollection = featureCollection(
				floorplanCollection.features.map((poly: Feature<Polygon>) =>
					polygonToLine(poly),
				),
			);
			const wallFeatures = buffer(lineCollection, 0.1, {
				units: "meters",
			}) as unknown as FeatureCollection<Polygon>;

			setFloorCollection(floorplanCollection);
			setRoofCollection(roofFeatures);
			setWallCollection(wallFeatures);
			setWalkwayCollection(walkwayCollection);
			setEntranceCollection(entranceCollection);
		}
		processFeatures();
	}, []);

	function handleBoothSelect(
		coords: { lng: number; lat: number },
		which: string,
	) {
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
	}

	return (
		<>
			<MyMap
				handleBoothSelect={handleBoothSelect}
				activeOverlay={activeOverlay}
				setActiveOverlay={setActiveOverlay}
				floorCollection={floorCollection}
				doorPointCollection={doorPointCollection}
				roofCollection={roofCollection}
				walkwayCollection={walkwayCollection}
				entranceCollection={entranceCollection}
				wallCollection={wallCollection}
				origin={origin}
				dest={dest}
				setOrigin={setOrigin}
				setDest={setDest}
			></MyMap>
			{/* searchbox */}
			<div className="absolute top-2 inset-x-4 z-20 md:top-6 md:left-6 md:inset-auto md:w-1/4">
				{doorPointCollection && (
					<SearchBox
						activeOverlay={activeOverlay}
						setActiveOverlay={setActiveOverlay}
						onBoothSelect={handleBoothSelect}
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
	handleBoothSelect,
	activeOverlay,
	setActiveOverlay,
	roofCollection,
	walkwayCollection,
	entranceCollection,
	wallCollection,
	doorPointCollection,
	origin,
	dest,
}: MyMapProps) {
	const [popupCoord, setPopupCoord] = useState<LngLat>();
	const [path, setPath] = useState(null);
	const mapRef = useRef<MapRef>(null);

	useEffect(() => {
		if (activeOverlay !== "popup") setPopupCoord(undefined);
	}, [activeOverlay]);

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
				<Source id="entrance" type="geojson" data={entranceCollection}>
					<Layer
						id="entrance-layer"
						type="fill-extrusion"
						paint={{
							"fill-extrusion-color": "#fb2c36",
							"fill-extrusion-height": 3,
							"fill-extrusion-base": 0,
							"fill-extrusion-opacity": 0.6,
							"fill-extrusion-vertical-gradient": true,
						}}
					></Layer>
					<Layer
						id="entrance-label-layer"
						type="symbol"
						layout={{
							"text-field": ["get", "label"],
							"text-font": ["Noto Sans Regular"],
							"text-size": [
								"interpolate",
								["linear"],
								["zoom"],
								19, 10,
								22, 16
							],
							"text-anchor": "center",
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
								18.5, 0,
								19, 1
							]
						}}
						minzoom={19}
					/>
				</Source>
			)}

			{roofCollection && (
				<Source id="roof" type="geojson" data={roofCollection}>
					<Layer
						id="roof-layer"
						type="fill-extrusion"
						paint={{
							"fill-extrusion-color": "#cbd5e1",
							"fill-extrusion-height": 1.2,
							"fill-extrusion-base": 1,
							"fill-extrusion-opacity": 0.5,
							"fill-extrusion-vertical-gradient": true,
						}}
					/>
					<Layer
						id="booth-label-layer"
						type="symbol"
						layout={{
							"text-field": ["get", "label"],
							"text-font": ["Noto Sans Regular"],
							"text-size": [
								"interpolate",
								["linear"],
								["zoom"],
								19, 10,
								22, 16
							],
							"text-anchor": "center",
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
								18.5, 0,
								19, 1
							]
						}}
						minzoom={19}
					/>
				</Source>
			)}
			{wallCollection && (
				<Source id="wall" type="geojson" data={wallCollection}>
					<Layer
						id="wall-layer1"
						type="fill-extrusion"
						paint={{
							"fill-extrusion-color": "#94a3b8",
							"fill-extrusion-height": 1,
							"fill-extrusion-base": 0,
							"fill-extrusion-opacity": 0.8,
							"fill-extrusion-vertical-gradient": true,
						}}
					/>
					<Layer
						id="wall-layer2"
						type="fill-extrusion"
						paint={{
							"fill-extrusion-color": "#64748b",
							"fill-extrusion-height": 1,
							"fill-extrusion-base": 1,
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
					className="tailwind-popup"
					closeButton={false}
					closeOnMove={true}
					focusAfterOpen={false}
					anchor="top-right"
					longitude={popupCoord.lng}
					latitude={popupCoord.lat}
					onClose={() => setPopupCoord(undefined)}
				>
					<div className="flex flex-col gap-1 py-1 rounded-xl border shadow-black/25 shadow-[2px_2px_8px] backdrop-blur-lg border-white/90 bg-gray-300/10">
						<button
							className="py-1 px-4 mx-1 font-medium rounded-lg border-2 hover:opacity-60 bg-slate-300 border-white/60"
							type="button"
							onClick={() => {
								handleBoothSelect(
									{ lng: popupCoord.lng, lat: popupCoord.lat },
									"origin",
								);
								setPopupCoord(undefined);
							}}
						>
							Im here
						</button>
						<button
							className="py-1 px-4 mx-1 font-medium rounded-lg border-2 hover:opacity-60 bg-red-500/50 border-white/60"
							type="button"
							onClick={() => {
								handleBoothSelect(
									{ lng: popupCoord.lng, lat: popupCoord.lat },
									"dest",
								);
								setPopupCoord(undefined);
							}}
						>
							Get here
						</button>
					</div>
				</Popup>
			)}
			<Marker
				onDragEnd={(e) => handleBoothSelect(e.lngLat, "origin")}
				color="green"
				longitude={origin.lng}
				latitude={origin.lat}
				anchor="bottom"
				draggable={true}
			>
				<img className="h-10" src="./start-512.png" alt="humanoid" />
			</Marker>
			<Marker
				onDragEnd={(e) => handleBoothSelect(e.lngLat, "dest")}
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
	const [focusedSearchbox, setFocusedSearchbox] = useState<
		"origin" | "dest" | null
	>(null);
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
					className="py-3 px-4 pl-10 w-full placeholder-gray-500 text-gray-700 bg-gray-50 rounded-lg border border-gray-200 transition-all duration-200 focus:bg-white focus:border-amber-500 focus:ring-2 focus:outline-none placeholder:font-medium focus:ring-amber-500/50"
					readOnly
					value={destSearchTerm?.toUpperCase() || ""}
					id="boothsSearchDummy"
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
				<div className="flex overflow-hidden flex-col bg-white rounded-lg border border-gray-200 shadow-lg">
					{/* origin searchbox */}
					<div className="p-4 border-b border-gray-100">
						<input
							type="search"
							className="py-2.5 px-4 w-full placeholder-gray-400 text-gray-700 bg-gray-50 rounded-lg border border-gray-200 transition-all duration-200 focus:bg-white focus:border-amber-500 focus:ring-2 focus:outline-none focus:ring-amber-500/50"
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
					<div className="p-4 border-b border-gray-100">
						<input
							type="search"
							className="py-2.5 px-4 w-full placeholder-gray-400 text-gray-700 bg-gray-50 rounded-lg border border-gray-200 transition-all duration-200 focus:bg-white focus:border-amber-500 focus:ring-2 focus:outline-none focus:ring-amber-500/50"
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

					<ul className="overflow-y-auto divide-y divide-gray-100 max-h-[60vh] scroll-smooth">
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

export default App;
