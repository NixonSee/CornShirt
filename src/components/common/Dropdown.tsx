"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

interface Option {
  value: string;
  label: string;
}

interface DropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
}

export function Dropdown({ value, onChange, options, placeholder = "Select..." }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selected = options.find((o) => o.value === value);
  const display = selected ? selected.label : placeholder;

  function handleSelect(opt: Option) {
    onChange(opt.value);
    setOpen(false);
  }

  return (
    <div ref={ref} className="dropdown-wrapper">
      <button
        type="button"
        className="dropdown-trigger"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
      >
        <span>{display}</span>
        <ChevronDown size={16} className={`dropdown-chevron${open ? " open" : ""}`} />
      </button>

      {open && (
        <ul className="dropdown-menu" role="listbox">
          {options.map((opt) => (
            <li
              key={opt.value}
              role="option"
              aria-selected={opt.value === value}
              className={`dropdown-item${opt.value === value ? " selected" : ""}`}
              onClick={() => handleSelect(opt)}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
