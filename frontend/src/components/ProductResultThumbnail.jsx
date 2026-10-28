import { useEffect, useState } from "react";
import Icon from "./ui/Icon";
import "../styles/product-result-thumbnail.css";

function productImage(product) {
    const images = Array.isArray(product?.images) ? product.images : [];
    const preferred = images.find((image) => image?.is_primary) || images[0];
    if (typeof preferred === "string") return preferred;
    return preferred?.image_path || product?.image_url || "";
}

export default function ProductResultThumbnail({ product, size = "md" }) {
    const src = productImage(product);
    const [failed, setFailed] = useState(false);
    useEffect(() => setFailed(false), [src]);
    return (
        <span className={`product-result-thumb product-result-thumb--${size}`} aria-hidden="true">
            {src && !failed
                ? <img src={src} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} />
                : <Icon name="box" size={18} />}
        </span>
    );
}
