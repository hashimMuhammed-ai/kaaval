'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { apiFetch } from '../../../utils/api';

interface AssignmentDetails {
  assignmentId: string;
  caregiverName: string;
  caregiverPhotoUrl?: string | null;
  agencyName: string;
  startDate?: string;
  endDate?: string;
  alreadySubmitted?: boolean;
  existingRating?: number | null;
  existingComment?: string | null;
}

const RATING_DESCRIPTIONS: Record<number, { title: string; color: string; emoji: string }> = {
  1: { title: 'Poor Experience', color: '#ef4444', emoji: '😞' },
  2: { title: 'Fair / Below Expectations', color: '#f97316', emoji: '😐' },
  3: { title: 'Good Care', color: '#eab308', emoji: '🙂' },
  4: { title: 'Very Good & Attentive', color: '#38bdf8', emoji: '😊' },
  5: { title: 'Excellent & Compassionate', color: '#10b981', emoji: '⭐' },
};

export default function PublicFeedbackPage() {
  const params = useParams();
  const assignmentId = params?.assignmentId as string;

  const [details, setDetails] = useState<AssignmentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedRating, setSelectedRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [comment, setComment] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!assignmentId) return;

    const fetchDetails = async () => {
      try {
        setLoading(true);
        const res = await apiFetch(`/feedback/public/${assignmentId}`);
        if (res?.data) {
          setDetails(res.data);
          if (res.data.alreadySubmitted) {
            setSubmitted(true);
            setSelectedRating(res.data.existingRating || 5);
            setComment(res.data.existingComment || '');
          }
        } else {
          setError('Care assignment review session not found or link has expired.');
        }
      } catch (err: any) {
        setError(err.message || 'Unable to load caregiver assignment details.');
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [assignmentId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRating || selectedRating < 1 || selectedRating > 5) {
      alert('Please select a rating between 1 and 5 stars.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiFetch(`/feedback/public/${assignmentId}`, {
        method: 'POST',
        body: JSON.stringify({
          rating: selectedRating,
          comment: comment.trim() || undefined,
        }),
      });

      if (res?.success) {
        setSubmitted(true);
      } else {
        alert(res?.message || 'Failed to submit rating. Please try again.');
      }
    } catch (err: any) {
      alert(`Submission error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const activeRating = hoverRating !== null ? hoverRating : selectedRating;
  const ratingInfo = RATING_DESCRIPTIONS[activeRating] || RATING_DESCRIPTIONS[5];

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#070d19',
        color: '#f8fafc',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1rem',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '560px',
          backgroundColor: 'rgba(15, 23, 42, 0.85)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '20px',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(20px)',
          overflow: 'hidden',
        }}
      >
        {/* Header Ribbon */}
        <div
          style={{
            background: 'linear-gradient(135deg, #0d9488, #14b8a6, #0284c7)',
            padding: '2rem 1.5rem',
            textAlign: 'center',
            position: 'relative',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              border: '2px solid rgba(255, 255, 255, 0.4)',
              fontSize: '2rem',
              marginBottom: '0.75rem',
              boxShadow: '0 8px 20px rgba(0, 0, 0, 0.25)',
            }}
          >
            🩺
          </div>
          <h1
            id="feedback-page-title"
            style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: '#ffffff',
              margin: '0 0 0.25rem 0',
              letterSpacing: '-0.02em',
            }}
          >
            Caregiver Service Feedback
          </h1>
          <p
            id="feedback-agency-subtitle"
            style={{
              fontSize: '0.875rem',
              color: 'rgba(255, 255, 255, 0.9)',
              margin: 0,
            }}
          >
            {details?.agencyName || 'CareKerala Healthcare Network'}
          </p>
        </div>

        {/* Content Body */}
        <div style={{ padding: '2rem 1.5rem' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: '#94a3b8' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>⏳</div>
              <p style={{ fontSize: '0.95rem' }}>Loading care assignment details...</p>
            </div>
          ) : error ? (
            <div
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '12px',
                padding: '1.5rem',
                textAlign: 'center',
                color: '#fca5a5',
              }}
            >
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚠️</div>
              <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Session Not Found</div>
              <div style={{ fontSize: '0.85rem' }}>{error}</div>
            </div>
          ) : submitted ? (
            /* Thank You Confirmation View */
            <div
              id="feedback-thank-you-card"
              style={{
                textAlign: 'center',
                padding: '1.5rem 0.5rem',
              }}
            >
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '72px',
                  height: '72px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  border: '2px solid #10b981',
                  fontSize: '2.25rem',
                  marginBottom: '1rem',
                  color: '#10b981',
                }}
              >
                ✓
              </div>
              <h2
                style={{
                  fontSize: '1.35rem',
                  fontWeight: 700,
                  color: '#ffffff',
                  marginBottom: '0.5rem',
                }}
              >
                Thank You for Your Feedback!
              </h2>
              <p
                style={{
                  fontSize: '0.9rem',
                  color: '#94a3b8',
                  lineHeight: 1.6,
                  maxWidth: '420px',
                  margin: '0 auto 1.5rem auto',
                }}
              >
                Your review for{' '}
                <strong style={{ color: '#ffffff' }}>{details?.caregiverName}</strong> has been
                recorded. Your input helps us maintain exemplary patient care across Kerala.
              </p>

              {/* Recorded Rating Pill */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '8px 18px',
                  borderRadius: '30px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  fontSize: '1rem',
                  fontWeight: 600,
                  color: '#2dd4bf',
                }}
              >
                <span>⭐ {selectedRating} / 5 Stars</span>
                {comment && <span style={{ color: '#64748b' }}>• Included comments</span>}
              </div>
            </div>
          ) : (
            /* Rating & Review Form */
            <form onSubmit={handleSubmit}>
              {/* Caregiver Profile Banner */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  padding: '1rem',
                  borderRadius: '12px',
                  marginBottom: '1.75rem',
                }}
              >
                <div
                  style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(20, 184, 166, 0.2)',
                    border: '2px solid #14b8a6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem',
                  }}
                >
                  👩‍⚕️
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>
                    Assigned Caregiver
                  </div>
                  <div
                    id="feedback-caregiver-name"
                    style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}
                  >
                    {details?.caregiverName}
                  </div>
                  {details?.startDate && (
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                      Care period commenced on {details.startDate}
                    </div>
                  )}
                </div>
              </div>

              {/* Star Rating Selector */}
              <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    color: '#e2e8f0',
                    marginBottom: '0.75rem',
                  }}
                >
                  How would you rate the care provided?
                </label>

                {/* 5 Interactive Stars */}
                <div
                  id="star-rating-selector"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    marginBottom: '0.75rem',
                  }}
                >
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      id={`star-rating-btn-${star}`}
                      onClick={() => setSelectedRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(null)}
                      style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '2.5rem',
                        cursor: 'pointer',
                        padding: '4px',
                        lineHeight: 1,
                        transition: 'transform 0.15s ease, filter 0.15s ease',
                        transform: activeRating >= star ? 'scale(1.15)' : 'scale(1)',
                        filter:
                          activeRating >= star
                            ? 'drop-shadow(0 2px 8px rgba(245, 158, 11, 0.5))'
                            : 'grayscale(100%) opacity(35%)',
                      }}
                    >
                      ★
                    </button>
                  ))}
                </div>

                {/* Dynamic Rating Label */}
                <div
                  id="rating-description-label"
                  style={{
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    color: ratingInfo.color,
                    transition: 'color 0.2s ease',
                  }}
                >
                  {ratingInfo.emoji} {ratingInfo.title} ({activeRating} of 5)
                </div>
              </div>

              {/* Optional Comment Field */}
              <div style={{ marginBottom: '1.75rem' }}>
                <label
                  htmlFor="feedback-comment-input"
                  style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: '#e2e8f0',
                    marginBottom: '0.5rem',
                  }}
                >
                  Optional Comments / Experience Details
                </label>
                <textarea
                  id="feedback-comment-input"
                  rows={4}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Share details on punctuality, patient comfort, medical assistance, communication..."
                  style={{
                    width: '100%',
                    backgroundColor: 'rgba(2, 6, 23, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '10px',
                    padding: '0.85rem',
                    color: '#ffffff',
                    fontSize: '0.9rem',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                id="btn-submit-feedback"
                disabled={submitting}
                style={{
                  width: '100%',
                  padding: '0.9rem',
                  backgroundColor: '#14b8a6',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '1rem',
                  fontWeight: 600,
                  cursor: submitting ? 'wait' : 'pointer',
                  boxShadow: '0 4px 15px rgba(20, 184, 166, 0.35)',
                  transition: 'background-color 0.2s ease, transform 0.15s ease',
                }}
              >
                {submitting ? 'Submitting Review...' : 'Submit Rating & Feedback'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
