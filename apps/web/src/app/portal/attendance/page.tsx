'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '../../../utils/api';

interface AttendanceRecord {
  id: string;
  date: string;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  status: string;
  checkInNotes?: string | null;
  checkOutNotes?: string | null;
  verified?: boolean;
  customer?: {
    patientName?: string;
    fullName?: string;
  };
}

interface TodayAttendanceStatus {
  date: string;
  hasAssignment: boolean;
  isCheckedIn: boolean;
  isCheckedOut: boolean;
  assignment?: {
    id: string;
    customer?: {
      patientName?: string;
      fullName?: string;
      city?: string;
      district?: string;
      careAddress?: string;
      address?: string;
    };
  } | null;
  attendance?: AttendanceRecord | null;
}

export default function CaregiverAttendancePage() {
  const [todayStatus, setTodayStatus] = useState<TodayAttendanceStatus | null>(null);
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [showNotesInput, setShowNotesInput] = useState<boolean>(false);
  const [elapsedDuration, setElapsedDuration] = useState<string>('');

  // Live Clock & Shift Elapsed Timer
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

      if (todayStatus?.attendance?.checkInTime && !todayStatus.isCheckedOut) {
        const inTime = new Date(todayStatus.attendance.checkInTime).getTime();
        const diffMs = Math.max(0, now.getTime() - inTime);
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        setElapsedDuration(`${String(hours).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m`);
      } else {
        setElapsedDuration('');
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [todayStatus]);

  const loadData = async () => {
    try {
      setLoading(true);

      // 1. Fetch today's status
      let todayData: TodayAttendanceStatus | null = null;
      try {
        const todayRes = await apiFetch<{ success: boolean; data: TodayAttendanceStatus }>('/attendance/today');
        if (todayRes?.data) {
          todayData = todayRes.data;
        }
      } catch {
        // Fallback
      }

      // If todayStatus doesn't have an assignment, check active assignment
      if (!todayData?.assignment) {
        try {
          const asgnRes = await apiFetch<{ success: boolean; data: any }>('/assignments/current');
          if (asgnRes?.data) {
            todayData = {
              date: todayData?.date || new Date().toISOString().slice(0, 10),
              hasAssignment: true,
              isCheckedIn: todayData?.isCheckedIn || false,
              isCheckedOut: todayData?.isCheckedOut || false,
              assignment: asgnRes.data,
              attendance: todayData?.attendance || null,
            };
          }
        } catch {
          // Handled
        }
      }

      setTodayStatus(todayData);

      // 2. Fetch attendance history
      try {
        const historyRes = await apiFetch<{ success: boolean; data: AttendanceRecord[] }>('/attendance?limit=14');
        if (historyRes?.data && Array.isArray(historyRes.data)) {
          setHistory(historyRes.data);
        }
      } catch {
        // Handled
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getCoordinates = (): Promise<{ latitude?: number; longitude?: number }> => {
    return new Promise((resolve) => {
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
          () => resolve({}),
          { timeout: 2000, enableHighAccuracy: true }
        );
      } else {
        resolve({});
      }
    });
  };

  const handlePunch = async () => {
    if (!todayStatus?.assignment?.id) {
      setMessage({
        type: 'error',
        text: 'No active patient assignment found for your account. Please contact office staff.',
      });
      return;
    }

    setActionLoading(true);
    setMessage(null);

    try {
      const isCheckingOut = todayStatus.isCheckedIn && !todayStatus.isCheckedOut;
      const coords = await getCoordinates();

      if (isCheckingOut) {
        // Record Check-Out
        await apiFetch('/attendance/check-out', {
          method: 'POST',
          body: JSON.stringify({
            assignmentId: todayStatus.assignment.id,
            attendanceId: todayStatus.attendance?.id,
            checkOutTime: new Date().toISOString(),
            latitude: coords.latitude,
            longitude: coords.longitude,
            notes: notes.trim() || undefined,
          }),
        });

        setMessage({
          type: 'success',
          text: `Shift check-out recorded successfully at ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}.`,
        });
      } else {
        // Record Check-In
        await apiFetch('/attendance/check-in', {
          method: 'POST',
          body: JSON.stringify({
            assignmentId: todayStatus.assignment.id,
            checkInTime: new Date().toISOString(),
            latitude: coords.latitude,
            longitude: coords.longitude,
            notes: notes.trim() || undefined,
          }),
        });

        setMessage({
          type: 'success',
          text: `Shift check-in recorded successfully at ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}. Have a great duty!`,
        });
      }

      setNotes('');
      setShowNotesInput(false);
      await loadData();
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err?.message || 'Unable to record attendance shift punch. Please try again.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const isCheckedIn = !!(todayStatus?.isCheckedIn ?? (todayStatus as any)?.checkedIn ?? todayStatus?.attendance?.checkInTime);
  const isCheckedOut = !!(todayStatus?.isCheckedOut ?? (todayStatus as any)?.checkedOut ?? todayStatus?.attendance?.checkOutTime);
  const hasActiveDuty = !!todayStatus?.assignment;
  const patientName =
    todayStatus?.assignment?.customer?.patientName ||
    todayStatus?.assignment?.customer?.fullName ||
    'Active Patient Duty';

  const formatTime = (timeStr?: string | null) => {
    if (!timeStr) return '--:--';
    try {
      return new Date(timeStr).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return timeStr;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#ffffff', lineHeight: 1.2 }}>
            Attendance & Shift Punch
          </h1>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            One-tap shift punch feeding agency payroll table
          </p>
        </div>
        <Link
          href="/portal"
          id="back-to-home-link"
          style={{
            fontSize: '0.78rem',
            color: 'var(--primary-400)',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            padding: '0.35rem 0.65rem',
            backgroundColor: 'rgba(20, 184, 166, 0.1)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(20, 184, 166, 0.25)',
          }}
        >
          <span>&larr;</span>
          <span>Home</span>
        </Link>
      </div>

      {/* Feedback Banner */}
      {message && (
        <div
          id="attendance-message-banner"
          style={{
            padding: '0.85rem 1rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: message.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: `1px solid ${message.type === 'success' ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`,
            color: message.type === 'success' ? '#6ee7b7' : '#fca5a5',
            fontSize: '0.825rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <span>{message.type === 'success' ? '✓' : '⚠️'}</span>
          <span>{message.text}</span>
        </div>
      )}

      {/* Main Interactive One-Tap Punch Hero Card */}
      <section
        id="one-tap-punch-card"
        className="glass-panel"
        style={{
          padding: '1.5rem 1.25rem',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.25rem',
          border: isCheckedIn && !isCheckedOut
            ? '1px solid #fde68a'
            : '1px solid #ccfbf1',
          background: 'linear-gradient(135deg, #ffffff, #f0fdfa)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Date & Live Ticking Clock */}
        <div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
          <div
            id="live-shift-clock"
            style={{
              fontSize: '1.85rem',
              fontWeight: 800,
              color: '#172033',
              letterSpacing: '0.05em',
              marginTop: '0.2rem',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {currentTime || '--:--:--'}
          </div>
        </div>

        {/* Assigned Patient Context Pill */}
        {hasActiveDuty && (
          <div
            id="punch-assignment-context"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              backgroundColor: '#F8FAFC',
              border: '1px solid #e2e8f0',
              borderRadius: 'var(--radius-full)',
              padding: '0.35rem 0.85rem',
              fontSize: '0.78rem',
              color: '#475569',
            }}
          >
            <span>Duty:</span>
            <strong style={{ color: '#172033' }}>{patientName}</strong>
          </div>
        )}

        {/* Big One-Tap Circular Action Button */}
        <div style={{ position: 'relative', margin: '0.5rem 0' }}>
          <button
            id="portal-punch-btn"
            onClick={handlePunch}
            disabled={actionLoading || !hasActiveDuty || isCheckedOut}
            aria-label={
              !hasActiveDuty
                ? 'No active assignment'
                : isCheckedOut
                ? 'Shift completed for today'
                : isCheckedIn
                ? 'Check out of current shift'
                : 'Check in to start shift'
            }
            style={{
              width: '160px',
              height: '160px',
              borderRadius: '50%',
              border: 'none',
              cursor: actionLoading || !hasActiveDuty || isCheckedOut ? 'not-allowed' : 'pointer',
              background: !hasActiveDuty
                ? '#cbd5e1'
                : isCheckedOut
                ? 'linear-gradient(135deg, #16a34a, #15803D)'
                : isCheckedIn
                ? 'linear-gradient(135deg, #f59e0b, #D97706)'
                : 'linear-gradient(135deg, #3b82f6, #2563EB)',
              color: '#ffffff',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              boxShadow: isCheckedIn && !isCheckedOut
                ? '0 0 35px rgba(217, 119, 6, 0.4)'
                : hasActiveDuty && !isCheckedOut
                ? '0 0 35px rgba(37, 99, 235, 0.4)'
                : 'none',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              opacity: !hasActiveDuty || isCheckedOut ? 0.85 : 1,
              outline: 'none',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <div style={{ fontSize: '2rem' }}>
              {actionLoading
                ? '⏳'
                : !hasActiveDuty
                ? '⏸️'
                : isCheckedOut
                ? '✓'
                : isCheckedIn
                ? '⏱️'
                : '⚡'}
            </div>

            <span
              id="punch-btn-label"
              style={{
                fontSize: '1rem',
                fontWeight: 800,
                letterSpacing: '0.02em',
                lineHeight: 1.1,
              }}
            >
              {actionLoading
                ? 'Punching...'
                : !hasActiveDuty
                ? 'Standby'
                : isCheckedOut
                ? 'Completed'
                : isCheckedIn
                ? 'Check Out'
                : 'Check In'}
            </span>

            <span style={{ fontSize: '0.675rem', opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {actionLoading
                ? 'Connecting...'
                : !hasActiveDuty
                ? 'No duty'
                : isCheckedOut
                ? 'Full Day'
                : isCheckedIn
                ? 'Tap to Punch'
                : 'One-Tap Punch'}
            </span>
          </button>
        </div>

        {/* Live Shift Counter or Status Description */}
        <div style={{ width: '100%' }}>
          {isCheckedIn && !isCheckedOut ? (
            <div
              id="active-shift-timer-card"
              style={{
                backgroundColor: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: 'var(--radius-md)',
                padding: '0.75rem',
              }}
            >
              <div style={{ fontSize: '0.72rem', color: '#D97706', textTransform: 'uppercase', fontWeight: 700 }}>
                Shift in progress • Checked in at {formatTime(todayStatus?.attendance?.checkInTime)}
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#172033', marginTop: '0.2rem' }}>
                {elapsedDuration || 'Active on duty'}
              </div>
            </div>
          ) : isCheckedOut ? (
            <div
              id="shift-completed-card"
              style={{
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: 'var(--radius-md)',
                padding: '0.75rem',
              }}
            >
              <div style={{ fontSize: '0.75rem', color: '#15803D', fontWeight: 700 }}>
                ✓ Today's Shift Recorded & Validated
              </div>
              <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '0.2rem' }}>
                In: {formatTime(todayStatus?.attendance?.checkInTime)} &bull; Out: {formatTime(todayStatus?.attendance?.checkOutTime)}
              </div>
            </div>
          ) : (
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              {hasActiveDuty
                ? 'Tap the button above when you arrive at the patient home to begin your shift.'
                : 'You have no active assignment assigned for today.'}
            </div>
          )}
        </div>

        {/* Optional Shift Notes Toggle */}
        {hasActiveDuty && !isCheckedOut && (
          <div style={{ width: '100%', textAlign: 'left' }}>
            <button
              type="button"
              id="toggle-notes-btn"
              onClick={() => setShowNotesInput(!showNotesInput)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#2563EB',
                fontSize: '0.75rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                padding: 0,
              }}
            >
              <span>{showNotesInput ? '▲ Hide Handover Notes' : '+ Add Shift Handover Notes'}</span>
            </button>

            {showNotesInput && (
              <textarea
                id="shift-notes-input"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional: Enter vital signs, medicines given, or special observations..."
                rows={2}
                style={{
                  width: '100%',
                  marginTop: '0.5rem',
                  padding: '0.5rem 0.75rem',
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: 'var(--radius-sm)',
                  color: '#172033',
                  fontSize: '0.78rem',
                  resize: 'none',
                  outline: 'none',
                }}
              />
            )}
          </div>
        )}
      </section>

      {/* Shift Punch History / Log */}
      <section
        id="attendance-history-section"
        className="glass-panel"
        style={{
          padding: '1.25rem',
          border: '1px solid #e2e8f0',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#172033' }}>
              Recent Shift History
            </h3>
            <div style={{ fontSize: '0.72rem', color: '#475569' }}>
              Self-punch records feeding monthly salary calculations
            </div>
          </div>
          <span
            style={{
              fontSize: '0.72rem',
              color: '#15803D',
              backgroundColor: '#f0fdf4',
              padding: '0.2rem 0.6rem',
              borderRadius: 'var(--radius-full)',
              fontWeight: 700,
            }}
          >
            {history.length} Shifts on Log
          </span>
        </div>

        {history.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {history.map((record) => {
              const formattedDate = new Date(record.date).toLocaleDateString('en-IN', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
              });

              return (
                <div
                  key={record.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.65rem 0.85rem',
                    backgroundColor: '#F8FAFC',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.825rem', fontWeight: 700, color: '#172033' }}>
                      {formattedDate}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: '0.1rem' }}>
                      In: {formatTime(record.checkInTime)} &bull; Out: {formatTime(record.checkOutTime)}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        padding: '0.2rem 0.5rem',
                        borderRadius: 'var(--radius-full)',
                        backgroundColor: record.status === 'present'
                          ? '#f0fdf4'
                          : '#fffbeb',
                        color: record.status === 'present' ? '#15803D' : '#D97706',
                      }}
                    >
                      {record.status}
                    </span>
                    {record.verified && (
                      <div style={{ fontSize: '0.65rem', color: '#0F766E', marginTop: '0.15rem' }}>
                        ✓ Verified
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
            No past shift records logged yet this cycle.
          </div>
        )}
      </section>
    </div>
  );
}
