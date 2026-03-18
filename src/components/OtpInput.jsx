import { useEffect, useMemo, useRef } from "react";

export default function OtpInput({
  value,
  onChange,
  length = 6,
  disabled = false,
  error = false,
  autoFocus = false,
}) {
  const refs = useRef([]);
  const digits = useMemo(() => {
    const clean = String(value || "").replace(/\D+/g, "").slice(0, length);
    return Array.from({ length }, (_, i) => clean[i] || "");
  }, [value, length]);

  useEffect(() => {
    if (!autoFocus || disabled) return;
    const first = refs.current?.[0];
    if (first && typeof first.focus === "function") first.focus();
  }, [autoFocus, disabled]);

  const setAt = (idx, digit) => {
    const next = digits.slice();
    next[idx] = digit;
    onChange(next.join("").replace(/\D+/g, "").slice(0, length));
  };

  const focusIdx = (idx) => {
    const el = refs.current?.[idx];
    if (el && typeof el.focus === "function") el.focus();
  };

  const handleKeyDown = (e, idx) => {
    if (disabled) return;
    const key = e.key;
    if (key === "Backspace") {
      e.preventDefault();
      if (digits[idx]) {
        setAt(idx, "");
      } else if (idx > 0) {
        setAt(idx - 1, "");
        focusIdx(idx - 1);
      }
      return;
    }
    if (key === "ArrowLeft") {
      e.preventDefault();
      focusIdx(Math.max(0, idx - 1));
      return;
    }
    if (key === "ArrowRight") {
      e.preventDefault();
      focusIdx(Math.min(length - 1, idx + 1));
      return;
    }
  };

  const handleChange = (e, idx) => {
    if (disabled) return;
    const raw = e.target.value;
    const onlyDigits = String(raw || "").replace(/\D+/g, "");

    if (!onlyDigits) {
      setAt(idx, "");
      return;
    }

    // If user types/pastes multiple digits into a single box, spread them.
    const spread = onlyDigits.slice(0, length - idx).split("");
    const next = digits.slice();
    spread.forEach((d, i) => {
      next[idx + i] = d;
    });
    onChange(next.join("").replace(/\D+/g, "").slice(0, length));

    const nextFocus = Math.min(length - 1, idx + spread.length);
    focusIdx(nextFocus);
  };

  const handlePaste = (e, idx) => {
    if (disabled) return;
    const text = e.clipboardData?.getData("text") ?? "";
    const onlyDigits = String(text).replace(/\D+/g, "");
    if (!onlyDigits) return;
    e.preventDefault();
    handleChange({ target: { value: onlyDigits } }, idx);
  };

  return (
    <div className="otp-grid" aria-label="One-time code input">
      {digits.map((d, idx) => (
        <input
          // eslint-disable-next-line react/no-array-index-key
          key={idx}
          ref={(el) => {
            refs.current[idx] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={idx === 0 ? "one-time-code" : "off"}
          pattern="[0-9]*"
          maxLength={length}
          className={`otp-box ${error ? "otp-box-error" : ""}`}
          value={d}
          onChange={(e) => handleChange(e, idx)}
          onKeyDown={(e) => handleKeyDown(e, idx)}
          onPaste={(e) => handlePaste(e, idx)}
          disabled={disabled}
          aria-label={`Digit ${idx + 1}`}
        />
      ))}

      <style>{`
        .otp-grid {
          display: grid;
          grid-template-columns: repeat(${length}, 1fr);
          gap: 10px;
          max-width: 360px;
          margin: 0 auto;
        }
        .otp-box {
          width: 100%;
          aspect-ratio: 1 / 1;
          height: 44px;
          border-radius: 6px;
          border: 1px solid #e2e8f0;
          background: var(--input-bg, #ffffff);
          color: var(--input-text, #0f172a);
          font-weight: 800;
          font-size: 16px;
          text-align: center;
          outline: none;
          transition: border-color 0.18s ease, box-shadow 0.18s ease;
        }
        .otp-box:focus {
          border-color: #0d7a3a;
          box-shadow: 0 0 0 4px rgba(13, 122, 58, 0.15);
        }
        .otp-box:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        .otp-box-error {
          border-color: #dc3545;
        }
        @media (max-width: 420px) {
          .otp-grid { gap: 8px; max-width: 320px; }
          .otp-box { height: 42px; font-size: 16px; }
        }
      `}</style>
    </div>
  );
}

