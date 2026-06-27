import type { Ref } from "react";
import type { PathInputs } from "../types";

interface SearchInputProps {
  value: string;
  onInputFocus: (which: PathInputs, searchTerm: string) => void;
  onInputChange: (which: PathInputs, value: string) => void;
  inputName: PathInputs;
  ref: Ref<HTMLInputElement | null>;
}

export const SearchInput = ({
  value,
  onInputFocus,
  inputName,
  onInputChange,
  ref,
}: SearchInputProps) => {
  return (
    <div className="p-4 border-b border-gray-100">
      <input
        type="search"
        className="py-2.5 px-4 w-full placeholder-gray-400 text-gray-700 bg-gray-50 rounded-lg border border-gray-200 transition-all duration-200 focus:bg-white focus:border-amber-500 focus:ring-2 focus:outline-none focus:ring-amber-500/50"
        ref={ref}
        value={value}
        id={`${inputName}boothsSearch`}
        placeholder={`Search ${inputName} Booth`}
        onChange={(e) => {
          const value = e.target.value.toLowerCase();
          onInputChange(inputName, value);
        }}
        onFocus={() => onInputFocus(inputName, value)}
      />
    </div>
  );
};
