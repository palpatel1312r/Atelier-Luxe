import { useEffect, useId, useRef, useState } from "react";
import {
  TRADE_THEMES,
  applyMotionLevel,
  applyTradeTheme,
  getTradeTheme,
  readMotionLevel,
  readTradeTheme,
} from "../../theme";

export { TRADE_THEMES, applyMotionLevel, applyTradeTheme } from "../../theme";

export default function ThemeSwitcher() {
  const [theme, setTheme] = useState(readTradeTheme);
  const [motion, setMotion] = useState(readMotionLevel);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const triggerRef = useRef(null);
  const selectedOptionRef = useRef(null);
  const panelId = useId();
  const headingId = useId();

  useEffect(() => {
    applyTradeTheme(theme);
  }, [theme]);

  useEffect(() => {
    applyMotionLevel(motion);
  }, [motion]);

  useEffect(() => {
    if (!open) return;
    selectedOptionRef.current?.focus();
    const onOutside = (event) => {
      if (!wrapperRef.current?.contains(event.target)) setOpen(false);
    };
    const onEscape = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("pointerdown", onOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  const current = getTradeTheme(theme);

  return (
    <div className="trade-theme" ref={wrapperRef}>
      <button
        ref={triggerRef}
        className="trade-theme__trigger"
        type="button"
        aria-label={`Choose color theme, current theme: ${current.label}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="trade-theme__swatches trade-theme__swatches--trigger" aria-hidden="true">
          {current.colors.map((hex) => (
            <i key={hex} style={{ backgroundColor: hex }} />
          ))}
        </span>
        <span className="trade-theme__trigger-label">{current.label}</span>
      </button>

      {open && (
        <div
          id={panelId}
          className="trade-theme__panel experience-theme-panel"
          role="dialog"
          aria-labelledby={headingId}
        >
          <div className="trade-theme__heading">
            <strong id={headingId}>Color themes</strong>
            <small>Choose your favorite palette</small>
          </div>

          <div className="trade-theme__list" role="group" aria-label="Color themes">
            {TRADE_THEMES.map((option) => (
              <button
                key={option.id}
                ref={theme === option.id ? selectedOptionRef : null}
                type="button"
                aria-pressed={theme === option.id}
                className={`trade-theme__option ${theme === option.id ? "is-selected" : ""}`}
                onClick={() => {
                  setTheme(option.id);
                  setOpen(false);
                  triggerRef.current?.focus();
                }}
              >
                <span
                  className="trade-theme__preview"
                  aria-hidden="true"
                  style={{
                    "--theme-preview-bg": option.colors[0],
                    "--theme-preview-primary": option.colors[1],
                    "--theme-preview-accent": option.colors[2],
                  }}
                >
                  <span className="trade-theme__swatches">
                    {option.colors.map((hex) => (
                      <i key={hex} style={{ backgroundColor: hex }} />
                    ))}
                  </span>
                </span>
                <span className="trade-theme__copy">
                  <strong>{option.label}</strong>
                  <small>{option.description}</small>
                </span>
                {theme === option.id && (
                  <svg
                    className="trade-theme__selected"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <path d="m5 12 4 4L19 6" />
                  </svg>
                )}
              </button>
            ))}
          </div>

          <div className="experience-theme-panel__motion">
            <span>Motion</span>
            <div className="experience-theme-panel__segments" role="group" aria-label="Animation intensity">
              <button
                type="button"
                aria-pressed={motion === "vivid"}
                className={motion === "vivid" ? "is-active" : ""}
                onClick={() => setMotion("vivid")}
              >
                Vivid
              </button>
              <button
                type="button"
                aria-pressed={motion === "calm"}
                className={motion === "calm" ? "is-active" : ""}
                onClick={() => setMotion("calm")}
              >
                Calm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
