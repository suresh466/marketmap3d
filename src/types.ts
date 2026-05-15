// import type { LngLat } from "react-map-gl/maplibre";

export type HandleBoothSelect = (
	// coords: LngLat,
	// which: "origin" | "dest",
	coords: { lng: number; lat: number },
	which: string,
) => void;
