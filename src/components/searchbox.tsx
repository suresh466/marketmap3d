import type { Feature, Point } from "geojson";
import { useEffect, useRef, useState } from "react";
import type {
  DoorCollection,
  HandleActiveOverlay,
  HandleBoothSelect,
} from "../types";

export interface SearchBoxProps {
  onBoothSelect: HandleBoothSelect;
  doors: DoorCollection;
  onInputActive: HandleActiveOverlay;
}

export default function SearchBox({
  onBoothSelect,
  doors,
  onInputActive,
}: SearchBoxProps) {
  const [filteredBooths, setFilteredBooths] = useState<Feature<Point>[] | null>(
    doors.features,
  );
  const [originSearchTerm, setOriginSearchTerm] = useState<string | null>(null);
  const [destSearchTerm, setDestSearchTerm] = useState<string | null>(null);
  const [focusedSearchbox, setFocusedSearchbox] = useState<
    "origin" | "dest" | null
  >(null);
  const originSearchboxRef = useRef<HTMLInputElement | null>(null);
  const destSearchboxRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const handleBackNavigation = () => {
      setFocusedSearchbox(null);
    };
    addEventListener("popstate", handleBackNavigation);
    return () => removeEventListener("popstate", handleBackNavigation);
  }, []);

  useEffect(() => {
    if (!focusedSearchbox) return;

    if (focusedSearchbox === "origin") {
      originSearchboxRef.current?.focus();
    }
    if (focusedSearchbox === "dest") {
      destSearchboxRef.current?.focus();
    }
  }, [focusedSearchbox]);

  useEffect(() => {
    // don't filter the booths before initial search
    if (originSearchTerm === null && destSearchTerm === null) {
      return;
    }
    const timeoutId = setTimeout(() => {
      const searchTerm =
        focusedSearchbox === "origin"
          ? originSearchTerm || ""
          : destSearchTerm || "";

      const filteredBooths = doors.features.filter((booth) =>
        booth.properties?.label?.toLowerCase().includes(searchTerm),
      );
      setFilteredBooths(filteredBooths);
    }, 100);
    return () => clearTimeout(timeoutId);
  }, [focusedSearchbox, originSearchTerm, destSearchTerm, doors]);

  const isSelected = (boothLabel: string) => {
    const isSelected =
      (focusedSearchbox === "origin" &&
        originSearchTerm === boothLabel.toLowerCase()) ||
      (focusedSearchbox === "dest" &&
        destSearchTerm === boothLabel.toLowerCase());
    return isSelected;
  };

  return (
    <>
      {focusedSearchbox === null ? (
        // dummy searchbox
        <input
          className="py-3 px-4 pl-10 w-full placeholder-gray-500 text-gray-700 bg-gray-50 rounded-lg border border-gray-200 transition-all duration-200 focus:bg-white focus:border-amber-500 focus:ring-2 focus:outline-none placeholder:font-medium focus:ring-amber-500/50"
          readOnly
          value={destSearchTerm?.toUpperCase() || ""}
          id="boothsSearchDummy"
          placeholder="Search For a Booth"
          onFocus={() => {
            onInputActive({ lng: 0, lat: 0 }, "searchbox");
            if (originSearchTerm === null || originSearchTerm === "") {
              setFocusedSearchbox("origin");
            } else {
              setFocusedSearchbox("dest");
            }
          }}
        />
      ) : (
        <div className="flex overflow-hidden flex-col bg-white rounded-lg border border-gray-200 shadow-lg">
          {/* origin searchbox */}
          <div className="p-4 border-b border-gray-100">
            <input
              type="search"
              className="py-2.5 px-4 w-full placeholder-gray-400 text-gray-700 bg-gray-50 rounded-lg border border-gray-200 transition-all duration-200 focus:bg-white focus:border-amber-500 focus:ring-2 focus:outline-none focus:ring-amber-500/50"
              value={originSearchTerm || ""}
              ref={originSearchboxRef}
              id="boothsSearch"
              placeholder="Search Origin Booth"
              onChange={(e) =>
                setOriginSearchTerm(e.target.value.toLowerCase())
              }
              onFocus={() => {
                if (focusedSearchbox !== "origin") {
                  setFocusedSearchbox("origin");
                }
              }}
            />
          </div>

          {/* dest searchbox */}
          <div className="p-4 border-b border-gray-100">
            <input
              type="search"
              className="py-2.5 px-4 w-full placeholder-gray-400 text-gray-700 bg-gray-50 rounded-lg border border-gray-200 transition-all duration-200 focus:bg-white focus:border-amber-500 focus:ring-2 focus:outline-none focus:ring-amber-500/50"
              value={destSearchTerm || ""}
              ref={destSearchboxRef}
              id="destBoothsSearch"
              placeholder="Search Destination Booth"
              onChange={(e) => setDestSearchTerm(e.target.value.toLowerCase())}
              onFocus={() => {
                if (focusedSearchbox !== "dest") setFocusedSearchbox("dest");
              }}
            />
          </div>

          <ul className="overflow-y-auto divide-y divide-gray-100 max-h-[60vh] scroll-smooth">
            {filteredBooths?.map((booth) => {
              if (!booth.properties?.label) return null;
              return (
                <li
                  className="transition-colors duration-200"
                  key={booth.properties.id}
                >
                  <button
                    className={`w-full px-4 py-3 text-left transition-all duration-200 hover:bg-amber-50 font-medium ${isSelected(booth.properties.label) ? "bg-amber-50 text-amber-900" : "bg-white text-gray-900"}`}
                    type="button"
                    onClick={() => {
                      const coords = {
                        lng: booth.geometry.coordinates[0],
                        lat: booth.geometry.coordinates[1],
                      };
                      onBoothSelect(coords, focusedSearchbox);

                      if (focusedSearchbox === "origin") {
                        setOriginSearchTerm(
                          booth.properties?.label || "NO-Number",
                        );
                        if (destSearchTerm) {
                          // event listener sets focusedSearchbox to null
                          history.back();
                        } else setFocusedSearchbox("dest");
                      } else {
                        setDestSearchTerm(
                          booth.properties?.label || "No-Number",
                        );
                        if (originSearchTerm) {
                          history.back();
                        } else setFocusedSearchbox("origin");
                      }
                    }}
                  >
                    {booth.properties.label.toUpperCase()}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </>
  );
}
