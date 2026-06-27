import type { Booth } from "../types";

interface BoothListProps {
  booths?: Booth[];
  onBoothClick: (coords: Booth) => void;
}

export default function BoothList({
  booths,
  onBoothClick: onBoothSelect,
}: BoothListProps) {
  return (
    <ul className="overflow-y-auto divide-y divide-gray-100 max-h-[60vh] scroll-smooth">
      {booths?.map((booth) => {
        if (!booth.properties?.label) return null;
        return (
          <li
            className="transition-colors duration-200"
            key={booth.properties.id}
          >
            <button
              className={
                "w-full px-4 py-3 text-left transition-all duration-200 hover:bg-amber-50 font-medium"
              }
              type="button"
              onClick={() => {
                onBoothSelect(booth);
              }}
            >
              {booth.properties.label.toUpperCase()}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
