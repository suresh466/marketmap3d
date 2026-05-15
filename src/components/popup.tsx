import type { LngLat } from "react-map-gl/maplibre";
import { Popup } from "react-map-gl/maplibre";
import type { HandleBoothSelect } from "../types";

interface PoiPopupProps {
  popupCoord: LngLat;
  onBoothSelect: HandleBoothSelect;
  onClose: () => void;
}

export default function PoiPopup({
  popupCoord,
  onBoothSelect,
  onClose,
}: PoiPopupProps) {
  return (
    <Popup
      className="tailwind-popup"
      closeButton={false}
      closeOnMove={true}
      focusAfterOpen={false}
      anchor="top-right"
      longitude={popupCoord.lng}
      latitude={popupCoord.lat}
      onClose={() => onClose()}
    >
      <div className="flex flex-col gap-1 py-1 rounded-xl border shadow-black/25 shadow-[2px_2px_8px] backdrop-blur-lg border-white/90 bg-gray-300/10">
        <button
          className="py-1 px-4 mx-1 font-medium rounded-lg border-2 hover:opacity-60 bg-slate-300 border-white/60"
          type="button"
          onClick={() => {
            onBoothSelect(
              { lng: popupCoord.lng, lat: popupCoord.lat },
              "origin",
            );
            onClose();
          }}
        >
          Im here
        </button>
        <button
          className="py-1 px-4 mx-1 font-medium rounded-lg border-2 hover:opacity-60 bg-red-500/50 border-white/60"
          type="button"
          onClick={() => {
            onBoothSelect({ lng: popupCoord.lng, lat: popupCoord.lat }, "dest");
            onClose();
          }}
        >
          Get here
        </button>
      </div>
    </Popup>
  );
}
