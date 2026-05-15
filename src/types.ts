import type { FeatureCollection, Point } from "geojson";

export type MyCoord = { lng: number; lat: number };
export type Overlay = "popup" | "searchbox" | null;
export type DoorCollection = FeatureCollection<Point>;

export type HandleBoothSelect = (
	coords: MyCoord,
	which: "origin" | "dest",
) => void;

export type HandleActiveOverlay = (overlay: Overlay, coords?: MyCoord) => void;
