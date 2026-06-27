import { useEffect, useRef, useState } from "react";
import type { Booth, Doors, HandleBoothSelect, PathInputs } from "../types";
import BoothList from "./BoothList";
import { SearchInput } from "./SearchInput";

export interface SearchBoxProps {
  onBoothSelect: HandleBoothSelect;
  doors: Doors;
}

export default function SearchBox({ onBoothSelect, doors }: SearchBoxProps) {
  const [filteredBooths, setFilteredBooths] = useState<Booth[]>();
  const [originSearchTerm, setOriginSearchTerm] = useState<string>("");
  const [destSearchTerm, setDestSearchTerm] = useState<string>("");
  const [focusedSearchbox, setFocusedSearchbox] = useState<PathInputs>();
  const originSearchboxRef = useRef<HTMLInputElement | null>(null);
  const destSearchboxRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const handleBackNavigation = () => {
      setFocusedSearchbox(undefined);
      setFilteredBooths([]);
    };
    addEventListener("popstate", handleBackNavigation);
    return () => removeEventListener("popstate", handleBackNavigation);
  }, []);

  const filterBooths = (searchTerm: string, booths: Booth[]) => {
    // don't filter the booths before initial search
    if (searchTerm === "") setFilteredBooths(booths);

    const timeoutId = setTimeout(() => {
      const filteredBooths = doors.features.filter((booth) =>
        booth.properties?.label?.toLowerCase().includes(searchTerm),
      );
      setFilteredBooths(filteredBooths);
    }, 100);
    return () => clearTimeout(timeoutId);
  };

  const onBoothClick = (booth: Booth) => {
    const label = booth.properties?.label ?? "NO-Number";
    const coords = {
      lng: booth.geometry.coordinates[0],
      lat: booth.geometry.coordinates[1],
    };

    // set path argument
    if (focusedSearchbox) onBoothSelect(coords, focusedSearchbox);
    let newOrigin = originSearchTerm;
    let newDest = destSearchTerm;

    // set orign or dest search term
    if (focusedSearchbox === "origin") {
      setOriginSearchTerm(label.toUpperCase());
      newOrigin = label;
    } else if (focusedSearchbox === "dest") {
      setDestSearchTerm(label.toUpperCase());
      newDest = label;
    }

    // request path
    const requestPath = newOrigin && newDest;
    if (requestPath) {
      if (history.state?.collapseSearchbox) history.back();
    }
    // request path argument
    else {
      if (focusedSearchbox === "origin") {
        destSearchboxRef.current?.focus();
        setFocusedSearchbox("dest");
      } else {
        originSearchboxRef.current?.focus();
        setFocusedSearchbox("origin");
      }
    }
  };

  const handleInputFocus = (which: PathInputs, searchTerm: string) => {
    if (focusedSearchbox !== which) {
      if (focusedSearchbox === undefined) {
        if (!history.state?.collapseSearchbox) {
          history.pushState({ collapseSearchbox: true }, "", "");
        }
      }
      setFocusedSearchbox(which);
      filterBooths(searchTerm, doors.features);
    }
  };

  const handleInputChange = (which: PathInputs, searchTerm: string) => {
    if (which === "origin") setOriginSearchTerm(searchTerm);
    else if (which === "dest") setDestSearchTerm(searchTerm);
    filterBooths(searchTerm, doors.features);
  };

  return (
    <div className="flex overflow-hidden flex-col bg-white rounded-lg border border-gray-200 shadow-lg">
      {/* origin searchbox */}
      {focusedSearchbox && (
        <SearchInput
          onInputFocus={handleInputFocus}
          onInputChange={handleInputChange}
          inputName={"origin"}
          value={originSearchTerm}
          ref={originSearchboxRef}
        />
      )}
      {/* dest searchbox */}
      <SearchInput
        onInputFocus={handleInputFocus}
        onInputChange={handleInputChange}
        inputName={"dest"}
        value={destSearchTerm}
        ref={destSearchboxRef}
      />
      <BoothList onBoothClick={onBoothClick} booths={filteredBooths} />
    </div>
  );
}
