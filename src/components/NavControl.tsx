import type { ControlPosition, NavigationControlOptions } from "maplibre-gl";
import { useControl } from "react-map-gl/maplibre";

export type NavControlWithFitBoundsProps = NavigationControlOptions & {
  position?: ControlPosition;
};

export default function NavControlWithFitBounds(
  props: NavControlWithFitBoundsProps,
) {
  useControl(
    ({ mapLib }) => {
      const nav = new mapLib.NavigationControl(props);

      return {
        onAdd: (map) => {
          const container = nav.onAdd(map);
          container.style.marginBottom =
            "calc(2rem + env(safe-area-inset-bottom))";
          const compassBtn = container.getElementsByClassName(
            "maplibregl-ctrl-compass",
          )[0] as HTMLButtonElement;

          compassBtn.onclick = () => {
            map.fitBounds([
              [-79.36003227, 43.81250021],
              [-79.3585528, 43.813410058],
            ]);
          };
          return container;
        },
        onRemove: () => nav.onRemove(),
      };
    },
    { position: props.position },
  );

  return null;
}
