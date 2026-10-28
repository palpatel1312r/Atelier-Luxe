import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import api from "../api/client";
import { useCartCount } from "../hooks/useCartCount";
import Icon from "../components/ui/Icon";
import ProductResultThumbnail from "../components/ProductResultThumbnail";

const newLine = () => ({
    id: `${Date.now()}-${Math.random()}`,
    query: "",
    item: null,
    variant: null,
    qty: 1,
});
const money = (n) =>
    `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
export default function FastOrder() {
    const [rows, setRows] = useState(() => [newLine(), newLine(), newLine()]);
    const [results, setResults] = useState({});
    const [busy, setBusy] = useState(null);
    const [loading, setLoading] = useState(false);
    const [notice, setNotice] = useState("");
    const [density, setDensity] = useState("comfortable");
    const latest = useRef({});
    const searchTimers = useRef({});
    useEffect(
        () => () => Object.values(searchTimers.current).forEach(clearTimeout),
        [],
    );
    const { refresh } = useCartCount();
    const edit = (id, props) =>
        setRows((current) =>
            current.map((r) => (r.id === id ? { ...r, ...props } : r)),
        );
    const searchSku = (id, query) => {
        edit(id, { query, item: null, variant: null });
        clearTimeout(searchTimers.current[id]);
        const token = (latest.current[id] || 0) + 1;
        latest.current[id] = token;
        if (!query.trim()) {
            setResults((current) => ({ ...current, [id]: [] }));
            setLoading(false);
            return;
        }
        searchTimers.current[id] = setTimeout(async () => {
            setLoading(true);
            try {
                const { data } = await api.get("/products", {
                    params: { q: query.trim(), per_page: 10, in_stock: 1 },
                });
                if (latest.current[id] === token)
                    setResults((current) => ({
                        ...current,
                        [id]: Array.isArray(data.data) ? data.data : [],
                    }));
            } catch {
                if (latest.current[id] === token)
                    setResults((current) => ({ ...current, [id]: [] }));
            } finally {
                if (latest.current[id] === token) setLoading(false);
            }
        }, 260);
    };
    const choose = async (id, summary) => {
        setResults((s) => ({ ...s, [id]: [] }));
        setBusy(id);
        try {
            const { data } = await api.get(`/products/${summary.id}`);
            const item = data.data;
            edit(id, {
                item,
                variant: item.variants?.[0] || null,
                query: item.sku || item.name,
                qty: Math.max(1, Number(item.moq) || 1),
            });
        } catch {
            setNotice("Could not load product details. Try again.");
        } finally {
            setBusy(null);
        }
    };
    const pricedRows = useMemo(
        () =>
            rows.map((r) => ({
                ...r,
                unit: Number(r.variant?.your_price ?? r.item?.your_price ?? 0),
                amount:
                    Number(r.variant?.your_price ?? r.item?.your_price ?? 0) *
                    Number(r.qty || 0),
            })),
        [rows],
    );
    const estimate = pricedRows.reduce((n, r) => n + r.amount, 0);
    const addLine = async (r) => {
        if (!r.item) return;
        if (!r.variant?.id) {
            setNotice(
                `Select a product with a purchasable variant for ${r.query}.`,
            );
            return;
        }
        setBusy(r.id);
        setNotice("");
        try {
            await api.post("/cart/items", {
                product_id: r.item.id,
                variant_id: r.variant.id,
                quantity: Number(r.qty),
            });
            refresh();
            edit(r.id, { item: null, variant: null, query: "", qty: 1 });
            setNotice(`${r.item.name} added to basket.`);
        } catch (e) {
            setNotice(e.response?.data?.message || `Could not add ${r.query}.`);
        } finally {
            setBusy(null);
        }
    };
    const addAll = async () => {
        for (const r of rows.filter((r) => r.item)) await addLine(r);
    };
    return (
        <Layout>
            <div className="enterprise-fast-order">
                <div className="enterprise-page-intro">
                    <div>
                        <p className="enterprise-eyebrow">
                            PROCUREMENT / QUICK ENTRY
                        </p>
                        <h1>Fast order pad</h1>
                        <p>
                            Find products by name or SKU, enter quantities and
                            send items to your existing basket. No spreadsheets
                            to upload.
                        </p>
                    </div>
                    <Link to="/cart" className="enterprise-primary">
                        <Icon name="bag" size={17} /> Review basket
                    </Link>
                </div>
                <div className="enterprise-fast-order__bar">
                    <p>
                        <strong>Quick entry</strong>
                        <span>
                            Use Tab to move between inputs. Rates shown are
                            indicative; basket pricing is authoritative.
                        </span>
                    </p>
                    <div
                        className="enterprise-density"
                        role="group"
                        aria-label="Table density"
                    >
                        <button
                            aria-pressed={density === "comfortable"}
                            onClick={() => setDensity("comfortable")}
                        >
                            Comfortable
                        </button>
                        <button
                            aria-pressed={density === "compact"}
                            onClick={() => setDensity("compact")}
                        >
                            Compact
                        </button>
                    </div>
                </div>
                <section
                    className={`enterprise-order-matrix is-${density}`}
                    aria-label="SKU order entry matrix"
                >
                    <div className="enterprise-order-matrix__scroll">
                        <table>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Product / SKU</th>
                                    <th>Variant</th>
                                    <th>Quantity</th>
                                    <th>Available</th>
                                    <th>Est. unit price</th>
                                    <th>Est. subtotal</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pricedRows.map((r, i) => (
                                    <tr key={r.id}>
                                        <td data-label="Line">{i + 1}</td>
                                        <td
                                            className="enterprise-order-matrix__lookup"
                                            data-label="Product / SKU"
                                        >
                                            <input
                                                value={r.query}
                                                onChange={(e) =>
                                                    searchSku(
                                                        r.id,
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="Search name or SKU"
                                                aria-label={`Product lookup row ${i + 1}`}
                                                autoComplete="off"
                                            />
                                            {!!results[r.id]?.length && (
                                                <div className="enterprise-order-matrix__suggestions">
                                                    {results[r.id].map((x) => (
                                                        <button
                                                            type="button"
                                                            key={x.id}
                                                            onClick={() =>
                                                                choose(r.id, x)
                                                            }
                                                        >
                                                            <ProductResultThumbnail
                                                                product={x}
                                                            />
                                                            <span className="product-result-copy">
                                                                <strong>
                                                                    {x.name}
                                                                </strong>
                                                                <small>
                                                                    {x.sku ||
                                                                        "Product"}
                                                                </small>
                                                            </span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                            {loading &&
                                                !!r.query &&
                                                !r.item && (
                                                    <small className="enterprise-order-matrix__hint">
                                                        Searching…
                                                    </small>
                                                )}
                                        </td>
                                        <td data-label="Variant">
                                            <select
                                                value={r.variant?.id || ""}
                                                aria-label={`Variant row ${i + 1}`}
                                                onChange={(e) =>
                                                    edit(r.id, {
                                                        variant:
                                                            r.item?.variants?.find(
                                                                (v) =>
                                                                    String(
                                                                        v.id,
                                                                    ) ===
                                                                    e.target
                                                                        .value,
                                                            ) || null,
                                                    })
                                                }
                                                disabled={!r.item}
                                            >
                                                {r.item?.variants?.map((v) => (
                                                    <option
                                                        key={v.id}
                                                        value={v.id}
                                                    >
                                                        {v.sku ||
                                                            v.name ||
                                                            `Variant ${v.id}`}
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                        <td data-label="Qty">
                                            <input
                                                type="number"
                                                min={r.item?.moq || 1}
                                                step="1"
                                                value={r.qty}
                                                aria-label={`Quantity row ${i + 1}`}
                                                onChange={(e) =>
                                                    edit(r.id, {
                                                        qty: Math.max(
                                                            Number(
                                                                r.item?.moq,
                                                            ) || 1,
                                                            Number(
                                                                e.target.value,
                                                            ) || 1,
                                                        ),
                                                    })
                                                }
                                            />
                                        </td>
                                        <td data-label="Stock">
                                            <span
                                                className={
                                                    Number(
                                                        r.variant
                                                            ?.available_stock ??
                                                            r.item
                                                                ?.available_stock ??
                                                            0,
                                                    ) > 0
                                                        ? "enterprise-stock is-in"
                                                        : "enterprise-stock"
                                                }
                                            >
                                                {r.item
                                                    ? `${r.variant?.available_stock ?? r.item.available_stock ?? "—"} in stock`
                                                    : "—"}
                                            </span>
                                        </td>
                                        <td data-label="Unit price">
                                            {r.item ? money(r.unit) : "—"}
                                        </td>
                                        <td data-label="Subtotal">
                                            <strong>
                                                {r.item ? money(r.amount) : "—"}
                                            </strong>
                                        </td>
                                        <td data-label="Action">
                                            <button
                                                className="enterprise-inline-action"
                                                type="button"
                                                disabled={
                                                    !r.item || busy !== null
                                                }
                                                onClick={() => addLine(r)}
                                            >
                                                {busy === r.id
                                                    ? "Adding…"
                                                    : "Add to Cart"}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
                <div className="enterprise-fast-order__footer">
                    <button
                        className="enterprise-outline"
                        type="button"
                        onClick={() => setRows((r) => [...r, newLine()])}
                    >
                        <Icon name="plus" size={17} /> Add line
                    </button>
                    <div>
                        {/* <small>
                            Indicative total ·{" "}
                            {pricedRows.filter((r) => r.item).length} lines
                        </small> */}
                        <strong>{money(estimate)}</strong>
                        <button
                            className="enterprise-primary"
                            type="button"
                            disabled={
                                busy !== null || !rows.some((r) => r.item)
                            }
                            onClick={addAll}
                        >
                            Add selected lines to basket{" "}
                            <Icon name="arrow" size={16} />
                        </button>
                    </div>
                </div>
                {notice && (
                    <p className="enterprise-notice" role="status">
                        {notice}
                    </p>
                )}
                <p className="enterprise-smallprint">
                    Bulk purchase orders and PDF invoices remain managed by
                    existing order and invoice workflows. This pad adds items to
                    your standard basket.
                </p>
            </div>
        </Layout>
    );
}
