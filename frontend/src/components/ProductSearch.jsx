import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import { productSuggestions, suggestionTextParts } from "../utils/searchSuggestions";
import Icon from "./ui/Icon";
import "../styles/product-search.css";

export default function ProductSearch({
    value = "",
    onChange,
    onSearch,
    variant = "header",
    placeholder = "Search by name, SKU, barcode, brand...",
}) {
    const id = useId();
    const navigate = useNavigate();
    const inputRef = useRef(null);
    const rootRef = useRef(null);
    const requestRef = useRef({ sequence: 0, timer: null, controller: null });
    const [engaged, setEngaged] = useState(false);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [activeIndex, setActiveIndex] = useState(-1);
    const [panelLayout, setPanelLayout] = useState({ maxHeight: 440, above: false });
    const [failedImages, setFailedImages] = useState(() => new Set());
    const header = variant === "header";
    const subhead = variant === "subhead";
    const listId = `${id}-suggestions`;

    const invalidateRequests = useCallback(() => {
        requestRef.current.sequence += 1;
        clearTimeout(requestRef.current.timer);
        requestRef.current.controller?.abort();
        requestRef.current.timer = null;
        requestRef.current.controller = null;
    }, []);

    const close = useCallback(() => {
        invalidateRequests();
        setEngaged(false);
        setOpen(false);
        setLoading(false);
        setActiveIndex(-1);
    }, [invalidateRequests]);

    const inputIsVisible = useCallback(() => {
        const input = inputRef.current;
        if (!input || input.getClientRects().length === 0) return false;
        const rect = input.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
    }, []);

    useEffect(() => {
        invalidateRequests();
        setSuggestions([]);
        setActiveIndex(-1);
        setOpen(false);
        setLoading(false);
        const query = value.trim();
        if (!engaged || !query || !inputIsVisible()) return;

        const sequence = requestRef.current.sequence;
        requestRef.current.timer = setTimeout(async () => {
            if (
                sequence !== requestRef.current.sequence ||
                document.activeElement !== inputRef.current ||
                !inputIsVisible()
            ) return;

            const controller = new AbortController();
            requestRef.current.controller = controller;
            setLoading(true);
            setOpen(true);
            try {
                const { data } = await api.get("/products", {
                    params: { q: query, per_page: 10 },
                    signal: controller.signal,
                });
                if (
                    controller.signal.aborted ||
                    sequence !== requestRef.current.sequence ||
                    document.activeElement !== inputRef.current ||
                    !inputIsVisible()
                ) return;
                setSuggestions(productSuggestions(data.data));
                setFailedImages(new Set());
                setLoading(false);
                setOpen(true);
            } catch {
                if (controller.signal.aborted || sequence !== requestRef.current.sequence) return;
                setLoading(false);
                setOpen(false);
            }
        }, 220);

        return invalidateRequests;
    }, [value, engaged, inputIsVisible, invalidateRequests]);

    useEffect(() => {
        const handleOutside = (event) => {
            if (!rootRef.current?.contains(event.target)) close();
        };
        document.addEventListener("pointerdown", handleOutside);
        return () => document.removeEventListener("pointerdown", handleOutside);
    }, [close]);

    useEffect(() => {
        if (!open) return;
        const positionPanel = () => {
            if (!inputIsVisible()) {
                close();
                return;
            }
            const rect = rootRef.current.getBoundingClientRect();
            const viewport = window.visualViewport;
            const top = viewport?.offsetTop || 0;
            const bottom = top + (viewport?.height || window.innerHeight);
            const below = bottom - rect.bottom - 12;
            const above = rect.top - top - 12;
            const showAbove = below < 144 && above > below;
            setPanelLayout({
                above: showAbove,
                maxHeight: Math.max(44, Math.min(440, showAbove ? above : below)),
            });
        };
        positionPanel();
        window.addEventListener("resize", positionPanel);
        window.addEventListener("scroll", positionPanel, true);
        window.visualViewport?.addEventListener("resize", positionPanel);
        window.visualViewport?.addEventListener("scroll", positionPanel);
        return () => {
            window.removeEventListener("resize", positionPanel);
            window.removeEventListener("scroll", positionPanel, true);
            window.visualViewport?.removeEventListener("resize", positionPanel);
            window.visualViewport?.removeEventListener("scroll", positionPanel);
        };
    }, [open, close, inputIsVisible]);

    useEffect(() => {
        if (open && activeIndex >= 0) {
            document.getElementById(`${id}-option-${activeIndex}`)?.scrollIntoView({ block: "nearest" });
        }
    }, [activeIndex, open, id]);

    const submit = (term) => {
        const query = term.trim();
        close();
        onChange(query);
        onSearch(query);
    };

    const selectProduct = (product) => {
        close();
        inputRef.current?.blur();
        navigate(`/products/${encodeURIComponent(product.id)}`);
    };

    const handleKeyDown = (event) => {
        if (event.nativeEvent.isComposing) return;
        if (event.key === "Escape") {
            event.preventDefault();
            close();
        } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            if (suggestions.length) {
                setOpen(true);
                setActiveIndex((current) => {
                    if (!open || current < 0) return event.key === "ArrowDown" ? 0 : suggestions.length - 1;
                    return (current + (event.key === "ArrowDown" ? 1 : -1) + suggestions.length) % suggestions.length;
                });
            } else if (value.trim()) {
                setEngaged(true);
            }
        } else if (event.key === "Enter") {
            event.preventDefault();
            if (open && activeIndex >= 0) selectProduct(suggestions[activeIndex]);
            else submit(value);
        }
    };

    return (
        <div
            className={`product-search ${header ? "app-header__search-wrapper" : subhead ? "product-search--subhead" : "product-list-page__search-wrap"}`}
            ref={rootRef}
            onBlur={(event) => {
                const nextFocus = event.relatedTarget;
                if (
                    !event.currentTarget.contains(nextFocus) ||
                    (event.target === inputRef.current && nextFocus?.getAttribute("role") !== "option")
                ) close();
            }}
        >
            <form
                role="search"
                className={header ? "app-header__search-form" : "product-search__form"}
                onSubmit={(event) => {
                    event.preventDefault();
                    submit(value);
                }}
            >
                {!header && <span className={subhead ? "product-search__icon" : "product-list-page__search-icon"}><Icon name="search" size={19} /></span>}
                <input
                    ref={inputRef}
                    id={`${id}-input`}
                    className={header ? "app-header__search-input" : subhead ? "product-search__input" : "product-list-page__search"}
                    type="search"
                    role="combobox"
                    aria-label="Search products"
                    aria-autocomplete="list"
                    aria-controls={listId}
                    aria-expanded={open}
                    aria-activedescendant={open && activeIndex >= 0 ? `${id}-option-${activeIndex}` : undefined}
                    autoComplete="off"
                    spellCheck={false}
                    placeholder={placeholder}
                    value={value}
                    onChange={(event) => {
                        invalidateRequests();
                        setSuggestions([]);
                        setOpen(false);
                        setLoading(false);
                        setActiveIndex(-1);
                        setEngaged(true);
                        onChange(event.target.value);
                    }}
                    onFocus={() => setEngaged(true)}
                    onKeyDown={handleKeyDown}
                />
                {header && <button type="submit" className="app-header__search-btn" aria-label="Search products"><Icon name="search" size={20} /></button>}
            </form>
            {open && (
                <div
                    className={`product-search__panel${panelLayout.above ? " product-search__panel--above" : ""}`}
                    style={{ maxHeight: panelLayout.maxHeight }}
                >
                    <ul id={listId} role="listbox" aria-label="Product suggestions" className="product-search__suggestions" aria-busy={loading}>
                        {suggestions.map((product, index) => (
                            <li
                                key={product.id}
                                id={`${id}-option-${index}`}
                                role="option"
                                tabIndex={-1}
                                aria-selected={activeIndex === index}
                                className={`product-search__suggestion${activeIndex === index ? " product-search__suggestion--active" : ""}`}
                                onMouseDown={(event) => event.preventDefault()}
                                onMouseEnter={() => setActiveIndex(index)}
                                onClick={() => selectProduct(product)}
                            >
                                <span className="product-search__thumbnail" aria-hidden="true">
                                    {product.imageUrl && !failedImages.has(String(product.id)) ? (
                                        <img
                                            src={product.imageUrl}
                                            alt=""
                                            loading="lazy"
                                            onError={() => setFailedImages((current) => {
                                                const next = new Set(current);
                                                next.add(String(product.id));
                                                return next;
                                            })}
                                        />
                                    ) : <Icon name="box" size={20} />}
                                </span>
                                <span className="product-search__suggestion-name">
                                    {suggestionTextParts(product.name, value).map((part, partIndex) => part.matched
                                        ? <span key={partIndex}>{part.text}</span>
                                        : <strong key={partIndex}>{part.text}</strong>)}
                                </span>
                            </li>
                        ))}
                    </ul>
                    {suggestions.length === 0 && <p className="product-search__message">{loading ? "Searching products…" : "No matching products. Try another name or SKU."}</p>}
                </div>
            )}
            <span className="product-search__status" role="status" aria-live="polite">
                {open ? loading ? "Searching products" : `${suggestions.length} product suggestions available` : ""}
            </span>
        </div>
    );
}
