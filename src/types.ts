import type { FeatureCollection, Point } from "geojson";

export type MyCoord = { lng: number; lat: number };
export type ActiveOverlay = "popup" | "searchbox" | null;
export type DoorCollection = FeatureCollection<Point>;

export type HandleBoothSelect = (
	coords: MyCoord,
	which: "origin" | "dest",
) => void;
