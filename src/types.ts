import type {
	Feature,
	FeatureCollection,
	LineString,
	MultiPolygon,
	Point,
	Polygon,
} from "geojson";

export type MyCoord = { lng: number; lat: number };
export type Doors = FeatureCollection<Point>;
export type Floorplan = FeatureCollection<Polygon | MultiPolygon>;
export type Entrances = FeatureCollection<Polygon | MultiPolygon>;
export type Walls = FeatureCollection<Polygon | MultiPolygon>;
// walkways must be type LineString
export type Walkways = FeatureCollection<LineString>;
export type Booth = Feature<Point>;
export type PathInputs = "origin" | "dest";

export type HandleBoothSelect = (coords: MyCoord, which: PathInputs) => void;

export type HandleMapClick = (coords?: MyCoord) => void;
