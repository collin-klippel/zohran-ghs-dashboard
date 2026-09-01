import { useDeferredValue, useEffect, useId, useMemo, useRef, useState } from "react";
import { type SearchIndex, searchSchools, type Suggestion } from "../lib/searchIndex";

export interface SchoolSearchProps {
  index: SearchIndex;
  onSelect: (row: number) => void;
  /** "hero" is the landing screen's oversized field; "inline" sits in a header. */
  variant?: "hero" | "inline";
  /** Visually hidden, so the field is still named for a screen reader. */
  label: string;
  placeholder?: string;
  autoFocus?: boolean;
}

/**
 * Pick one school by name, address, or code.
 *
 * The researcher panel's search box is a filter — it narrows the map and the
 * ranked list. This is a picker, so it follows the ARIA combobox pattern
 * instead: the list is a `listbox`, the active option is pointed at by
 * `aria-activedescendant`, and focus never leaves the input.
 *
 * Matching and ranking live in `lib/searchIndex.ts` so they can be tested
 * without a DOM; this component is only the interaction.
 */
export default function SchoolSearch({
  index,
  onSelect,
  variant = "hero",
  label,
  placeholder = "Search by school name, address, or code",
  autoFocus = false,
}: SchoolSearchProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const root = useRef<HTMLDivElement>(null);
  const id = useId();

  // Scanning ~2k pre-normalized strings is well under a millisecond, so a timed
  // debounce would only add latency. Deferring instead keeps the input
  // responsive if the roster ever grows, without a timer to tune.
  const deferred = useDeferredValue(query);
  const results = useMemo(() => searchSchools(index, deferred), [index, deferred]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const commit = (s: Suggestion) => {
    setOpen(false);
    setQuery("");
    setActive(-1);
    onSelect(s.row);
  };

  const move = (delta: number) => {
    if (results.length === 0) return;
    setActive((prev) => {
      const next = prev + delta;
      if (next < 0) return results.length - 1;
      if (next >= results.length) return 0;
      return next;
    });
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (!open) setOpen(true);
        else move(1);
        break;
      case "ArrowUp":
        e.preventDefault();
        if (open) move(-1);
        break;
      case "Home":
      case "End":
        // Only while the list is open — otherwise these belong to the caret.
        if (open && results.length > 0) {
          e.preventDefault();
          setActive(e.key === "Home" ? 0 : results.length - 1);
        }
        break;
      case "Enter": {
        // With one result and nothing highlighted, Enter means "that one" —
        // typing a full location code and pressing Enter should just work.
        const pick = active >= 0 ? results[active] : results.length === 1 ? results[0] : null;
        if (open && pick) {
          e.preventDefault();
          commit(pick);
        }
        break;
      }
      case "Escape":
        // First Escape dismisses the list, a second clears the field — the
        // usual two-stage behaviour, which is also why this is `type="text"`:
        // a search input's native clear button swallows the key in WebKit.
        if (open) setOpen(false);
        else setQuery("");
        setActive(-1);
        break;
      case "Tab":
        setOpen(false);
        break;
    }
  };

  const listId = `${id}-list`;
  const expanded = open && query.trim() !== "";
  const status =
    !expanded
      ? ""
      : results.length === 0
        ? "No schools match."
        : `${results.length} school${results.length === 1 ? "" : "s"}. Use the up and down arrow keys to review.`;

  return (
    <div className={`combobox combobox--${variant}`} ref={root}>
      <label htmlFor={id} className="visually-hidden">
        {label}
      </label>
      <input
        id={id}
        className="combobox__input"
        type="text"
        role="combobox"
        autoComplete="off"
        spellCheck={false}
        autoFocus={autoFocus}
        placeholder={placeholder}
        value={query}
        aria-expanded={expanded}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />

      {expanded && (
        <ul className="combobox__list" id={listId} role="listbox" aria-label={label}>
          {results.map((s, i) => (
            <li
              key={s.row}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              className={`combobox__option${i === active ? " combobox__option--active" : ""}`}
              // Mousedown rather than click: blur would close the list first and
              // the click would land on nothing.
              onMouseDown={(e) => {
                e.preventDefault();
                commit(s);
              }}
              onMouseEnter={() => setActive(i)}
            >
              <span className="combobox__name">{s.name}</span>
              <span className="combobox__meta">{s.subtitle}</span>
            </li>
          ))}

          {results.length === 0 && (
            <li className="combobox__empty">
              No school matches. Try a school number (PS 24), an address, or a location code
              (K001).
            </li>
          )}
        </ul>
      )}

      <div role="status" aria-live="polite" className="visually-hidden">
        {status}
      </div>
    </div>
  );
}
