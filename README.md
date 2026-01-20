# MarketMap3D

An interactive 3D indoor mapping and navigation system designed for complex spaces like flea markets. MarketMap3D provides real-time pathfinding, booth location search, and a rich visual interface to help users navigate large floor plans with ease.

## 🚀 Key Features

- **3D Visualization**: Renders floor plans, walls, and entrances in 3D using MapLibre GL's extrusion capabilities.
- **Intelligent Pathfinding**: Calculates the shortest walking routes between booths using `geojson-path-finder` and `Turf.js`.
- **Booth Search**: Rapidly locate specific vendors or booths to set as origin or destination.
- **Interactive Navigation**: Drag-and-drop start/end markers, clickable map elements, and intuitive popups.
- **Mobile-First Design**: Optimized controls and layout for navigation on mobile devices.

## 🛠️ Tech Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS v4
- **Mapping & Geospatial:** [MapLibre GL](https://maplibre.org/), [React Map GL](https://visgl.github.io/react-map-gl/), [Turf.js](https://turfjs.org/)
- **Build & Tooling:** Vite, Biome, ESLint
- **Infrastructure:** Docker, Docker Compose, Caddy Web Server

## 📦 Getting Started

### Using Docker (Recommended)

1. **Clone the repository**:

   ```bash
   git clone https://github.com/suresh466/marketmap3d.git && cd marketmap3d
   ```

2. **Start with Docker Compose**:

   ```bash
   docker compose --env-file env.dev up
   ```

   The application will be available at `http://localhost:5173` (or the configured port).

### Local Development

1. **Install dependencies**:

   ```bash
   npm install
   ```

2. **Start the development server**:

   ```bash
   npm run dev
   ```

   Open your browser and navigate to the URL shown in the terminal (usually `http://localhost:5173`).

## 🗺️ Data Structure

The application relies on GeoJSON data for rendering the map:
- `floorplan.geojson`: Defines the booth layouts and base structures.
- `walkway-connected-complete-single.geojson`: Defines the walkable paths for the routing engine.
- `entrance.geojson`: Defines entry/exit points.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.