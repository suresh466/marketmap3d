import { useEffect, useState } from "react";
import "./App.css";

import "leaflet/dist/leaflet.css";
import { loadGraphmlAsGeoJson } from "./utils";

function App() {

  // useEffect(() => {
  //   loadGraphmlAsGeoJson("../fleamarket_floormap_scaled.graphml")
  //     .then((data) => {
  //       // Save GeoJSON output as a file
  //       const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  //       const url = URL.createObjectURL(blob);
  //       const link = document.createElement("a");
  //       link.href = url;
  //       link.download = "floorPlanData.geojson";
  //       // link.click();
  //       URL.revokeObjectURL(url);
  //     })
  //     .catch((error) => {
  //       console.error("Error loading floor plan:", error);
  //     });
  // }, []);


  return (
    <p>hey</p>
  );
}

export default App;
