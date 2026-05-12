import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { ChevronDown, Loader2, X } from "lucide-react";

export interface AutocompleteOption {
  id: string;
  label: string;
  sublabel?: string;
}

interface AutocompleteProps {
  label: string;
  loadOptions: (query: string) => Promise<AutocompleteOption[]>;
  selected: AutocompleteOption | null;
  placeholder?: string;
  minQueryLength?: number;
  debounceMs?: number;
  disabled?: boolean;
  error?: string;
  emptyMessage?: string;
  onSelect: (option: AutocompleteOption | null) => void;
}

export function Autocomplete({
  label,
  loadOptions,
  selected,
  placeholder = "Escribí para buscar...",
  minQueryLength = 2,
  debounceMs = 250,
  disabled = false,
  error,
  emptyMessage = "Sin coincidencias.",
  onSelect,
}: AutocompleteProps) {
  const fieldId = useId();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const requestIdRef = useRef<number>(0);
  const [query, setQuery] = useState<string>("");
  const [options, setOptions] = useState<AutocompleteOption[]>([]);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  const runSearch = useCallback(
    async (term: string) => {
      const currentId = requestIdRef.current + 1;
      requestIdRef.current = currentId;
      setIsLoading(true);
      try {
        const results = await loadOptions(term);
        if (requestIdRef.current === currentId) {
          setOptions(results);
          setHighlightedIndex(results.length > 0 ? 0 : -1);
        }
      } finally {
        if (requestIdRef.current === currentId) {
          setIsLoading(false);
        }
      }
    },
    [loadOptions],
  );

  useEffect(() => {
    if (selected) {
      setQuery("");
      setOptions([]);
      setIsOpen(false);
      return;
    }
    const trimmed = query.trim();
    if (trimmed.length < minQueryLength) {
      setOptions([]);
      setIsLoading(false);
      return;
    }
    const timer = window.setTimeout(() => {
      void runSearch(trimmed);
    }, debounceMs);
    return () => window.clearTimeout(timer);
  }, [query, minQueryLength, debounceMs, runSearch, selected]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const selectOption = (option: AutocompleteOption) => {
    onSelect(option);
    setQuery("");
    setIsOpen(false);
    setOptions([]);
  };

  const clearSelection = () => {
    onSelect(null);
    setQuery("");
    setOptions([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setIsOpen(true);
      setHighlightedIndex((current) => Math.min(current + 1, options.length - 1));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightedIndex((current) => Math.max(current - 1, 0));
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const target = options[highlightedIndex];
      if (target) {
        selectOption(target);
      }
      return;
    }
    if (event.key === "Escape") {
      setIsOpen(false);
      return;
    }
  };

  return (
    <div className="flex w-full flex-col gap-1 text-sm text-textDark">
      <span className="font-medium" id={`${fieldId}-label`}>
        {label}
      </span>
      <div className="relative" ref={containerRef}>
        {selected ? (
          <div className="flex w-full items-center justify-between gap-2 rounded-md border border-border bg-white px-3 py-2">
            <span className="flex flex-col">
              <span className="font-medium text-textDark">{selected.label}</span>
              {selected.sublabel ? (
                <span className="text-xs text-neutral">{selected.sublabel}</span>
              ) : null}
            </span>
            {disabled ? null : (
              <button
                aria-label={`Quitar selección`}
                className="rounded-full p-1 text-neutral transition hover:bg-danger/10 hover:text-danger"
                onClick={clearSelection}
                type="button"
              >
                <X size={16} strokeWidth={2} />
              </button>
            )}
          </div>
        ) : (
          <div
            className={`flex items-center gap-2 rounded-md border border-border bg-white px-3 py-2 focus-within:ring-2 focus-within:ring-primary ${
              disabled ? "cursor-not-allowed bg-slate-50" : ""
            }`}
          >
            <input
              aria-controls={`${fieldId}-listbox`}
              aria-expanded={isOpen}
              aria-haspopup="listbox"
              aria-labelledby={`${fieldId}-label`}
              className="flex-1 bg-transparent outline-none placeholder:text-neutral/70 disabled:cursor-not-allowed"
              disabled={disabled}
              onChange={(event) => {
                setQuery(event.target.value);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              ref={inputRef}
              role="combobox"
              type="text"
              value={query}
            />
            {isLoading ? (
              <Loader2 className="animate-spin text-neutral" size={16} strokeWidth={1.8} />
            ) : (
              <ChevronDown
                className={`text-neutral transition ${isOpen ? "rotate-180" : ""}`}
                size={16}
                strokeWidth={1.8}
              />
            )}
          </div>
        )}

        {!selected && isOpen && query.trim().length >= minQueryLength ? (
          <ul
            className="absolute z-30 mt-1 max-h-60 w-full animate-fadeIn overflow-y-auto rounded-md border border-border bg-white shadow-soft"
            id={`${fieldId}-listbox`}
            role="listbox"
          >
            {options.length === 0 && !isLoading ? (
              <li className="px-3 py-2 text-sm text-neutral">{emptyMessage}</li>
            ) : (
              options.map((option, index) => {
                const isHighlighted = index === highlightedIndex;
                return (
                  <li
                    aria-selected={isHighlighted}
                    className={`flex cursor-pointer flex-col gap-0.5 px-3 py-2 text-sm text-textDark ${
                      isHighlighted ? "bg-primary/10" : ""
                    }`}
                    key={option.id}
                    onClick={() => selectOption(option)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    role="option"
                  >
                    <span>{option.label}</span>
                    {option.sublabel ? (
                      <span className="text-xs text-neutral">{option.sublabel}</span>
                    ) : null}
                  </li>
                );
              })
            )}
          </ul>
        ) : null}
      </div>
      {!selected && query.trim().length > 0 && query.trim().length < minQueryLength ? (
        <span className="text-xs text-neutral">
          Escribí al menos {minQueryLength} caracteres para buscar.
        </span>
      ) : null}
      {error ? <span className="text-danger">{error}</span> : null}
    </div>
  );
}
