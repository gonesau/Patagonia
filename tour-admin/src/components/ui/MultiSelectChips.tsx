import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Check, ChevronDown, X } from "lucide-react";

export interface MultiSelectOption {
  id: string;
  label: string;
  sublabel?: string;
}

interface MultiSelectChipsProps {
  label: string;
  options: MultiSelectOption[];
  value: string[];
  placeholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  error?: string;
  onChange: (selectedIds: string[]) => void;
}

function normalizeForSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function MultiSelectChips({
  label,
  options,
  value,
  placeholder = "Buscar y seleccionar...",
  emptyMessage = "Sin resultados.",
  disabled = false,
  error,
  onChange,
}: MultiSelectChipsProps) {
  const fieldId = useId();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  const selectedOptions = useMemo(() => {
    const map = new Map(options.map((option) => [option.id, option]));
    return value.map((id) => map.get(id)).filter((option): option is MultiSelectOption => Boolean(option));
  }, [options, value]);

  const filteredOptions = useMemo(() => {
    const normalized = normalizeForSearch(searchTerm);
    if (!normalized) {
      return options;
    }
    return options.filter((option) => {
      const label = normalizeForSearch(option.label);
      const sublabel = option.sublabel ? normalizeForSearch(option.sublabel) : "";
      return label.includes(normalized) || sublabel.includes(normalized);
    });
  }, [options, searchTerm]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm("");
        setHighlightedIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const toggleOption = (optionId: string) => {
    if (value.includes(optionId)) {
      onChange(value.filter((id) => id !== optionId));
      return;
    }
    onChange([...value, optionId]);
  };

  const removeOption = (optionId: string) => {
    onChange(value.filter((id) => id !== optionId));
  };

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setIsOpen(true);
      setHighlightedIndex((current) => Math.min(current + 1, filteredOptions.length - 1));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightedIndex((current) => Math.max(current - 1, 0));
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const target = filteredOptions[highlightedIndex];
      if (target) {
        toggleOption(target.id);
      }
      return;
    }
    if (event.key === "Escape") {
      setIsOpen(false);
      setSearchTerm("");
      setHighlightedIndex(-1);
      return;
    }
    if (event.key === "Backspace" && !searchTerm && selectedOptions.length > 0) {
      removeOption(selectedOptions[selectedOptions.length - 1].id);
    }
  };

  const openDropdown = () => {
    if (disabled) {
      return;
    }
    setIsOpen(true);
    inputRef.current?.focus();
  };

  return (
    <div className="flex w-full flex-col gap-1 text-sm text-textDark">
      <span className="font-medium" id={`${fieldId}-label`}>
        {label}
      </span>
      <div className="relative" ref={containerRef}>
        <div
          aria-controls={`${fieldId}-listbox`}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-labelledby={`${fieldId}-label`}
          className={`flex min-h-[42px] w-full flex-wrap items-center gap-1 rounded-md border border-border bg-white px-2 py-1 focus-within:ring-2 focus-within:ring-primary ${
            disabled ? "cursor-not-allowed bg-slate-50" : "cursor-text"
          }`}
          onClick={openDropdown}
          role="combobox"
        >
          {selectedOptions.map((option) => (
            <span
              className="group inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-textDark"
              key={option.id}
            >
              {option.label}
              {disabled ? null : (
                <button
                  aria-label={`Quitar ${option.label}`}
                  className="rounded-full p-0.5 text-textDark/60 transition group-hover:text-danger hover:bg-danger/10"
                  onClick={(event) => {
                    event.stopPropagation();
                    removeOption(option.id);
                  }}
                  type="button"
                >
                  <X size={12} strokeWidth={2} />
                </button>
              )}
            </span>
          ))}
          <input
            aria-autocomplete="list"
            className="flex-1 bg-transparent px-1 py-1 text-sm outline-none placeholder:text-neutral/70 disabled:cursor-not-allowed"
            disabled={disabled}
            onChange={(event) => {
              setSearchTerm(event.target.value);
              setIsOpen(true);
              setHighlightedIndex(0);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleInputKeyDown}
            placeholder={selectedOptions.length === 0 ? placeholder : ""}
            ref={inputRef}
            type="text"
            value={searchTerm}
          />
          <ChevronDown
            className={`mr-1 text-neutral transition ${isOpen ? "rotate-180" : ""}`}
            size={16}
            strokeWidth={1.8}
          />
        </div>

        {isOpen ? (
          <ul
            className="absolute z-30 mt-1 max-h-60 w-full animate-fadeIn overflow-y-auto rounded-md border border-border bg-white shadow-soft"
            id={`${fieldId}-listbox`}
            role="listbox"
          >
            {filteredOptions.length === 0 ? (
              <li className="px-3 py-2 text-sm text-neutral">{emptyMessage}</li>
            ) : (
              filteredOptions.map((option, index) => {
                const isSelected = value.includes(option.id);
                const isHighlighted = index === highlightedIndex;
                return (
                  <li
                    aria-selected={isSelected}
                    className={`flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-sm ${
                      isHighlighted ? "bg-primary/10" : ""
                    } ${isSelected ? "font-semibold text-textDark" : "text-textDark"}`}
                    key={option.id}
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleOption(option.id);
                    }}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    role="option"
                  >
                    <span className="flex flex-col">
                      <span>{option.label}</span>
                      {option.sublabel ? (
                        <span className="text-xs text-neutral">{option.sublabel}</span>
                      ) : null}
                    </span>
                    {isSelected ? <Check className="text-primary" size={16} strokeWidth={2} /> : null}
                  </li>
                );
              })
            )}
          </ul>
        ) : null}
      </div>
      {error ? <span className="text-danger">{error}</span> : null}
    </div>
  );
}
