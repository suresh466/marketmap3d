import { useEffect, useState } from "react";
import "./App.css";

import L from "leaflet";
import {
	GeoJSON,
	MapContainer,
	Marker,
	Popup,
	TileLayer,
	useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { loadGraphmlAsGeoJson } from "./utils";

function App() {
	const [position, setPosition] = useState<L.LatLng | null>(null);
	const [mapType, setMapType] = useState<"normal" | "satellite">("normal");
	const [floorPlanData, setFloorPlanData] =
		useState<GeoJSON.FeatureCollection | null>(null);

	// Map layer URLs
	const mapLayers = {
		normal: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
		satellite:
			"https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
	};

	// Map attribution
	const mapAttributions = {
		normal:
			'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
		satellite:
			"Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
	};

	// // Load floor plan GeoJSON
	// useEffect(() => {
	// 	fetch("./floorplan.geojson")
	// 		.then((response) => {
	// 			if (!response.ok) {
	// 				throw new Error(`HTTP error! Status: ${response.status}`);
	// 			}
	// 			return response.json();
	// 		})
	// 		.then((data) => {
	// 			setFloorPlanData(data);
	// 		})
	// 		.catch((error) => {
	// 			console.error("Error loading floor plan:", error);
	// 		});
	// }, []);

	// Load floor plan from GraphML
	useEffect(() => {
		loadGraphmlAsGeoJson("../fleamarket_floormap_scaled.graphml")
			.then((data) => {
				setFloorPlanData(data);
			})
			.catch((error) => {
				console.error("Error loading floor plan:", error);
			});
	}, []);

	// Component to handle location finding
	function LocationFinder() {
		useMapEvents({
			locationfound(e) {
				setPosition(e.latlng);
			},
		});

		return null;
	}

	// Function to get user location
	const handleGetLocation = () => {
		navigator.geolocation.getCurrentPosition(
			(position) => {
				setPosition(
					L.latLng(position.coords.latitude, position.coords.longitude),
				);
			},
			(error) => {
				alert(`Error getting location: ${error.message}`);
			},
			{ enableHighAccuracy: true },
		);
	};

	// Function to toggle map type
	const toggleMapType = () => {
		setMapType((prev) => (prev === "normal" ? "satellite" : "normal"));
	};

	// Style function for floor plan features
	const floorPlanStyle = (feature: any) => {
		const featureType = feature.properties?.type || "default";

		switch (featureType) {
			case "room":
				return {
					color: "#3388ff",
					weight: 2,
					opacity: 0.8,
					fillColor: "#3388ff",
					fillOpacity: 0.2,
				};
			case "wall":
				return {
					color: "#000000",
					weight: 3,
					opacity: 0.9,
				};
			default:
				return {
					color: "#777777",
					weight: 1,
					opacity: 0.7,
				};
		}
	};

	// For floor plan feature popups
	const onEachFeature = (feature: any, layer: L.Layer) => {
		if (feature.properties) {
			const properties = feature.properties;
			let popupContent = `<div><strong>Type:</strong> ${properties.type || "Unknown"}</div>`;

			if (properties.id) {
				popupContent += `<div><strong>ID:</strong> ${properties.id}</div>`;
			}

			layer.bindPopup(popupContent);
		}
	};

	return (
		<div className="map-container">
			<div className="controls">
				<button type="button" onClick={handleGetLocation}>
					Show My Location
				</button>
				<button type="button" onClick={toggleMapType}>
					Switch to {mapType === "normal" ? "Satellite" : "Normal"} View
				</button>
			</div>

			<MapContainer
				center={[43.812912, -79.359857]}
				zoom={18}
				scrollWheelZoom={true}
			>
				<TileLayer
					attribution={mapAttributions[mapType]}
					url={mapLayers[mapType]}
					maxZoom={22}
					maxNativeZoom={18}
				/>
				<LocationFinder />

				{position && (
					<Marker position={position}>
						<Popup>Your location</Popup>
					</Marker>
				)}

				{floorPlanData && (
					<GeoJSON
						data={floorPlanData}
						style={floorPlanStyle}
						onEachFeature={onEachFeature}
					/>
				)}
			</MapContainer>
		</div>
	);
}

export default App;
