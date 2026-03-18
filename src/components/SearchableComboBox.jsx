import { useEffect, useId, useMemo, useRef, useState } from "react";

function normalize(str) {
  return String(str ?? "")
    .trim()
    .toLowerCase();
}

export default function SearchableComboBox({
  id,
  name,
  value,
  onChange,
  options,
  placeholder,
  disabled,
  invalid = false,
  className,
  style,
  inputProps,
  menuMaxHeight = 220,
  theme = { primary: "#0d7a3a", borderColor: "#d1d5db", textPrimary: "#1a2a1a" },
}) {
  const autoId = useId();
  const inputId = id ?? `${name ?? "combobox"}-${autoId}`;
  const listboxId = `${inputId}-listbox`;

  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);

  const safeOptions = useMemo(() => {
    const raw = Array.isArray(options) ? options : [];
    return raw
      .map((o) => {
        if (typeof o === "string") return { label: o, value: o };
        if (o && typeof o === "object") {
          const label = o.label ?? o.value ?? "";
          const val = o.value ?? o.label ?? "";
          return { label: String(label), value: String(val) };
        }
        return null;
      })
      .filter(Boolean);
  }, [options]);

  const filtered = useMemo(() => {
    const q = normalize(open ? query : value);
    if (!q) return safeOptions;
    return safeOptions.filter((o) => normalize(o.label).includes(q));
  }, [open, query, safeOptions, value]);

  const noResults = open && query.trim().length > 0 && filtered.length === 0;
  const isInvalid = Boolean(invalid || noResults);

  useEffect(() => {
    function onDocMouseDown(e) {
      if (!rootRef.current) return;
      if (rootRef.current.contains(e.target)) return;
      setOpen(false);
      setQuery("");
      setActiveIndex(-1);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    setActiveIndex(filtered.length ? 0 : -1);
  }, [open, filtered.length]);

  const activeDescendantId =
    open && activeIndex >= 0 ? `${inputId}-opt-${activeIndex}` : undefined;

  const baseInputStyle = {
    border: `1px solid ${isInvalid ? "#dc3545" : theme.borderColor}`,
    borderRadius: 8,
    color: theme.textPrimary,
    transition: "all 0.25s ease",
    outline: "none",
    ...style,
  };

  return (
    <div ref={rootRef} style={{ position: "relative" }}>
      <input
        id={inputId}
        name={name}
        type="text"
        value={open ? query : value}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete="off"
        className={className}
        style={baseInputStyle}
        ref={inputRef}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open ? "true" : "false"}
        aria-controls={listboxId}
        aria-activedescendant={activeDescendantId}
        onFocus={() => {
          if (disabled) return;
          setOpen(true);
          setQuery("");
          if (!inputRef.current) return;
          if (isInvalid) {
            inputRef.current.style.borderColor = "#dc3545";
            inputRef.current.style.boxShadow = "0 0 0 0.2rem rgba(220, 53, 69, 0.25)";
          } else {
            inputRef.current.style.borderColor = theme.primary;
            inputRef.current.style.boxShadow = "0 0 0 0.2rem rgba(13, 122, 58, 0.25)";
          }
        }}
        onBlur={() => {
          if (!inputRef.current) return;
          if (isInvalid) {
            inputRef.current.style.borderColor = "#dc3545";
            inputRef.current.style.boxShadow = "none";
          } else {
            inputRef.current.style.borderColor = theme.borderColor;
            inputRef.current.style.boxShadow = "none";
          }
        }}
        onChange={(e) => {
          if (disabled) return;
          setOpen(true);
          setQuery(e.target.value);
        }}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setActiveIndex((i) => {
              const next = i < 0 ? 0 : Math.min(i + 1, filtered.length - 1);
              return next;
            });
            return;
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            setOpen(true);
            setActiveIndex((i) => Math.max((i < 0 ? 0 : i) - 1, 0));
            return;
          }
          if (e.key === "Enter") {
            if (!open) return;
            e.preventDefault();
            const opt = filtered[activeIndex];
            if (opt) {
              onChange?.(opt.value);
              setOpen(false);
              setQuery("");
              setActiveIndex(-1);
            }
            return;
          }
          if (e.key === "Escape") {
            if (!open) return;
            e.preventDefault();
            setOpen(false);
            setQuery("");
            setActiveIndex(-1);
          }
        }}
        {...inputProps}
      />

      {open && (
        <div
          id={listboxId}
          role="listbox"
          className="dropdown-menu show w-100"
          style={{
            maxHeight: menuMaxHeight,
            overflowY: "auto",
            marginTop: 4,
          }}
        >
          {filtered.length === 0 ? (
            <div className="dropdown-item-text text-danger small">
              No option matching &quot;{query.trim()}&quot;
            </div>
          ) : (
            filtered.map((opt, idx) => {
              const active = idx === activeIndex;
              const isLast = idx === filtered.length - 1;
              return (
                <button
                  key={`${opt.value}-${idx}`}
                  id={`${inputId}-opt-${idx}`}
                  type="button"
                  className="dropdown-item"
                  style={{
                    backgroundColor: active
                      ? "rgba(13, 122, 58, 0.12)"
                      : "transparent",
                    color: "inherit",
                    borderBottom: isLast
                      ? "none"
                      : `1px solid ${theme.borderColor}`,
                  }}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onChange?.(opt.value);
                    setOpen(false);
                    setQuery("");
                    setActiveIndex(-1);
                  }}
                >
                  {opt.label}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

