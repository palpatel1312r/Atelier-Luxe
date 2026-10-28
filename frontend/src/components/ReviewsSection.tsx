import { useEffect, useState, useCallback } from "react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { formatDate } from "../lib/format";
import ConfirmDialog from "./ConfirmDialog";

interface Review {
  id: number;
  product_id: number;
  user_id: number;
  user_name: string;
  rating: number;
  title: string;
  body: string;
  approved: boolean;
  verified_purchase: boolean;
  created_at: string;
  updated_at?: string;
}

interface Summary {
  average: number;
  count: number;
  distribution: Record<string, number>;
}

interface ReviewsSectionProps {
  productId: number;
}

const SORTS = [
  { value: "newest", label: "Most recent" },
  { value: "highest", label: "Highest rated" },
  { value: "lowest", label: "Lowest rated" },
];

export default function ReviewsSection({ productId }: ReviewsSectionProps) {
  const { user } = useAuth();
  const toast = useToast();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [myReview, setMyReview] = useState<Review | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getProductReviews(productId, {
        sort,
        page,
        per_page: 5,
      });
      setReviews(data.items || []);
      setSummary(data.summary || null);
      setTotalPages(data.total_pages || 1);
    } catch (err: any) {
      toast.error(err.message || "Failed to load reviews");
    } finally {
      setLoading(false);
    }
  }, [productId, sort, page, toast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!user) {
      setMyReview(null);
      return;
    }
    api
      .getMyReview(productId)
      .then(setMyReview)
      .catch(() => setMyReview(null));
  }, [user, productId]);

  const handleDelete = async () => {
    if (!myReview) return;
    try {
      await api.deleteReview(myReview.id);
      setMyReview(null);
      setConfirmDelete(false);
      toast.success("Review deleted.");
      load();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete review");
    }
  };

  const canReview = !!user && !myReview;

  return (
    <section className="mt-16 sm:mt-24">
      <div className="border-t border-stone-200 pt-12">
        <h2 className="text-2xl font-light text-stone-800 mb-2">Reviews</h2>

        {/* Summary */}
        {summary && summary.count > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 my-8">
            <div className="text-center sm:text-left">
              <p className="text-5xl font-light text-stone-800">
                {summary.average.toFixed(1)}
              </p>
              <StarRow value={summary.average} size="md" />
              <p className="text-sm text-stone-500 mt-1">
                {summary.count} {summary.count === 1 ? "review" : "reviews"}
              </p>
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              {[5, 4, 3, 2, 1].map((r) => {
                const count = summary.distribution[String(r)] || 0;
                const pct =
                  summary.count > 0 ? (count / summary.count) * 100 : 0;
                return (
                  <div key={r} className="flex items-center gap-3 text-sm">
                    <span className="w-6 text-stone-500">{r}★</span>
                    <div className="flex-1 h-2 bg-stone-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-800"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-8 text-right text-xs text-stone-400">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* CTA / own review */}
        <div className="my-8">
          {!user && (
            <p className="text-sm text-stone-500">
              <a href="/login" className="text-amber-800 underline">
                Sign in
              </a>{" "}
              to write a review.
            </p>
          )}

          {canReview && !showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="bg-stone-800 text-white px-6 py-3 text-sm tracking-[0.15em] uppercase hover:bg-amber-900 transition-colors"
            >
              Write a review
            </button>
          )}

          {user && !myReview && !showForm && (
            <p className="text-xs text-stone-400 mt-3">
              Only customers who purchased this product can review it.
            </p>
          )}

          {myReview && (
            <div className="border border-stone-200 rounded-lg bg-white p-5">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <p className="text-xs tracking-wider uppercase text-amber-800 mb-1">
                    Your review
                  </p>
                  <StarRow value={myReview.rating} size="sm" />
                </div>
                <div className="flex gap-3 text-xs">
                  <button
                    onClick={() => setShowForm(true)}
                    className="text-stone-600 hover:text-amber-800 uppercase tracking-wider"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="text-red-600 hover:text-red-700 uppercase tracking-wider"
                  >
                    Delete
                  </button>
                </div>
              </div>
              {myReview.title && (
                <p className="text-stone-800 font-medium text-sm mb-1">
                  {myReview.title}
                </p>
              )}
              <p className="text-sm text-stone-600 whitespace-pre-line">
                {myReview.body}
              </p>
            </div>
          )}

          {(showForm || (myReview && showForm)) && user && (
            <ReviewForm
              productId={productId}
              existing={myReview}
              onCancel={() => setShowForm(false)}
              onSaved={() => {
                setShowForm(false);
                load();
                api
                  .getMyReview(productId)
                  .then(setMyReview)
                  .catch(() => {});
              }}
            />
          )}
        </div>

        {/* Sort */}
        {summary && summary.count > 0 && (
          <div className="flex items-center justify-between gap-4 mb-6">
            <p className="text-sm text-stone-500">
              {summary.count} {summary.count === 1 ? "review" : "reviews"}
            </p>
            <select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                setPage(1);
              }}
              className="border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-800/30"
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* List */}
        {loading && (
          <p className="text-stone-500 text-sm py-8">Loading reviews…</p>
        )}

        {!loading && reviews.length === 0 && (
          <p className="text-stone-500 text-sm py-8">
            No reviews yet. Be the first to review this product.
          </p>
        )}

        {!loading && reviews.length > 0 && (
          <ul className="space-y-6">
            {reviews.map((r) => (
              <li
                key={r.id}
                className="border-b border-stone-100 pb-6 last:border-0"
              >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm text-stone-800 font-medium">
                        {r.user_name}
                      </span>
                      {r.verified_purchase && (
                        <span className="text-[10px] tracking-wider uppercase bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full">
                          Verified purchase
                        </span>
                      )}
                    </div>
                    <div className="mt-1">
                      <StarRow value={r.rating} size="sm" />
                    </div>
                  </div>
                  <span className="text-xs text-stone-400 whitespace-nowrap">
                    {formatDate(r.created_at)}
                  </span>
                </div>
                {r.title && (
                  <p className="text-stone-800 font-medium text-sm mb-1">
                    {r.title}
                  </p>
                )}
                {r.body && (
                  <p className="text-sm text-stone-600 whitespace-pre-line">
                    {r.body}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 text-sm border border-stone-200 rounded disabled:opacity-40 hover:border-amber-800"
            >
              Prev
            </button>
            <span className="text-sm text-stone-600">
              {page} / {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 text-sm border border-stone-200 rounded disabled:opacity-40 hover:border-amber-800"
            >
              Next
            </button>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete your review?"
        message="This can't be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </section>
  );
}

/* ============================================================
   Star row (display)
   ============================================================ */
function StarRow({
  value,
  size = "md",
}: {
  value: number;
  size?: "sm" | "md";
}) {
  const cls = size === "sm" ? "h-3.5 w-3.5" : "h-5 w-5";
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          xmlns="http://www.w3.org/2000/svg"
          className={`${cls} ${
            i <= Math.round(value) ? "text-amber-800" : "text-stone-300"
          }`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.958a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.367 2.446a1 1 0 00-.363 1.118l1.287 3.957c.3.922-.755 1.688-1.54 1.118l-3.366-2.446a1 1 0 00-1.176 0l-3.366 2.446c-.784.57-1.838-.196-1.539-1.118l1.286-3.957a1 1 0 00-.363-1.118L2.075 9.385c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.951-.69l1.286-3.958z" />
        </svg>
      ))}
    </div>
  );
}

/* ============================================================
   Review form
   ============================================================ */
function ReviewForm({
  productId,
  existing,
  onCancel,
  onSaved,
}: {
  productId: number;
  existing: Review | null;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [rating, setRating] = useState(existing?.rating ?? 5);
  const [title, setTitle] = useState(existing?.title ?? "");
  const [body, setBody] = useState(existing?.body ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (existing) {
        await api.updateReview(existing.id, { rating, title, body });
        toast.success("Review updated.");
      } else {
        await api.createReview({
          product_id: productId,
          rating,
          title,
          body,
        });
        toast.success("Review posted. Thank you!");
      }
      onSaved();
    } catch (err: any) {
      setError(err.message || "Failed to save review");
      toast.error(err.message || "Failed to save review");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="border border-stone-200 rounded-lg bg-white p-6 space-y-5"
    >
      <h3 className="text-lg font-light text-stone-800">
        {existing ? "Edit your review" : "Write a review"}
      </h3>

      {/* Star picker */}
      <div>
        <label className="block text-sm text-stone-700 mb-2">
          Your rating *
        </label>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => setRating(i)}
              aria-label={`${i} star${i > 1 ? "s" : ""}`}
              className="p-0.5"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`h-7 w-7 transition-colors ${
                  i <= rating
                    ? "text-amber-800"
                    : "text-stone-300 hover:text-amber-400"
                }`}
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.958a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.367 2.446a1 1 0 00-.363 1.118l1.287 3.957c.3.922-.755 1.688-1.54 1.118l-3.366-2.446a1 1 0 00-1.176 0l-3.366 2.446c-.784.57-1.838-.196-1.539-1.118l1.286-3.957a1 1 0 00-.363-1.118L2.075 9.385c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.951-.69l1.286-3.958z" />
              </svg>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm text-stone-700 mb-1">
          Title (optional)
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          className="w-full px-4 py-3 border border-stone-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-amber-800/30 focus:border-amber-800"
        />
      </div>

      <div>
        <label className="block text-sm text-stone-700 mb-1">
          Your review (optional)
        </label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={5}
          maxLength={2000}
          className="w-full px-4 py-3 border border-stone-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-amber-800/30 focus:border-amber-800"
        />
        <p className="text-xs text-stone-400 mt-1">{body.length} / 2000</p>
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="bg-stone-800 text-white px-6 py-3 text-sm tracking-[0.15em] uppercase hover:bg-amber-900 disabled:bg-stone-400 transition-colors"
        >
          {saving ? "Saving…" : existing ? "Update review" : "Post review"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-stone-600 px-4 py-3 text-sm tracking-[0.15em] uppercase hover:text-stone-900"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
