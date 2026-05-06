import { useEffect, useState } from 'react';
import { api } from '../api';
import Stars from './Stars';
import Spinner from './Spinner';

const STATUS_LABEL = {
  pending: 'İncelemede — onaylandıktan sonra herkese görünecek.',
  approved: 'Yorumun yayında.',
  rejected: 'Yorumun reddedildi.',
};

function formatDate(value) {
  try {
    return new Date(value).toLocaleDateString('tr-TR', {
      day: '2-digit', month: 'long', year: 'numeric',
    });
  } catch {
    return '';
  }
}

const ProductReviews = ({ productId, initialAverage = 0, initialCount = 0 }) => {
  const [reviews, setReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(initialAverage);
  const [reviewCount, setReviewCount] = useState(initialCount);
  const [loading, setLoading] = useState(true);

  const [myReview, setMyReview] = useState(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [successNote, setSuccessNote] = useState('');

  const isLoggedIn = !!localStorage.getItem('token');

  const loadReviews = async () => {
    setLoading(true);
    try {
      const list = await api.get(`/api/products/${productId}/reviews`);
      setReviews(list);
      if (list.length) {
        const sum = list.reduce((s, r) => s + (Number(r.rating) || 0), 0);
        setAverageRating(Math.round((sum / list.length) * 10) / 10);
        setReviewCount(list.length);
      } else {
        setAverageRating(0);
        setReviewCount(0);
      }
    } catch {
      /* non-fatal */
    } finally {
      setLoading(false);
    }
  };

  const loadMine = async () => {
    if (!isLoggedIn) return;
    try {
      const mine = await api.get(`/api/products/${productId}/reviews/mine`);
      setMyReview(mine);
      setRating(mine.rating);
      setComment(mine.comment || '');
    } catch {
      setMyReview(null);
    }
  };

  useEffect(() => {
    loadReviews();
    loadMine();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSuccessNote('');
    if (rating < 1 || rating > 5) {
      setFormError('Lütfen 1 ile 5 arasında bir puan seç.');
      return;
    }
    setSubmitting(true);
    try {
      const saved = await api.post(`/api/products/${productId}/reviews`, { rating, comment });
      setMyReview(saved);
      setSuccessNote(
        saved.status === 'pending'
          ? 'Teşekkürler! Yorumun onay için gönderildi.'
          : 'Teşekkürler! Puanın kaydedildi.'
      );
      await loadReviews();
    } catch (err) {
      setFormError(err.message || 'Yorum gönderilemedi.');
    } finally {
      setSubmitting(false);
    }
  };

  const showForm = isLoggedIn;

  return (
    <section className="reviews-section" aria-label="Yorumlar ve puanlar">
      <h2>Değerlendirmeler</h2>

      <div className="rating-summary">
        <Stars value={averageRating} size="lg" />
        {reviewCount > 0 ? (
          <>
            <span className="rating-summary-value">{averageRating.toFixed(1)}</span>
            <span className="rating-summary-count">({reviewCount} değerlendirme)</span>
          </>
        ) : (
          <span className="rating-summary-count">Henüz değerlendirme yok</span>
        )}
      </div>

      {showForm && (
        <div className="review-form-card">
          <h3>{myReview ? 'Değerlendirmeni güncelle' : 'Bu dersi değerlendir'}</h3>

          {myReview && (
            <div className={`review-status-banner review-status-banner--${myReview.status}`}>
              <strong style={{ display: 'block', marginBottom: 2 }}>
                {myReview.status === 'pending'  && 'İnceleme aşamasında'}
                {myReview.status === 'approved' && 'Yayında'}
                {myReview.status === 'rejected' && 'Reddedildi'}
              </strong>
              {STATUS_LABEL[myReview.status]}
              {myReview.status === 'rejected' && myReview.rejectionReason && (
                <div style={{ marginTop: 4, fontSize: 'var(--fs-12)' }}>
                  Sebep: {myReview.rejectionReason}
                </div>
              )}
            </div>
          )}

          {successNote && <div className="success-message">{successNote}</div>}
          {formError && <div className="error-message">{formError}</div>}

          <form onSubmit={handleSubmit} noValidate>
            <label style={{ display: 'block', fontSize: 'var(--fs-13)', color: 'var(--color-ink-700)', fontWeight: 500, marginBottom: 4 }}>
              Puan
            </label>
            <div className="star-picker" role="radiogroup" aria-label="Puan">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={rating === n}
                  className={rating >= n ? 'is-active' : ''}
                  onClick={() => setRating(n)}
                  aria-label={`${n} yıldız`}
                >
                  ★
                </button>
              ))}
            </div>

            <div className="form-group">
              <label htmlFor="review-comment">Yorum (isteğe bağlı)</label>
              <textarea
                id="review-comment"
                className="form-input"
                rows={4}
                maxLength={1000}
                placeholder="Bu ders hakkındaki düşüncelerini paylaş..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                style={{ resize: 'vertical', minHeight: 96 }}
              />
              <div style={{ fontSize: 'var(--fs-12)', color: 'var(--color-ink-500)', marginTop: 4 }}>
                Yorumlar ürün yöneticisi tarafından onaylandıktan sonra yayınlanır. Sadece puan
                verirsen onayı beklemene gerek kalmaz.
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={submitting || rating < 1}>
              {submitting
                ? 'Gönderiliyor...'
                : myReview ? 'Değerlendirmeyi Güncelle' : 'Değerlendirmeyi Gönder'}
            </button>
          </form>
        </div>
      )}

      {!showForm && (
        <div className="review-status-banner review-status-banner--pending">
          Değerlendirme yapabilmek için giriş yapman gerekiyor.
        </div>
      )}

      {loading ? (
        <Spinner label="Yorumlar yükleniyor..." />
      ) : reviews.length === 0 ? (
        <div className="reviews-empty">İlk değerlendirmeyi sen yap.</div>
      ) : (
        <div className="review-list">
          {reviews.map((r) => (
            <article key={r.id} className="review-card">
              <div className="review-card-head">
                <div>
                  <div className="review-card-author">{r.userName || 'Anonim'}</div>
                  <div className="review-card-date">{formatDate(r.createdAt)}</div>
                </div>
                <Stars value={r.rating} />
              </div>
              {r.comment && <div className="review-card-body">{r.comment}</div>}
            </article>
          ))}
        </div>
      )}
    </section>
  );
};

export default ProductReviews;
