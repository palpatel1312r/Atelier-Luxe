import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Icon from "./ui/Icon";

const sourceOf = (item) => (typeof item === "string" ? item : item?.image_path || "");

/**
 * Product gallery with a desktop cursor-following magnifier and a mobile-friendly
 * fullscreen viewer. Everything here is presentational: product data / cart APIs
 * are intentionally untouched.
 */
export default function ProductGallery({ images = [], productName = "" }) {
    const [index, setIndex] = useState(0);
    const [direction, setDirection] = useState("next");
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [magnifying, setMagnifying] = useState(false);
    const [lightboxZoom, setLightboxZoom] = useState(false);
    const stageRef = useRef(null);
    const expandRef = useRef(null);
    const closeRef = useRef(null);
    const frameRef = useRef(null);
    const touchStartRef = useRef(0);
    const suppressExpandRef = useRef(false);
    const total = images.length;
    const hasMultiple = total > 1;
    const currentSrc = sourceOf(images[index]);

    useEffect(() => {
        setIndex(0);
        setLightboxOpen(false);
        setMagnifying(false);
        setLightboxZoom(false);
    }, [productName]);

    // Keep gallery index valid when the product image list changes.
    useEffect(() => {
        setIndex((previous) => (total ? Math.min(previous, total - 1) : 0));
    }, [total]);

    useEffect(() => () => {
        if (frameRef.current) cancelAnimationFrame(frameRef.current);
    }, []);

    const goTo = (destination) => {
        if (!total) return;
        const next = (destination + total) % total;
        setDirection(destination > index ? "next" : "prev");
        setIndex(next);
        setMagnifying(false);
        setLightboxZoom(false);
    };
    const goPrev = () => goTo(index - 1);
    const goNext = () => goTo(index + 1);

    const openLightbox = () => {
        setMagnifying(false);
        setLightboxZoom(false);
        setLightboxOpen(true);
    };
    const closeLightbox = () => {
        setLightboxOpen(false);
        setLightboxZoom(false);
        expandRef.current?.focus({ preventScroll: true });
    };

    useEffect(() => {
        if (!lightboxOpen) return;
        const oldOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        closeRef.current?.focus();
        const onKey = (event) => {
            if (event.key === "Escape") closeLightbox();
            if (event.key === "ArrowLeft" && hasMultiple) goPrev();
            if (event.key === "ArrowRight" && hasMultiple) goNext();
        };
        document.addEventListener("keydown", onKey);
        return () => {
            document.body.style.overflow = oldOverflow;
            document.removeEventListener("keydown", onKey);
        };
        // Keyboard handlers are refreshed when image index changes.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lightboxOpen, index, total]);

    const onPointerEnter = (event) => {
        if (event.pointerType === "mouse" || event.pointerType === "pen") {
            if (window.matchMedia?.("(hover: hover) and (pointer: fine)").matches &&
                window.innerWidth > 1100) {
                setMagnifying(true);
                moveMagnifier(event);
            }
        }
    };

    const moveMagnifier = (event) => {
        if (event.pointerType !== "mouse" && event.pointerType !== "pen") return;
        const stage = stageRef.current;
        if (!stage || !window.matchMedia?.("(hover: hover) and (pointer: fine)").matches || window.innerWidth <= 1100) return;
        setMagnifying(true);
        const bounds = stage.getBoundingClientRect();
        const x = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
        const y = Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height));
        if (frameRef.current) cancelAnimationFrame(frameRef.current);
        frameRef.current = requestAnimationFrame(() => {
            stage.style.setProperty("--zoom-x", `${(x * 100).toFixed(2)}%`);
            stage.style.setProperty("--zoom-y", `${(y * 100).toFixed(2)}%`);
        });
    };

    const onPointerLeave = () => {
        setMagnifying(false);
        if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };

    const onTouchStart = (event) => { touchStartRef.current = event.changedTouches[0].clientX; };
    const onTouchEnd = (event) => {
        const change = touchStartRef.current - event.changedTouches[0].clientX;
        if (Math.abs(change) > 55 && hasMultiple && !lightboxZoom) {
            suppressExpandRef.current = true;
            change > 0 ? goNext() : goPrev();
            setTimeout(() => { suppressExpandRef.current = false; }, 350);
        }
    };

    if (total === 0) {
        return (
            <div className="product-gallery product-gallery--empty">
                <div className="product-gallery__placeholder">
                    <div className="product-gallery__placeholder-icon"><Icon name="box" size={28} /></div>
                    <span className="product-gallery__placeholder-text">Product imagery coming soon</span>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className={`product-gallery ${hasMultiple ? "product-gallery--with-thumbs" : ""} motion-gallery`}>
                <div
                    ref={stageRef}
                    className={`product-gallery__stage motion-gallery__stage ${magnifying ? "is-magnifying" : ""}`}
                    data-direction={direction}
                    onPointerEnter={onPointerEnter}
                    onPointerMove={moveMagnifier}
                    onPointerLeave={onPointerLeave}
                    onTouchStart={onTouchStart}
                    onTouchEnd={onTouchEnd}
                    role="group"
                    aria-label={`${productName} image ${index + 1} of ${total}`}
                >
                    <img
                        key={`${index}-${currentSrc}`}
                        className="product-gallery__image motion-gallery__image"
                        src={currentSrc}
                        alt={`${productName} — view ${index + 1}`}
                        draggable={false}
                    />
                    <button
                        ref={expandRef}
                        className="motion-gallery__expand-hit"
                        type="button"
                        aria-label={`Open full-screen image ${index + 1} of ${total} for ${productName}`}
                        onClick={(event) => {
                            if (suppressExpandRef.current) {
                                event.preventDefault();
                                suppressExpandRef.current = false;
                                return;
                            }
                            openLightbox();
                        }}
                    />
                    <span className="motion-gallery__instructions" aria-hidden="true">
                        <Icon name="search" size={16} /> <span className="motion-gallery__desktop-instructions">Hover to zoom · Click to expand</span><span className="motion-gallery__touch-instructions">Tap to enlarge</span>
                    </span>
                    {hasMultiple && (
                        <>
                            <span className="product-gallery__counter">{index + 1} / {total}</span>
                            <button type="button" className="product-gallery__nav product-gallery__nav--prev" onClick={(e) => {e.stopPropagation(); goPrev();}} aria-label="Previous image"><Icon name="chevron" size={18} /></button>
                            <button type="button" className="product-gallery__nav product-gallery__nav--next" onClick={(e) => {e.stopPropagation(); goNext();}} aria-label="Next image"><Icon name="chevron" size={18} /></button>
                            {total <= 8 && <div className="product-gallery__dots">
                                {images.map((_, i) => <button key={i} type="button" className={`product-gallery__dot ${i === index ? "product-gallery__dot--active" : ""}`} onClick={(e) => {e.stopPropagation(); goTo(i);}} aria-label={`Show image ${i + 1}`} />)}
                            </div>}
                        </>
                    )}
                </div>
                {hasMultiple && <div className="product-gallery__thumbs">
                    {images.map((img, i) => (
                        <button
                            key={i}
                            type="button"
                            className={`product-gallery__thumb ${index === i ? "product-gallery__thumb--active" : ""}`}
                            aria-label={`View ${productName} image ${i + 1}`}
                            aria-current={index === i ? "true" : undefined}
                            onClick={() => goTo(i)}
                        >
                            <img src={sourceOf(img)} alt="" loading="lazy" />
                            <span className="product-gallery__thumb-index">{i + 1}</span>
                        </button>
                    ))}
                </div>}
            </div>

            {lightboxOpen && createPortal(
                <div className="product-lightbox motion-lightbox" role="dialog" aria-modal="true" aria-label={`${productName} enlarged image gallery`} onMouseDown={(event) => {if (event.target === event.currentTarget) closeLightbox();}}>
                    <button ref={closeRef} type="button" className="product-lightbox__close" onClick={closeLightbox} aria-label="Close enlarged image">✕</button>
                    <div className="product-lightbox__stage" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
                        <img
                            key={`${index}-${currentSrc}`}
                            src={currentSrc}
                            alt={`${productName} enlarged view ${index + 1}`}
                            draggable={false}
                            className={`product-lightbox__image motion-lightbox__image ${lightboxZoom ? "is-zoomed" : ""}`}
                            onClick={(event) => {
                                if (suppressExpandRef.current) {
                                    event.preventDefault();
                                    suppressExpandRef.current = false;
                                    return;
                                }
                                setLightboxZoom((previous) => !previous);
                            }}
                            title="Click image to toggle zoom"
                        />
                        {hasMultiple && <>
                            <button type="button" className="product-lightbox__nav product-lightbox__nav--prev" aria-label="Previous image" onClick={goPrev}>‹</button>
                            <button type="button" className="product-lightbox__nav product-lightbox__nav--next" aria-label="Next image" onClick={goNext}>›</button>
                        </>}
                    </div>
                    <div className="motion-lightbox__caption"><strong>{productName}</strong><span> · {lightboxZoom ? "Tap to zoom out" : "Tap to zoom"}{hasMultiple ? " · Swipe to browse" : ""}</span></div>
                    {hasMultiple && <div className="product-lightbox__thumbs">{images.map((img, i) => (
                        <button type="button" key={i} className={`product-lightbox__thumb ${index === i ? "product-lightbox__thumb--active" : ""}`} aria-label={`View image ${i + 1}`} onClick={() => goTo(i)}><img src={sourceOf(img)} alt="" /></button>
                    ))}</div>}
                    <div className="product-lightbox__counter">{index + 1} / {total}</div>
                </div>, document.body
            )}
        </>
    );
}
