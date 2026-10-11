import { useEffect, useState, useCallback } from 'react';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import Modal from './Modal.jsx';
import StarRating from './StarRating.jsx';

const STATUS_BADGE = {
  PENDING: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-[#E5F9F1] text-[#00A866]',
  REJECTED: 'bg-slate-100 text-slate-500',
};

const CATEGORIES = [
  'TOKEN_GENERATION', 'QUEUE_TRACKING', 'LIVE_BOARD', 'WAIT_TIME',
  'MOBILE_EXPERIENCE', 'NOTIFICATIONS', 'STAFF_EXPERIENCE', 'DEPARTMENT_SELECTION',
  'SERVICE_INFORMATION', 'EMERGENCY_HELP', 'ACCESSIBILITY', 'PERFORMANCE',
  'APPOINTMENTS', 'GENERAL',
];

function fmtCategory(cat) {
  return cat ? String(cat).toLowerCase().replace(/_/g, ' ') : '';
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const t = new Date(dateStr.includes('T') ? dateStr : `${dateStr.replace(' ', 'T')}Z`).getTime();
  const diff = Math.floor((Date.now() - t) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(t).toLocaleDateString();
}

function ReviewCard({ r, moderatable, onAction, onEdit, ownerKey }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border bg-white p-3.5 shadow-card" style={{ borderColor: '#E1EAF2' }}>
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold" style={{ backgroundColor: '#E6F3F9', color: '#075A9F' }}>
          {(r.reviewer_name || 'A').charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold" style={{ color: '#102A43' }}>{r.reviewer_name || 'Anonymous'}</p>
          <p className="text-[11px]" style={{ color: '#6B8198' }}>{timeAgo(r.created_at)}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <StarRating value={r.rating} size="text-base" />
        {r.department_name && <span className="chip bg-[#F5F9FC] text-[#102A43]">{r.department_name}</span>}
        {r.category && <span className="chip bg-[#F5F9FC]" style={{ color: '#1599C5' }}>{fmtCategory(r.category)}</span>}
                {r.request && (
          <span className="chip w-full" style={{ backgroundColor: '#F5F9FC', color: '#075A9F' }}>
            💡 {r.request}
          </span>
        )}
      </div>

      <p className="text-sm" style={{ color: '#102A43' }}>“{r.comment}”</p>

      {moderatable && (
        <div className="mt-1 flex flex-wrap items-center gap-2 border-t pt-2" style={{ borderColor: '#E1EAF2' }}>
          <span className={`badge ${STATUS_BADGE[r.status] || ''}`}>{r.status}</span>
          {r.status !== 'APPROVED' && (
            <button className="btn-success !px-2.5 !py-1 text-xs" onClick={() => onAction(r.id, 'APPROVED')}>Approve</button>
          )}
          {r.status !== 'REJECTED' && (
            <button className="btn-warning !px-2.5 !py-1 text-xs" onClick={() => onAction(r.id, 'REJECTED')}>Reject</button>
          )}
          <button className="btn-danger !px-2.5 !py-1 text-xs" onClick={() => onAction(r.id, 'DELETE')}>Delete</button>
        </div>
      )}

      {!moderatable && ownerKey && (
        <div className="flex justify-end gap-2 border-t pt-2" style={{ borderColor: '#E1EAF2' }}>
          <button className="btn-secondary !px-2.5 !py-1 text-xs" onClick={() => onEdit(r)}>Edit</button>
          <button className="btn-danger !px-2.5 !py-1 text-xs" onClick={() => onAction(r.id)}>Delete</button>
        </div>
      )}
    </div>
  );
}

const REVIEW_KEYS_STORAGE = 'kims_review_owner_keys_v1';

function readReviewOwnerKeys() {
  try {
    const stored = JSON.parse(localStorage.getItem(REVIEW_KEYS_STORAGE) || '{}');
    if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return {};
    return Object.fromEntries(Object.entries(stored).filter(([, key]) => typeof key === 'string'));
  } catch {
    return {};
  }
}

export default function ReviewsPanel({ mode = 'public' }) {
  const { user, token } = useAuth();
  const toast = useToast();
  const moderatable = mode === 'moderate';

  const [departments, setDepartments] = useState([]);
  const [summary, setSummary] = useState({ average: 0, count: 0, demoCount: 0 });
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showCount, setShowCount] = useState(10);
  const [editingReview, setEditingReview] = useState(null);
  const [reviewOwnerKeys, setReviewOwnerKeys] = useState(readReviewOwnerKeys);

  const [formRating, setFormRating] = useState(0);
  const [formName, setFormName] = useState(user?.name || '');
  const [formDept, setFormDept] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formRequest, setFormRequest] = useState('');
  const [formComment, setFormComment] = useState('');

  // Filters (public + moderate)
  const [fRating, setFRating] = useState('');
  const [fCategory, setFCategory] = useState('');
  const [fQ, setFQ] = useState('');
  const [fSort, setFSort] = useState('newest');
  // Moderation-only
  const [fStatus, setFStatus] = useState('');
  const [fDept, setFDept] = useState('');
    const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    setShowCount(10);
    try {
      const depts = await api.departments().catch(() => ({ departments: [] }));
      setDepartments(depts.departments);
      const s = await api.reviewSummary().catch(() => ({ summary: { average: 0, count: 0 } }));
      setSummary(s.summary);
      const base = {
        rating: fRating || undefined,
        category: fCategory || undefined,
        q: fQ || undefined,
        sort: fSort,
      };
      if (moderatable) {
        const d = await api.reviewsAdmin(
          {
            ...base,
            status: fStatus || undefined,
            departmentId: fDept || undefined,
                      },
          token
        );
        setReviews(d.reviews);
      } else {
        const d = await api.reviews({ ...base, limit: 200 });
        setReviews(d.reviews);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [moderatable, token, fRating, fCategory, fQ, fSort, fStatus, fDept]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function submit(e) {
    e.preventDefault();
    if (formRating < 1 || formRating > 5) {
      toast.error('Please select a star rating');
      return;
    }
    if (!formComment.trim()) {
      toast.error('Please write your review');
      return;
    }
    try {
      const payload = {
        reviewerName: formName.trim() || undefined,
        rating: formRating,
        comment: formComment.trim(),
        departmentId: formDept || null,
        category: formCategory || null,
        request: formRequest.trim() || null,
      };
      const created = editingReview
        ? { review: await api.updateOwnReview(editingReview.id, payload, reviewOwnerKeys[editingReview.id]) }
        : await api.submitReview(payload, token);
      const { ownerKey, ...savedReview } = created.review || {};
      let ownerKeySaveFailed = false;
      if (ownerKey) {
        const nextKeys = { ...reviewOwnerKeys, [savedReview.id]: ownerKey };
        try {
          localStorage.setItem(REVIEW_KEYS_STORAGE, JSON.stringify(nextKeys));
          setReviewOwnerKeys(nextKeys);
        } catch {
          ownerKeySaveFailed = true;
        }
      }
      const nextReview = {
        ...savedReview,
        id: savedReview.id ?? Date.now(),
        reviewer_name: savedReview.reviewer_name || formName.trim() || 'Anonymous',
        rating: Number(savedReview.rating ?? formRating),
        comment: savedReview.comment || formComment.trim(),
        department_id: savedReview.department_id ?? (formDept || null),
        department_name: savedReview.department_name || departments.find((d) => String(d.id) === String(formDept))?.name || null,
        category: savedReview.category ?? (formCategory || null),
        request: savedReview.request ?? (formRequest.trim() || null),
        status: savedReview.status || 'APPROVED',
        created_at: savedReview.created_at || new Date().toISOString(),
      };
      setReviews((prev) => [nextReview, ...prev.filter((item) => item.id !== nextReview.id)]);
      toast.success(editingReview ? 'Your review was updated.' : 'Thank you! Your review is now published.');
      setShowForm(false);
      setEditingReview(null);
      setFormRating(0);
      setFormComment('');
      setFormCategory('');
      setFormRequest('');
      setFormName(user?.name || '');
      setFormDept('');
      refresh();
      if (ownerKeySaveFailed) {
        toast.error('Review posted, but this browser could not save its private edit key. You will not be able to edit or delete this review here.');
      }
    } catch (err) {
      toast.error(err.message);
    }
  }

  function startEditing(review) {
    setEditingReview(review);
    setFormRating(Number(review.rating));
    setFormName(review.reviewer_name || '');
    setFormDept(review.department_id ? String(review.department_id) : '');
    setFormCategory(review.category || '');
    setFormRequest(review.request || '');
    setFormComment(review.comment || '');
    setShowForm(true);
  }

  async function deleteOwnReview(id) {
    if (!window.confirm('Delete your review? This cannot be undone.')) return;
    try {
      await api.deleteOwnReview(id, reviewOwnerKeys[id]);
      const nextKeys = { ...reviewOwnerKeys };
      delete nextKeys[id];
      try {
        localStorage.setItem(REVIEW_KEYS_STORAGE, JSON.stringify(nextKeys));
      } catch {
        // The review is already deleted; a stale local key cannot access it.
      }
      setReviewOwnerKeys(nextKeys);
      setReviews((prev) => prev.filter((review) => review.id !== id));
      toast.success('Your review was deleted.');
      refresh();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function moderate(id, action) {
    try {
      if (action === 'DELETE') {
        await api.deleteReview(id, token);
        toast.success('Review deleted');
      } else {
        await api.reviewStatus(id, action, token);
        toast.success(`Review ${action.toLowerCase()}`);
      }
      refresh();
    } catch (e) {
      toast.error(e.message);
    }
  }

  const filtersActive = Boolean(fRating || fCategory || fQ || (moderatable && (fStatus || fDept)));

  function clearFilters() {
    setFRating(''); setFCategory(''); setFQ(''); setFSort('newest');
    setFStatus(''); setFDept('');
  }

  const visible = reviews.slice(0, showCount);

  const avg = summary.average || 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Summary */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#6B8198' }}>KIMS Queue Feedback</p>
            <p className="mt-1 text-3xl font-black" style={{ color: '#102A43' }}>{summary.count ? `${avg.toFixed(1)} / 5` : '—'}</p>
            <StarRating value={Math.round(avg)} size="text-lg" />
            <p className="mt-1 text-sm" style={{ color: '#6B8198' }}>
              {summary.count} {summary.count === 1 ? 'review' : 'reviews'}
            </p>
          </div>
          <span className="text-5xl" style={{ color: '#E1EAF2' }} aria-hidden="true">💬</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-1">
          {[5, 4, 3, 2, 1].map((s) => (
            <button
              key={s}
              type="button"
              className="rounded-lg px-2 py-1 text-xs font-semibold transition"
              style={{
                color: fRating === String(s) ? '#fff' : '#075A9F',
                backgroundColor: fRating === String(s) ? '#075A9F' : '#E6F3F9',
              }}
              onClick={() => setFRating(fRating === String(s) ? '' : String(s))}
              aria-pressed={fRating === String(s)}
            >
              {'★'.repeat(s)} ({summary.distribution?.[{ 5: 'five', 4: 'four', 3: 'three', 2: 'two', 1: 'one' }[s]] || 0})
            </button>
          ))}
        </div>
      </div>

      {/* Filters / search / sort */}
      <div className="card space-y-2">
        <input
          className="input"
          placeholder="Search reviews (try 'waiting', 'token', 'mobile')…"
          value={fQ}
          onChange={(e) => setFQ(e.target.value)}
          aria-label="Search reviews"
        />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <span className="input flex items-center" style={{ color: '#6B8198' }}>All reviews</span>
          <select className="input" value={fCategory} onChange={(e) => setFCategory(e.target.value)} aria-label="Filter by category">
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{fmtCategory(c)}</option>
            ))}
          </select>
          <select className="input" value={fSort} onChange={(e) => setFSort(e.target.value)} aria-label="Sort">
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="highest">Highest rating</option>
            <option value="lowest">Lowest rating</option>
          </select>
        </div>

        {moderatable && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <select className="input" value={fStatus} onChange={(e) => setFStatus(e.target.value)} aria-label="Filter by status">
              <option value="">All statuses</option>
              <option value="APPROVED">Approved</option>
              <option value="PENDING">Pending</option>
              <option value="REJECTED">Rejected</option>
            </select>
            <select className="input" value={fDept} onChange={(e) => setFDept(e.target.value)} aria-label="Filter by department">
              <option value="">All departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
                      </div>
        )}

        {filtersActive && (
          <div className="flex justify-end pt-1">
            <button type="button" className="btn-secondary !px-3 !py-1.5 text-xs" onClick={clearFilters}>
              ✕ Clear Filters
            </button>
          </div>
        )}
      </div>

      {!moderatable && (
        <button type="button" className="btn-primary w-full" onClick={() => setShowForm(true)}>✍️ Write a Review</button>
      )}
      <div className="flex flex-col gap-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2 rounded-xl border p-3.5" style={{ borderColor: '#E1EAF2' }}>
                <div className="skeleton" />
                <div className="skeleton w-2/3" />
                <div className="skeleton w-1/3" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="rounded-xl bg-[#FFF0F0] p-5 text-center text-sm" style={{ color: '#E50914' }}>
            <p className="mb-1 text-2xl" aria-hidden="true">⚠️</p>
            <p>Unable to load reviews.</p>
            <button className="btn-secondary mt-3 !py-1.5" onClick={refresh}>Try again</button>
          </div>
        ) : reviews.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center" style={{ borderColor: '#E1EAF2' }}>
            <p className="empty-icon" aria-hidden="true">💬</p>
            <p className="mt-3 text-sm font-medium" style={{ color: '#6B8198' }}>
              {filtersActive
                ? 'No reviews match your current filters.'
                : 'No reviews yet. Be the first to share your experience.'}
            </p>
            {filtersActive && (
              <button type="button" className="btn-secondary mt-3 !py-1.5" onClick={clearFilters}>Clear Filters</button>
            )}
          </div>
        ) : (
          <>
            {visible.map((r) => (
              <ReviewCard
                key={r.id}
                r={r}
                moderatable={moderatable}
                onAction={moderatable ? moderate : deleteOwnReview}
                onEdit={startEditing}
                ownerKey={!moderatable ? reviewOwnerKeys[r.id] : null}
              />
            ))}
            {reviews.length > showCount && (
              <div className="pt-1 text-center">
                <p className="text-xs" style={{ color: '#6B8198' }}>
                  Showing {Math.min(showCount, reviews.length)} of {reviews.length} reviews
                </p>
                <button type="button" className="btn-ghost mt-2 w-full !py-2.5" onClick={() => setShowCount(showCount + 10)}>
                  Load More Reviews
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {showForm && (
        <Modal labelledBy="review-form-title" onClose={() => { setShowForm(false); setEditingReview(null); }}>
          <form onSubmit={submit} className="space-y-4">
            <h3 id="review-form-title" className="mb-1 text-lg font-extrabold" style={{ color: '#102A43' }}>{editingReview ? 'Edit Your Review' : 'Write a Review'}</h3>

            <div>
              <span className="label" id="rating-label">Your rating</span>
              <StarRating value={formRating} onChange={setFormRating} />
            </div>

            <div>
              <label className="label" htmlFor="review-name">Name {user ? '' : '(optional)'}</label>
              <input id="review-name" className="input" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Your name" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="review-dept">Department (optional)</label>
                <select id="review-dept" className="input" value={formDept} onChange={(e) => setFormDept(e.target.value)}>
                  <option value="">Not specified</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="review-cat">Category (optional)</label>
                <select id="review-cat" className="input" value={formCategory} onChange={(e) => setFormCategory(e.target.value)}>
                  <option value="">General</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{fmtCategory(c)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="label" htmlFor="review-comment">Your review</label>
              <textarea id="review-comment" className="input min-h-24" rows={3} value={formComment} onChange={(e) => setFormComment(e.target.value)} placeholder="Share your experience with our queue system…" />
            </div>

            <div>
              <label className="label" htmlFor="review-request">Improvement request (optional)</label>
              <textarea id="review-request" className="input min-h-20" rows={2} value={formRequest} onChange={(e) => setFormRequest(e.target.value)} placeholder="Tell us what would make the queue better for you…" />
              <p className="field-hint">Your review will appear as soon as you submit it.</p>
            </div>

            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => { setShowForm(false); setEditingReview(null); }}>Cancel</button>
              <button type="submit" className="btn-primary">{editingReview ? 'Save Changes' : 'Submit Review'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}