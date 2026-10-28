import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { formatDate } from "../lib/format";
import ConfirmDialog from "./ConfirmDialog";

type Tab = "account" | "security" | "addresses";

interface Address {
  label?: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  zip?: string;
  country: string;
  phone?: string;
  is_default?: boolean;
}

const emptyAddress: Address = {
  label: "Home",
  line1: "",
  line2: "",
  city: "",
  state: "",
  zip: "",
  country: "",
  phone: "",
  is_default: false,
};

const inputClass =
  "w-full px-4 py-3 border border-stone-200 rounded-md text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-800/30 focus:border-amber-800 transition-colors";

export default function Profile() {
  const { user, refresh, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const tab: Tab = useMemo(() => {
    const t = searchParams.get("tab");
    if (t === "security" || t === "addresses") return t;
    return "account";
  }, [searchParams]);

  const setTab = (next: Tab) => {
    setSearchParams(next === "account" ? {} : { tab: next });
  };

  if (!user) return null; // RequireAuth handles this

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      <div className="mb-8">
        <p className="text-xs tracking-[0.3em] text-amber-800 uppercase mb-2">
          My Account
        </p>
        <h1 className="text-3xl sm:text-4xl font-light text-stone-800">
          Profile Settings
        </h1>
      </div>

      {/* Tabs */}
      <div className="border-b border-stone-200 mb-8">
        <nav className="flex gap-6 -mb-px">
          {(["account", "security", "addresses"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`pb-3 text-sm tracking-wider uppercase transition-colors border-b-2 ${
                tab === t
                  ? "border-amber-800 text-amber-800"
                  : "border-transparent text-stone-500 hover:text-stone-800"
              }`}
            >
              {t === "account"
                ? "Account"
                : t === "security"
                  ? "Security"
                  : "Addresses"}
            </button>
          ))}
        </nav>
      </div>

      {tab === "account" && <AccountTab />}
      {tab === "security" && <SecurityTab />}
      {tab === "addresses" && <AddressesTab />}
    </div>
  );
}

/* ============================================================
   ACCOUNT
   ============================================================ */
function AccountTab() {
  const { user, refresh } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmLogout, setConfirmLogout] = useState(false);

  useEffect(() => {
    setName(user?.name ?? "");
    setPhone(user?.phone ?? "");
  }, [user?.name, user?.phone]);

  const initial = (user?.name ?? user?.email ?? "?")[0].toUpperCase();
  const dirty = name !== (user?.name ?? "") || phone !== (user?.phone ?? "");

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Name is required";
    if (name.trim().length > 120) e.name = "Name is too long";
    if (phone && phone.length > 40) e.phone = "Phone is too long";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      await api.updateProfile({ name: name.trim(), phone: phone.trim() });
      await refresh();
      toast.success("Profile updated.");
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile.");
      setErrors({ form: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-5">
        <div className="w-16 h-16 rounded-full bg-amber-800 text-white text-2xl flex items-center justify-center font-light">
          {initial}
        </div>
        <div>
          <p className="text-lg text-stone-800">{user?.name}</p>
          <p className="text-sm text-stone-500">{user?.email}</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-5 max-w-lg">
        <div>
          <label className="block text-sm text-stone-700 mb-1">Name *</label>
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name) setErrors((p) => ({ ...p, name: "" }));
            }}
            className={inputClass}
          />
          {errors.name && (
            <p className="text-red-500 text-xs mt-1">{errors.name}</p>
          )}
        </div>

        <div>
          <label className="block text-sm text-stone-700 mb-1">Email</label>
          <input
            value={user?.email ?? ""}
            disabled
            className={`${inputClass} bg-stone-50 text-stone-500 cursor-not-allowed`}
          />
          <p className="text-xs text-stone-400 mt-1">
            Email cannot be changed here. Contact support.
          </p>
        </div>

        <div>
          <label className="block text-sm text-stone-700 mb-1">Phone</label>
          <input
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              if (errors.phone) setErrors((p) => ({ ...p, phone: "" }));
            }}
            placeholder="+1 555 123 4567"
            className={inputClass}
          />
          {errors.phone && (
            <p className="text-red-500 text-xs mt-1">{errors.phone}</p>
          )}
        </div>

        {errors.form && <p className="text-red-600 text-sm">{errors.form}</p>}

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={saving || !dirty}
            className="bg-stone-800 text-white px-6 py-3 text-sm tracking-[0.15em] uppercase hover:bg-amber-900 disabled:bg-stone-400 transition-colors"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
          {dirty && (
            <button
              type="button"
              onClick={() => {
                setName(user?.name ?? "");
                setPhone(user?.phone ?? "");
                setErrors({});
              }}
              className="text-stone-600 px-4 py-3 text-sm tracking-[0.15em] uppercase hover:text-stone-900"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* Danger zone */}
      <div className="border-t border-stone-200 pt-8">
        <h3 className="text-sm tracking-wider uppercase text-stone-500 mb-3">
          Danger Zone
        </h3>
        <div className="flex items-center justify-between gap-4 border border-red-200 bg-red-50/50 rounded-lg p-4">
          <div>
            <p className="text-sm text-stone-800">Sign out of this device</p>
            <p className="text-xs text-stone-500 mt-0.5">
              You'll need to log in again to access your account.
            </p>
          </div>
          <button
            onClick={() => setConfirmLogout(true)}
            className="text-sm tracking-wider uppercase text-red-600 hover:text-red-700 whitespace-nowrap"
          >
            Sign out
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmLogout}
        title="Sign out?"
        message="You'll need to log in again to access your account."
        confirmLabel="Sign out"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={() => {
          setConfirmLogout(false);
          logout();
          navigate("/");
        }}
        onCancel={() => setConfirmLogout(false)}
      />
    </div>
  );
}

/* ============================================================
   SECURITY — change password
   ============================================================ */
function SecurityTab() {
  const toast = useToast();
  const { refresh } = useAuth();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!currentPassword) e.current = "Enter your current password";
    if (!newPassword) e.next = "Enter a new password";
    else if (newPassword.length < 6)
      e.next = "Password must be at least 6 characters";
    else if (newPassword === currentPassword)
      e.next = "New password must be different";
    if (!confirmPassword) e.confirm = "Confirm your new password";
    else if (confirmPassword !== newPassword)
      e.confirm = "Passwords do not match";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await api.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
        password_confirmation: confirmPassword,
      });
      toast.success("Password updated.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setErrors({});
      // Nothing else to refresh — token is still valid.
      void refresh;
    } catch (err: any) {
      const msg = err.message || "Failed to update password";
      if (/current password/i.test(msg)) setErrors({ current: msg });
      else setErrors({ form: msg });
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg">
      <h2 className="text-lg font-light text-stone-800 mb-2">
        Change Password
      </h2>
      <p className="text-sm text-stone-500 mb-6">
        Use a strong password of at least 6 characters.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm text-stone-700 mb-1">
            Current password *
          </label>
          <input
            type={showPassword ? "text" : "password"}
            value={currentPassword}
            onChange={(e) => {
              setCurrentPassword(e.target.value);
              if (errors.current) setErrors((p) => ({ ...p, current: "" }));
            }}
            autoComplete="current-password"
            className={inputClass}
          />
          {errors.current && (
            <p className="text-red-500 text-xs mt-1">{errors.current}</p>
          )}
        </div>

        <div>
          <label className="block text-sm text-stone-700 mb-1">
            New password *
          </label>
          <input
            type={showPassword ? "text" : "password"}
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value);
              if (errors.next) setErrors((p) => ({ ...p, next: "" }));
            }}
            autoComplete="new-password"
            className={inputClass}
          />
          {errors.next && (
            <p className="text-red-500 text-xs mt-1">{errors.next}</p>
          )}
        </div>

        <div>
          <label className="block text-sm text-stone-700 mb-1">
            Confirm new password *
          </label>
          <input
            type={showPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (errors.confirm) setErrors((p) => ({ ...p, confirm: "" }));
            }}
            autoComplete="new-password"
            className={inputClass}
          />
          {errors.confirm && (
            <p className="text-red-500 text-xs mt-1">{errors.confirm}</p>
          )}
        </div>

        <label className="flex items-center gap-2 text-sm text-stone-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showPassword}
            onChange={(e) => setShowPassword(e.target.checked)}
            className="accent-amber-800"
          />
          Show passwords
        </label>

        {errors.form && <p className="text-red-600 text-sm">{errors.form}</p>}

        <div className="pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="bg-stone-800 text-white px-6 py-3 text-sm tracking-[0.15em] uppercase hover:bg-amber-900 disabled:bg-stone-400 transition-colors"
          >
            {submitting ? "Updating..." : "Update Password"}
          </button>
        </div>
      </form>

      <div className="mt-10 pt-6 border-t border-stone-200">
        <h3 className="text-sm tracking-wider uppercase text-stone-500 mb-2">
          Forgot your current password?
        </h3>
        <p className="text-sm text-stone-500 mb-3">
          Sign out and use the "Forgot password" link on the login page to reset
          it by email.
        </p>
        <Link
          to="/forgot-password"
          className="text-sm text-amber-800 hover:text-amber-900 tracking-wider uppercase"
        >
          Reset by email →
        </Link>
      </div>
    </div>
  );
}

/* ============================================================
   ADDRESSES
   ============================================================ */
function AddressesTab() {
  const { user, refresh } = useAuth();
  const toast = useToast();

  const [addresses, setAddresses] = useState<Address[]>(
    Array.isArray(user?.addresses) ? (user!.addresses as Address[]) : [],
  );
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState<Address>(emptyAddress);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  useEffect(() => {
    setAddresses(
      Array.isArray(user?.addresses) ? (user!.addresses as Address[]) : [],
    );
  }, [user?.addresses]);

  const startAdd = () => {
    setDraft({ ...emptyAddress, is_default: addresses.length === 0 });
    setEditingIndex(-1);
  };

  const startEdit = (i: number) => {
    setDraft({ ...addresses[i] });
    setEditingIndex(i);
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setDraft(emptyAddress);
  };

  const persist = async (next: Address[]) => {
    setSaving(true);
    try {
      await api.updateProfile({ addresses: next });
      await refresh();
      setAddresses(next);
      toast.success("Addresses updated.");
      return true;
    } catch (err: any) {
      toast.error(err.message || "Failed to save address.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const saveDraft = async () => {
    if (!draft.line1.trim() || !draft.city.trim() || !draft.country.trim()) {
      toast.error("Street, city, and country are required.");
      return;
    }
    const next = [...addresses];
    // If marking this as default, unset others
    const cleaned = draft.is_default
      ? next.map((a) => ({ ...a, is_default: false }))
      : next;
    if (editingIndex === -1) cleaned.push(draft);
    else if (editingIndex != null) cleaned[editingIndex] = draft;
    // Ensure at least one default exists
    if (cleaned.length > 0 && !cleaned.some((a) => a.is_default)) {
      cleaned[0].is_default = true;
    }
    const ok = await persist(cleaned);
    if (ok) cancelEdit();
  };

  const removeAddress = async (i: number) => {
    const next = addresses.filter((_, idx) => idx !== i);
    if (next.length > 0 && !next.some((a) => a.is_default))
      next[0].is_default = true;
    const ok = await persist(next);
    if (ok) setConfirmDelete(null);
  };

  const setDefault = async (i: number) => {
    const next = addresses.map((a, idx) => ({ ...a, is_default: idx === i }));
    await persist(next);
  };

  const isEditing = editingIndex !== null;

  return (
    <div className="space-y-6">
      {!isEditing && (
        <>
          {addresses.length === 0 ? (
            <div className="border border-stone-200 rounded-lg bg-white p-10 text-center">
              <p className="text-stone-600 mb-4">No saved addresses yet.</p>
              <button
                onClick={startAdd}
                className="bg-stone-800 text-white px-6 py-3 text-sm tracking-[0.15em] uppercase hover:bg-amber-900 transition-colors"
              >
                Add Address
              </button>
            </div>
          ) : (
            <>
              <div className="flex justify-end">
                <button
                  onClick={startAdd}
                  className="bg-stone-800 text-white px-5 py-2.5 text-sm tracking-[0.15em] uppercase hover:bg-amber-900 transition-colors"
                >
                  + Add Address
                </button>
              </div>
              <ul className="space-y-3">
                {addresses.map((a, i) => (
                  <li
                    key={i}
                    className="border border-stone-200 rounded-lg bg-white p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="text-sm text-stone-700 leading-relaxed">
                        <div className="flex items-center gap-2 mb-1">
                          {a.label && (
                            <span className="text-xs tracking-wider uppercase text-amber-800">
                              {a.label}
                            </span>
                          )}
                          {a.is_default && (
                            <span className="text-[10px] tracking-wider uppercase bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                              Default
                            </span>
                          )}
                        </div>
                        <p>
                          {a.line1}
                          {a.line2 ? `, ${a.line2}` : ""}
                        </p>
                        <p>
                          {[a.city, a.state, a.zip].filter(Boolean).join(", ")}
                        </p>
                        <p>{a.country}</p>
                        {a.phone && (
                          <p className="text-stone-500 mt-1">{a.phone}</p>
                        )}
                      </div>
                      <div className="flex flex-col gap-2 text-sm">
                        {!a.is_default && (
                          <button
                            onClick={() => setDefault(i)}
                            disabled={saving}
                            className="text-stone-600 hover:text-amber-800 transition-colors text-left"
                          >
                            Set default
                          </button>
                        )}
                        <button
                          onClick={() => startEdit(i)}
                          className="text-stone-600 hover:text-amber-800 transition-colors text-left"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setConfirmDelete(i)}
                          className="text-red-600 hover:text-red-700 transition-colors text-left"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}

      {isEditing && (
        <div className="border border-stone-200 rounded-lg bg-white p-6 space-y-4">
          <h3 className="text-lg font-light text-stone-800 mb-2">
            {editingIndex === -1 ? "New Address" : "Edit Address"}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm text-stone-700 mb-1">Label</label>
              <input
                value={draft.label ?? ""}
                onChange={(e) => setDraft({ ...draft, label: e.target.value })}
                placeholder="Home, Work, ..."
                className={inputClass}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm text-stone-700 mb-1">
                Street address *
              </label>
              <input
                value={draft.line1}
                onChange={(e) => setDraft({ ...draft, line1: e.target.value })}
                className={inputClass}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm text-stone-700 mb-1">
                Apartment, suite, etc.
              </label>
              <input
                value={draft.line2 ?? ""}
                onChange={(e) => setDraft({ ...draft, line2: e.target.value })}
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-sm text-stone-700 mb-1">
                City *
              </label>
              <input
                value={draft.city}
                onChange={(e) => setDraft({ ...draft, city: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm text-stone-700 mb-1">
                State / Province
              </label>
              <input
                value={draft.state ?? ""}
                onChange={(e) => setDraft({ ...draft, state: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm text-stone-700 mb-1">
                ZIP / Postal code
              </label>
              <input
                value={draft.zip ?? ""}
                onChange={(e) => setDraft({ ...draft, zip: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm text-stone-700 mb-1">
                Country *
              </label>
              <input
                value={draft.country}
                onChange={(e) =>
                  setDraft({ ...draft, country: e.target.value })
                }
                className={inputClass}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm text-stone-700 mb-1">Phone</label>
              <input
                value={draft.phone ?? ""}
                onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-stone-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={!!draft.is_default}
              onChange={(e) =>
                setDraft({ ...draft, is_default: e.target.checked })
              }
              className="accent-amber-800"
            />
            Set as default shipping address
          </label>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={saveDraft}
              disabled={saving}
              className="bg-stone-800 text-white px-6 py-3 text-sm tracking-[0.15em] uppercase hover:bg-amber-900 disabled:bg-stone-400 transition-colors"
            >
              {saving ? "Saving..." : "Save Address"}
            </button>
            <button
              onClick={cancelEdit}
              disabled={saving}
              className="text-stone-600 px-4 py-3 text-sm tracking-[0.15em] uppercase hover:text-stone-900"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete !== null}
        title="Delete this address?"
        message="This can't be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => confirmDelete !== null && removeAddress(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
