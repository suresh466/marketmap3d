import { useState } from "react";
import "./App.css";

import L from "leaflet";
import {
	MapContainer,
	Marker,
	Popup,
	TileLayer,
	useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

function App() {
	const [position, setPosition] = useState<L.LatLng | null>(null);
	const [mapType, setMapType] = useState<"normal" | "satellite">("normal");

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
			</MapContainer>
		</div>
	);
}

export default App;
