/** Preserve product identity so each suggestion opens the correct detail page. */
export function productSuggestions(products, limit = 10) {
    if (!Array.isArray(products) || limit <= 0) return [];

    const seen = new Set();
    const suggestions = [];
    for (const product of products) {
        if (
            typeof product?.name !== "string" ||
            !["number", "string"].includes(typeof product.id)
        ) continue;
        const name = product.name.trim();
        const key = String(product.id).trim();
        if (!name || !key || seen.has(key)) continue;
        seen.add(key);
        const images = Array.isArray(product.images) ? product.images : [];
        const preferredImage = images.find((image) => image?.is_primary) || images[0];
        const imageUrl = typeof preferredImage === "string"
            ? preferredImage.trim()
            : typeof preferredImage?.image_path === "string"
                ? preferredImage.image_path.trim()
                : "";
        suggestions.push({
            id: product.id,
            name,
            ...(imageUrl ? { imageUrl } : {}),
        });
        if (suggestions.length >= limit) break;
    }
    return suggestions;
}

/** Split literal matches so React can render the completion in bold safely. */
export function suggestionTextParts(name, query) {
    const term = query.trim().toLocaleLowerCase();
    if (!term) return [{ text: name, matched: false }];

    const lowercaseName = name.toLocaleLowerCase();
    const parts = [];
    let cursor = 0;
    let match = lowercaseName.indexOf(term);
    while (match !== -1) {
        if (match > cursor) {
            parts.push({ text: name.slice(cursor, match), matched: false });
        }
        parts.push({ text: name.slice(match, match + term.length), matched: true });
        cursor = match + term.length;
        match = lowercaseName.indexOf(term, cursor);
    }
    if (cursor < name.length) {
        parts.push({ text: name.slice(cursor), matched: false });
    }
    return parts;
}
