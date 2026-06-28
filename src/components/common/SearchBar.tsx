"use client";

import { Search } from "lucide-react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  inputId?: string;
  ariaLabel?: string;
  fluid?: boolean;
}

export function SearchBar({
  value,
  onChange,
  placeholder = "Search...",
  inputId,
  ariaLabel,
  fluid = false,
}: SearchBarProps) {
  return (
    <label
      className="search-box"
      style={fluid ? undefined : { width: 360 }}
    >
      <span>
        <Search aria-hidden="true" size={16} />
      </span>
      <input
        id={inputId}
        type="search"
        aria-label={ariaLabel ?? placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
