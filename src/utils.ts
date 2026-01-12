// This is the transformation matrix from the word document (built-in georeferencer)
// const geoTransform = {
// 	topLeftX: -8834328.4108089,
// 	xResolution: 0.06391368004045202,
// 	xRotation: 0.0,
// 	topLeftY: 5436610.835535929,
// 	yRotation: 0.0,
// 	yResolution: -0.06391368004045202,
// };

// This is the transformation matrix from the word document (freehand georeferencer)
// const geoTransform = {
// 	topLeftX: -8834329.7077757436782,
// 	xResolution: 0.0631781431308,
// 	xRotation: 0.0,
// 	topLeftY: 5436609.9501531161368,
// 	yRotation: 0.0,
// 	yResolution: -0.0631781431312,
// };

// This is the transformation matrix from the word document with rotation (freehand georeferencer)
const geoTransform = {
	topLeftX: -8834328.9443329293281, // xorigin (value 5)
	xResolution: 0.0631781431308,
	// xResolution: 0.0602001095703, // xscale (value 1) (the scale is messed up for some reason)
	xRotation: 0.0191683222339, // xskew (value 3)
	topLeftY: 5436567.1176332803443, // yorigin (value 6)
	yRotation: 0.0191683222339, // yskew (value 2)
	yResolution: -0.0631781431312,
	// yResolution: -0.0602001095703, // yscale (value 4) (the scale is messed up for some reason)
};

/**
 * Converts abstract (image/pixel) coordinates to geographic coordinates
 * @param x - X coordinate in abstract space (pixels/units in your floor plan)
 * @param y - Y coordinate in abstract space
 * @returns [latitude, longitude] in WGS84
 */
export const abstractToGeo = (x: number, y: number): [number, number] => {
	// Convert pixel coordinates to Web Mercator (EPSG:3857)
	const mercatorX =
		geoTransform.topLeftX +
		x * geoTransform.xResolution +
		y * geoTransform.xRotation;

	const mercatorY =
		geoTransform.topLeftY +
		x * geoTransform.yRotation +
		y * geoTransform.yResolution;

	// Convert Web Mercator to WGS84 (lat/long)
	const lng = (mercatorX / 20037508.34) * 180;
	let lat = (mercatorY / 20037508.34) * 180;
	lat =
		(180 / Math.PI) *
		(2 * Math.atan(Math.exp((lat * Math.PI) / 180)) - Math.PI / 2);

	return [lat, lng];
};

/**
 * Converts geographic coordinates to abstract coordinates
 * @param lat - Latitude in WGS84
 * @param lng - Longitude in WGS84
 * @returns {x, y} in abstract space
 */
export const geoToAbstract = (
	lat: number,
	lng: number,
): { x: number; y: number } => {
	// Convert WGS84 to Web Mercator (EPSG:3857)
	const mercatorX = (lng * 20037508.34) / 180;
	let mercatorY =
		Math.log(Math.tan(((90 + lat) * Math.PI) / 360)) / (Math.PI / 180);
	mercatorY = (mercatorY * 20037508.34) / 180;

	// Convert Web Mercator to pixel coordinates
	// When there's no rotation, the inverse is simpler
	const x = (mercatorX - geoTransform.topLeftX) / geoTransform.xResolution;
	const y = (mercatorY - geoTransform.topLeftY) / geoTransform.yResolution;

	return { x, y };
};

/**
 * Validates if abstract coordinates are within the bounds of our floor plan
 */
export const isWithinBounds = (x: number, y: number): boolean => {
	// Define the bounds of your floor plan in abstract coordinates
	// Replace these with your actual floor plan dimensions
	const bounds = {
		minX: 0,
		maxX: 2220, // Replace with actual width of your floor plan
		minY: 0,
		maxY: 1680, // Replace with actual height of your floor plan
	};

	return (
		x >= bounds.minX && x <= bounds.maxX && y >= bounds.minY && y <= bounds.maxY
	);
};

// Test with a known point from your control points
const testAbstractPoint = { x: 1858.8766739656305, y: 1558.81375604823 };
const testAbstractPoint2 = { x: 180.54717187500637, y: 955.4336944058066 };
const geoPoint = abstractToGeo(testAbstractPoint.x, testAbstractPoint.y);
const geoPoint2 = abstractToGeo(testAbstractPoint2.x, testAbstractPoint2.y);
console.log("Geographic coordinates:", geoPoint);
console.log("Geographic coordinates2:", geoPoint2);

// Test round-trip conversion
const backToAbstract = geoToAbstract(geoPoint[0], geoPoint[1]);
const backToAbstract2 = geoToAbstract(geoPoint2[0], geoPoint2[1]);
console.log("Back to abstract:", backToAbstract);
console.log("Back to abstract2:", backToAbstract2);
console.log("Difference:", {
	dx: testAbstractPoint.x - backToAbstract.x,
	dy: testAbstractPoint.y - backToAbstract.y,
});

console.log("Difference2:", {
	dx: testAbstractPoint2.x - backToAbstract2.x,
	dy: testAbstractPoint2.y - backToAbstract2.y,
});

/**
 * Converts GraphML floor plan to GeoJSON
 * @param graphmlXml - The XML content of the GraphML file as string
 * @returns A GeoJSON FeatureCollection
 */
export const convertGraphmlToGeoJson = (
	graphmlXml: string,
): GeoJSON.FeatureCollection => {
	// Parse the XML
	const parser = new DOMParser();
	const xmlDoc = parser.parseFromString(graphmlXml, "text/xml");

	// Initialize the GeoJSON structure
	const geojson: GeoJSON.FeatureCollection = {
		type: "FeatureCollection",
		features: [],
	};

	// Process each node (room or other feature)
	const nodes = xmlDoc.getElementsByTagName("node");
	const roomCenters: { [key: string]: [number, number] } = {};

	for (let i = 0; i < nodes.length; i++) {
		const node = nodes[i];
		const nodeId = node.getAttribute("id");

		if (!nodeId) continue;

		// Find ShapeNode and Geometry
		const shapeNodes = node.getElementsByTagName("y:ShapeNode");
		if (shapeNodes.length === 0) continue;

		const geometryElements = shapeNodes[0].getElementsByTagName("y:Geometry");
		if (geometryElements.length === 0) continue;

		// Extract geometry attributes
		const geometry = geometryElements[0];
		const x = parseFloat(geometry.getAttribute("x") || "0");
		const y = parseFloat(geometry.getAttribute("y") || "0");
		const width = parseFloat(geometry.getAttribute("width") || "0");
		const height = parseFloat(geometry.getAttribute("height") || "0");

		// Calculate the center for pathfinding
		const centerX = x + width / 2;
		const centerY = y + height / 2;
		roomCenters[nodeId] = [centerX, centerY];

		// Create polygon coordinates
		const polygonCoords = [
			[x, y],
			[x + width, y],
			[x + width, y + height],
			[x, y + height],
			[x, y], // Close the polygon
		];

		// Convert to geographic coordinates
		const geoCoords = polygonCoords.map((coord) => {
			const [lat, lng] = abstractToGeo(coord[0], coord[1]);
			return [lng, lat]; // GeoJSON uses [longitude, latitude]
		});

		// Extract properties
		const properties: { [key: string]: any } = {
			id: nodeId,
			type: "room",
		};

		// Add any data attributes
		const dataElements = node.getElementsByTagName("data");
		for (let j = 0; j < dataElements.length; j++) {
			const data = dataElements[j];
			const key = data.getAttribute("key");
			if (key && data.textContent) {
				properties[key] = data.textContent.trim();
			}
		}

		// Create the GeoJSON feature
		const feature: GeoJSON.Feature = {
			type: "Feature",
			properties: properties,
			geometry: {
				type: "Polygon",
				coordinates: [geoCoords],
			},
		};

		geojson.features.push(feature);
	}

	// Process edges for pathfinding connections
	const edges = xmlDoc.getElementsByTagName("edge");

	for (let i = 0; i < edges.length; i++) {
		const edge = edges[i];
		const edgeId = edge.getAttribute("id");
		const source = edge.getAttribute("source");
		const target = edge.getAttribute("target");

		if (!edgeId || !source || !target) continue;

		// Only process edges between known rooms
		if (roomCenters[source] && roomCenters[target]) {
			// Get the centers of the connected rooms
			const sourceCoord = roomCenters[source];
			const targetCoord = roomCenters[target];

			// Convert to geographic coordinates
			const [sourceLat, sourceLng] = abstractToGeo(
				sourceCoord[0],
				sourceCoord[1],
			);
			const [targetLat, targetLng] = abstractToGeo(
				targetCoord[0],
				targetCoord[1],
			);

			// Create a connection feature
			const feature: GeoJSON.Feature = {
				type: "Feature",
				properties: {
					id: edgeId,
					type: "connection",
					source: source,
					target: target,
				},
				geometry: {
					type: "LineString",
					coordinates: [
						[sourceLng, sourceLat],
						[targetLng, targetLat],
					],
				},
			};

			geojson.features.push(feature);
		}
	}

	return geojson;
};

/**
 * Loads a GraphML file and converts it to GeoJSON
 * @param fileUrl - URL to the GraphML file
 * @returns Promise that resolves to a GeoJSON FeatureCollection
 */
export const loadGraphmlAsGeoJson = async (
	fileUrl: string,
): Promise<GeoJSON.FeatureCollection> => {
	try {
		// Fetch the GraphML file
		const response = await fetch(fileUrl);
		if (!response.ok) {
			throw new Error(
				`Failed to load GraphML: ${response.status} ${response.statusText}`,
			);
		}

		// Get the XML content
		const graphmlXml = await response.text();

		// Convert to GeoJSON
		const geojson = convertGraphmlToGeoJson(graphmlXml);

		// Optionally, you can save the GeoJSON to a file or use it directly
		return geojson;
	} catch (error) {
		console.error("Error loading or converting GraphML:", error);
		throw error;
	}
};
