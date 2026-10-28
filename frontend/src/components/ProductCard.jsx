import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import "../styles/product-card.css";
import Icon from "./ui/Icon";

const STOCK_META = {
    in_stock: { label: "In stock" },
    low_stock: { label: "Limited stock" },
    out_of_stock: { label: "Out of stock" },
};

const imageSource = (image) => typeof image === "string" ? image : image?.image_path || "";
const formatPrice = (value) => {
    if (value === null || value === undefined || value === "") return null;
    const n = Number(value);
    return Number.isFinite(n) ? `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}` : null;
};

/** A product card that works with hover, keyboard and touch — without nested links/buttons. */
export default function ProductCard({ product, size = null, compact = false, revealIndex = 0 }) {
    const cardRef = useRef(null);
    const rafRef = useRef(0);
    const touchStart = useRef(null);
    const suppressClick = useRef(false);
    const suppressTimer = useRef(0);
    const [photoIndex, setPhotoIndex] = useState(0);
    const photos = (Array.isArray(product.images) ? product.images : []).map(imageSource).filter(Boolean);
    const shownIndex = Math.min(photoIndex, Math.max(0, photos.length - 1));
    const hasGallery = photos.length > 1;

    useEffect(() => {
        setPhotoIndex(0);
    }, [product.id]);
    useEffect(() => () => {
        cancelAnimationFrame(rafRef.current);
        clearTimeout(suppressTimer.current);
    }, []);

    const onMove = (event) => {
        if (event.pointerType !== "mouse" ||
            window.matchMedia("(prefers-reduced-motion: reduce), (hover: none)").matches ||
            document.documentElement.dataset.motionLevel === "calm") return;
        const node = cardRef.current;
        if (!node) return;
        const bounds = node.getBoundingClientRect();
        const x = (event.clientX - bounds.left) / bounds.width;
        const y = (event.clientY - bounds.top) / bounds.height;
        cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(() => {
            node.style.setProperty("--tilt-x", `${((0.5 - y) * 4).toFixed(2)}deg`);
            node.style.setProperty("--tilt-y", `${((x - 0.5) * 4).toFixed(2)}deg`);
            node.style.setProperty("--spot-x", `${(x * 100).toFixed(1)}%`);
            node.style.setProperty("--spot-y", `${(y * 100).toFixed(1)}%`);
        });
    };
    const clearTilt = () => {
        cancelAnimationFrame(rafRef.current);
        const node = cardRef.current;
        if (node) {
            node.style.setProperty("--tilt-x", "0deg");
            node.style.setProperty("--tilt-y", "0deg");
        }
    };
    const showPhoto = (direction) => setPhotoIndex((current) =>
        (current + direction + photos.length) % photos.length
    );
    const onTouchStart = (event) => {
        const touch = event.changedTouches[0];
        const media = cardRef.current?.querySelector(".experience-product__media");
        const bounds = media?.getBoundingClientRect();
        if (!bounds || touch.clientY < bounds.top || touch.clientY > bounds.bottom) {
            touchStart.current = null;
            return;
        }
        touchStart.current = { x: touch.clientX, y: touch.clientY };
    };
    const onTouchEnd = (event) => {
        if (!hasGallery || !touchStart.current) return;
        const touch = event.changedTouches[0];
        const dx = touch.clientX - touchStart.current.x;
        const dy = touch.clientY - touchStart.current.y;
        touchStart.current = null;
        if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.4) {
            showPhoto(dx < 0 ? 1 : -1);
            suppressClick.current = true;
            clearTimeout(suppressTimer.current);
            suppressTimer.current = setTimeout(() => { suppressClick.current = false; }, 350);
        }
    };

    const hasDiscount = product.mrp != null && product.your_price != null &&
        Number(product.mrp) > Number(product.your_price);
    const discountPct = hasDiscount ? Math.round((1 - product.your_price / product.mrp) * 100) : 0;
    const showOriginalPrice = product.price_source === "mrp" || !product.price_source;
    const currentPrice = formatPrice(showOriginalPrice ? product.mrp : product.your_price);
    const brandName = typeof product.brand === "object" ? product.brand?.name : product.brand;
    const stock = STOCK_META[product.stock_status] || STOCK_META.in_stock;

    return (
      <article ref={cardRef} onPointerMove={onMove} onPointerLeave={clearTilt}
        className={`studio-product product-card experience-product ${compact ? "product-card--compact" : ""}`}
        onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
        style={{ "--card-index": Math.min(9, revealIndex) }}>
        <div className="studio-product__media experience-product__media">
          {photos.length ? <img key={`${product.id}-${shownIndex}`} className="studio-product__photo"
            src={photos[shownIndex]} alt={`${product.name}, image ${shownIndex+1}`} loading="lazy" decoding="async" draggable={false}/>
            : <div className="studio-product__placeholder"><Icon name="box" size={39}/><span>Photo coming soon</span></div>}
          <Link className="studio-product__image-link" to={`/products/${product.id}`}
            aria-label={`View ${product.name}`}
            onClick={event => {if (suppressClick.current) {event.preventDefault(); suppressClick.current=false;}}}/>
          <span className="studio-product__serial">TRADE EDIT / {String(revealIndex + 1).padStart(2,'0')}</span>
          {hasDiscount && <span className="studio-product__offer">−{discountPct}%</span>}
          {hasGallery && <div className="studio-product__controls" role="group" aria-label={`Photos of ${product.name}`}>
            <button type="button" aria-label="Previous photo" onClick={()=>showPhoto(-1)}>‹</button>
            <span>{shownIndex + 1} / {photos.length}</span>
            <button type="button" aria-label="Next photo" onClick={()=>showPhoto(1)}>›</button>
          </div>}
        </div>
        <div className="studio-product__body">
          <div className="studio-product__meta"><span>{brandName || 'THE MARKETPLACE'}</span><span>{product.sku || 'WHOLESALE'}</span></div>
          <h3><Link to={`/products/${product.id}`}>{product.name}</Link></h3>
          <div className="studio-product__detail"><span>MIN ORDER <b>{product.moq ?? 1}</b></span>{size && <span>SIZE <b>{size}</b></span>}</div>
          <div className="studio-product__bottom">
            <div className="studio-product__price"><small>YOUR RATE</small><strong>{currentPrice || 'On request'}</strong>{hasDiscount && !showOriginalPrice && <del>{formatPrice(product.mrp)}</del>}</div>
            <Link className="studio-product__go" to={`/products/${product.id}`} aria-label={`Explore ${product.name}`}><Icon name="arrow" size={19}/></Link>
          </div>
          <div className={`studio-product__stock studio-product__stock--${product.stock_status || 'in_stock'}`}><i/>{stock.label}</div>
        </div>
      </article>
    );
}
