import "./App.css";
import { Layer, Map, Source, NavigationControl, MarkerDragEvent, Marker } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useState } from "react";
import { buffer } from "@turf/turf";
import PathFinder, { pathToGeoJSON } from "geojson-path-finder";

function App() {

  const [floorFeatureCollection, setFloorFeatureCollection] = useState<GeoJSON.FeatureCollection | null>(null)
  const [wallFeatureCollection, setWallFeatureCollection] = useState<GeoJSON.FeatureCollection | null>(null)
  const [walkwayCollection, setWalkwayCollection] = useState<GeoJSON.FeatureCollection | null>(null)
  const [start, setStart] = useState({ lng: -79.35988895104677, lat: 43.812871320851855 })
  const [finish, setFinish] = useState({ lng: -79.35984380982431, lat: 43.81274916336028 })
  const [path, setPath] = useState(null)

  useEffect(() => {
    if (!walkwayCollection) return

    const startPoint = {
      type: 'Feature',
      id: 1,
      geometry: {
        type: "Point",
        coordinates: [start.lng, start.lat]
        // coordinates: [-79.36000124428645, 43.81296449029094],
      },
      properties: {}
    }

    const finishPoint = {
      type: 'Feature',
      id: 2,
      geometry: {
        type: "Point",
        coordinates: [finish.lng, finish.lat]
        // coordinates: [-79.35228909925472, 43.81319535869511]
      },
      properties: {}
    }

    console.log(walkwayCollection)


    const pathFinder = new PathFinder(walkwayCollection)
    var path = pathFinder.findPath(startPoint, finishPoint)
    console.log(path)
    setPath(pathToGeoJSON(path))

  }, [start, finish])


  function handleDragEnd(e: MarkerDragEvent, which: string) {
    if (which === 'start') {
      setStart(e.lngLat)
      console.log('start', e.lngLat)
    }
    if (which === 'finish') {
      setFinish(e.lngLat)
      console.log('finish', e.lngLat)
    }
  }

  useEffect(() => {
    async function processFeatures() {
      const response = await fetch('/floorplan.geojson')
      const featureCollection = await response.json()
      const response_walkways = await fetch('/walkways.geojson')
      const walkwayCollection = await response_walkways.json()
      setWalkwayCollection(walkwayCollection)


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

        // Buffer the line to create a polygon with actual width
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

      {floorFeatureCollection && (
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
            }} />
        </Source>
      )}
      {wallFeatureCollection && (
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
            }} />
        </Source>
      )}
      {walkwayCollection && (
        <Source id='walkways' type='geojson' data={walkwayCollection}>
          <Layer
            id='walkway-layer'
            type='line'
            paint={{
              "line-width": 2,
              "line-color": 'red'
            }} />
        </Source>
      )}
      {path && (
        <Source id='path' type='geojson' data={path}>
          <Layer
            id='path-layer'
            type='line'
            paint={{ 'line-color': 'green', 'line-width': 4 }} />
        </Source>
      )
      }
      <Marker onDragEnd={(e) => handleDragEnd(e, 'start')} color="red" longitude={start.lng} latitude={start.lat} anchor="bottom" draggable={true} >
      </Marker>
      <Marker onDragEnd={(e) => handleDragEnd(e, 'finish')} color="green" longitude={finish.lng} latitude={finish.lat} anchor="bottom" draggable={true} >
      </Marker>
      <NavigationControl />
    </Map >
  );
}

export default App;
