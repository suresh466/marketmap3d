import type {
	FeatureCollection,
	LineString,
	MultiPolygon,
	Point,
	Polygon,
} from "geojson";

export type MyCoord = { lng: number; lat: number };
export type Overlay = "popup" | "searchbox" | null;
export type Doors = FeatureCollection<Point>;
export type Floorplan = FeatureCollection<Polygon | MultiPolygon>;
export type Entrances = FeatureCollection<Polygon | MultiPolygon>;
export type Walls = FeatureCollection<Polygon | MultiPolygon>;
// walkways must be type LineString
export type Walkways = FeatureCollection<LineString>;

export type HandleBoothSelect = (
	coords: MyCoord,
	which: "origin" | "dest",
) => void;

export type HandleActiveOverlay = (overlay: Overlay, coords?: MyCoord) => void;
