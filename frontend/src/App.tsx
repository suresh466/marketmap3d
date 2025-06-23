import "./App.css";
import { Layer, Map, Source, NavigationControl } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useState } from "react";
import { buffer } from "@turf/turf";

function App() {

  const [floorFeatureCollection, setFloorFeatureCollection] = useState<GeoJSON.FeatureCollection | null>(null)
  const [wallFeatureCollection, setWallFeatureCollection] = useState<GeoJSON.FeatureCollection | null>(null)

  useEffect(() => {
    async function processFeatures() {
      const response = await fetch('/floorplan.geojson')
      const featureCollection = await response.json()


      let floorFeatures = []
      let wallFeatures = []
      for (const feature of featureCollection.features) {
        let floorFeature = {
          ...feature,
          properties: {
            ...feature.properties,
            type: 'floor'
          }
        }
        floorFeature = buffer(feature, -0.0000015, { units: 'degrees' });
        floorFeatures.push(floorFeature)

        // Create a LineString from the polygon coordinates
        const perimeterLine = {
          ...feature,  // Copy all properties from original feature
          geometry: {
            coordinates: feature.geometry.coordinates[0],
            type: 'LineString'
          },
          properties: {
            ...feature.properties,
            type: 'wall'
          }
        };

        // Buffer the line to create a polygon "ribbon" with actual width
        let wallFeature = buffer(perimeterLine, 0.0000003, { units: 'degrees' });
        wallFeature ? wallFeatures.push(wallFeature) : console.log('wall not built, something went wrong!')

      }
      const floorFeatureCollection: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: floorFeatures }
      const wallFeatureCollection: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: wallFeatures }
      setFloorFeatureCollection(floorFeatureCollection)
      setWallFeatureCollection(wallFeatureCollection)

    }
    processFeatures()
  }, []);

  return (
    <Map
      initialViewState={{ longitude: -79.35949678711926, latitude: 43.813003152496364, zoom: 15.99, pitch: 60, bearing: 20, }}
      style={{ width: 900, height: 600 }}
      mapStyle={{
        "name": "marketmap",
        "version": 8,

        sources: {
          'raster-tiles': {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            minzoom: 0,
            maxzoom: 19
          }
        },
        layers: [
          {
            id: 'simple-tiles',
            type: 'raster',
            source: 'raster-tiles'
          }
        ]
      }}>

      {(floorFeatureCollection && wallFeatureCollection) && (
        <>
          <Source id="floor" type="geojson" data={floorFeatureCollection}>
            <Layer
              id="floor-extrusion"
              type="fill-extrusion"
              paint={{
                'fill-extrusion-color': '#f5f5dc', // Light beige
                // Set floor height
                'fill-extrusion-height': 1,
                // Start at base level
                'fill-extrusion-base': 0,
                // Add slight opacity
                'fill-extrusion-opacity': 0.9,
                'fill-extrusion-vertical-gradient': true
              }
              }
            />
          </Source>

          <Source id="wall" type="geojson" data={wallFeatureCollection}>
            <Layer
              id='wall-3d-extrusion'
              type="fill-extrusion"
              paint={{
                'fill-extrusion-color': '#dddddd', // Light gray for walls
                'fill-extrusion-height': 2, // Wall height (taller than floors)
                'fill-extrusion-base': 0, // Start from floor height
                'fill-extrusion-opacity': 1,
                'fill-extrusion-vertical-gradient': true
              }}
            />
          </Source>
        </>
      )}
      <NavigationControl />
    </Map>
  );
}

export default App;
