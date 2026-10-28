import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AdminLayout from "../../components/AdminLayout";
import api from "../../api/client";
import "../../styles/admin-common.css";

const INDIAN_STATES = [
    "Andhra Pradesh",
    "Arunachal Pradesh",
    "Assam",
    "Bihar",
    "Chhattisgarh",
    "Goa",
    "Gujarat",
    "Haryana",
    "Himachal Pradesh",
    "Jharkhand",
    "Karnataka",
    "Kerala",
    "Madhya Pradesh",
    "Maharashtra",
    "Manipur",
    "Meghalaya",
    "Mizoram",
    "Nagaland",
    "Odisha",
    "Punjab",
    "Rajasthan",
    "Sikkim",
    "Tamil Nadu",
    "Telangana",
    "Tripura",
    "Uttar Pradesh",
    "Uttarakhand",
    "West Bengal",
    "Andaman and Nicobar Islands",
    "Chandigarh",
    "Dadra and Nagar Haveli and Daman and Diu",
    "Delhi",
    "Jammu and Kashmir",
    "Ladakh",
    "Lakshadweep",
    "Puducherry",
];

function StateSelect({ value, onChange }) {
    const [open, setOpen] = useState(false);
    const [q, setQ] = useState(value || "");

    useEffect(() => {
        setQ(value || "");
    }, [value]);

    const filtered = INDIAN_STATES.filter((s) =>
        s.toLowerCase().includes(q.toLowerCase()),
    );

    const select = (state) => {
        setQ(state);
        onChange(state);
        setOpen(false);
    };

    return (
        <div style={{ position: "relative" }}>
            <input
                type="text"
                value={q}
                onChange={(e) => {
                    setQ(e.target.value);
                    setOpen(true);
                    onChange(e.target.value);
                }}
                onFocus={() => setOpen(true)}
                onBlur={() => setTimeout(() => setOpen(false), 150)}
                placeholder="Type or select state"
                style={{ width: "100%" }}
            />
            {open && filtered.length > 0 && (
                <div
                    style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        right: 0,
                        background: "#fff",
                        border: "1px solid #dadfd6",
                        borderRadius: 8,
                        zIndex: 50,
                        maxHeight: 200,
                        overflowY: "auto",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
                        marginTop: 4,
                    }}
                >
                    {filtered.map((s) => (
                        <div
                            key={s}
                            style={{
                                padding: "10px 12px",
                                cursor: "pointer",
                                borderBottom: "1px solid #e8ebe4",
                            }}
                            onMouseDown={() => select(s)}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = "#f4f5f1";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = "#fff";
                            }}
                        >
                            {s}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function AdminSellerForm() {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditing = Boolean(id);

    const [groups, setGroups] = useState([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const [form, setForm] = useState({
        name: "",
        email: "",
        phone: "",
        company_name: "",
        gst_number: "",
        address: "",
        city: "",
        state: "",
        pincode: "",
        group_id: "",
        credit_limit: "0",
        is_active: true,
    });

    useEffect(() => {
        api.get("/admin/groups").then(({ data }) => setGroups(data.data));
    }, []);

    useEffect(() => {
        if (id) {
            api.get(`/admin/sellers/${id}`).then(({ data }) => {
                const s = data.data;
                setForm({
                    name: s.name || "",
                    email: s.email || "",
                    phone: s.phone || "",
                    company_name: s.company_name || "",
                    gst_number: s.gst_number || "",
                    address: s.address || "",
                    city: s.city || "",
                    state: s.state || "",
                    pincode: s.pincode || "",
                    group_id: s.group_id || "",
                    credit_limit: s.credit_limit || "0",
                    is_active: s.is_active !== false,
                });
            });
        }
    }, [id]);

    const update = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const toggleActive = () => {
        setForm({ ...form, is_active: !form.is_active });
    };

    const submit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError("");

        try {
            if (isEditing) {
                await api.put(`/admin/sellers/${id}`, form);
                alert("Seller updated successfully!");
            } else {
                await api.post("/admin/sellers", form);
                alert("Seller created successfully!");
            }
            navigate("/admin/sellers");
        } catch (err) {
            setError(err.response?.data?.message || "Could not save seller.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <AdminLayout>
            <h1 className="admin-page__title">
                {isEditing ? "Edit Seller" : "Add New Seller"}
            </h1>

            <form className="admin-card" onSubmit={submit}>
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 16,
                    }}
                >
                    <h3 style={{ margin: 0, fontSize: 16 }}>
                        {isEditing
                            ? "Update Seller Details"
                            : "Create New Seller"}
                    </h3>
                    <button
                        type="button"
                        className="admin-btn admin-btn--outline admin-btn--sm"
                        onClick={() => navigate("/admin/sellers")}
                    >
                        ← Back to List
                    </button>
                </div>

                <div className="admin-form-grid">
                    <div className="admin-form-row">
                        <label>Full Name *</label>
                        <input
                            type="text"
                            name="name"
                            placeholder="Enter full name"
                            maxLength={100}
                            value={form.name}
                            onChange={update}
                            required
                        />
                    </div>

                    <div className="admin-form-row">
                        <label>Email *</label>
                        <input
                            type="email"
                            name="email"
                            placeholder="Enter email address"
                            maxLength={100}
                            value={form.email}
                            onChange={update}
                            required
                        />
                    </div>

                    <div className="admin-form-row">
                        <label>Phone *</label>
                        <input
                            type="text"
                            name="phone"
                            placeholder="Enter phone number"
                            maxLength={10}
                            value={form.phone}
                            onChange={update}
                            required
                        />
                    </div>

                    <div className="admin-form-row">
                        <label>Company Name</label>
                        <input
                            type="text"
                            name="company_name"
                            placeholder="Enter company name"
                            maxLength={100}
                            value={form.company_name}
                            onChange={update}
                        />
                    </div>

                    <div className="admin-form-row">
                        <label>GST Number</label>
                        <input
                            type="text"
                            name="gst_number"
                            placeholder="Enter GST number"
                            maxLength={15}
                            value={form.gst_number}
                            onChange={update}
                        />
                    </div>

                    <div className="admin-form-row">
                        <label>Group</label>
                        <select
                            name="group_id"
                            placeholder="Select a group"
                            value={form.group_id}
                            onChange={update}
                        >
                            <option value="">No Group</option>
                            {groups.map((g) => (
                                <option key={g.id} value={g.id}>
                                    {g.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="admin-form-row">
                        <label>Credit Limit</label>
                        <input
                            type="number"
                            name="credit_limit"
                            value={form.credit_limit}
                            onChange={update}
                            min="0"
                        />
                    </div>

                    <div className="admin-form-row">
                        <label>Address</label>
                        <input
                            type="text"
                            name="address"
                            placeholder="Enter address"
                            maxLength={200}
                            value={form.address}
                            onChange={update}
                        />
                    </div>

                    <div className="admin-form-row">
                        <label>City</label>
                        <input
                            type="text"
                            name="city"
                            placeholder="Enter city"
                            value={form.city}
                            onChange={update}
                            maxLength={100}
                        />
                    </div>

                    <div className="admin-form-row">
                        <label>State</label>
                        <StateSelect
                            value={form.state}
                            onChange={(val) => setForm({ ...form, state: val })}
                        />
                    </div>

                    <div className="admin-form-row">
                        <label>Pincode</label>
                        <input
                            type="text"
                            name="pincode"
                            placeholder="Enter pincode"
                            maxLength={6}
                            value={form.pincode}
                            onChange={update}
                        />
                    </div>
                </div>

                <div className="admin-form-row" style={{ marginTop: 12 }}>
                    <label
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            cursor: "pointer",
                        }}
                    >
                        <input
                            type="checkbox"
                            checked={form.is_active}
                            onChange={toggleActive}
                        />
                        Account Active
                    </label>
                </div>

                {error && (
                    <p className="admin-message admin-message--error">
                        {error}
                    </p>
                )}

                <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                    <button
                        className="admin-btn"
                        type="submit"
                        disabled={saving}
                    >
                        {saving
                            ? "Saving…"
                            : isEditing
                              ? "Update Seller"
                              : "Create Seller"}
                    </button>
                    <button
                        className="admin-btn admin-btn--outline"
                        type="button"
                        onClick={() => navigate("/admin/sellers")}
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </AdminLayout>
    );
}
