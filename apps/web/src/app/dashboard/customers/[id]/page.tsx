'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import CustomerDetailView, { CustomerData } from '../../../../components/customer-detail-view';
import { apiFetch } from '../../../../utils/api';

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [customer, setCustomer] = useState<CustomerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCustomer = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/customers/${id}`);
      if (res?.data) {
        setCustomer(res.data);
      } else {
        throw new Error('Customer data not found.');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load customer profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomer();
  }, [id]);

  if (loading) {
    return (
      <div
        id="customer-detail-loading"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          gap: '1rem',
          color: 'var(--text-secondary)',
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            border: '3px solid rgba(20, 184, 166, 0.2)',
            borderTop: '3px solid #14b8a6',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <p style={{ fontSize: '0.95rem' }}>Loading Patient & Caregiver CRM record...</p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div
        id="customer-detail-error"
        style={{
          maxWidth: '600px',
          margin: '4rem auto',
          textAlign: 'center',
          padding: '2.5rem',
          backgroundColor: 'var(--bg-card)',
          borderRadius: '16px',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)',
        }}
      >
        <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⚠️</div>
        <h2 style={{ fontSize: '1.25rem', color: '#f87171', marginBottom: '0.5rem' }}>
          Customer Record Unavailable
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          {error || 'Unable to retrieve this customer account. It may have been removed or belongs to another tenant.'}
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          <button
            onClick={() => router.push('/dashboard/requests')}
            style={{
              padding: '0.6rem 1.2rem',
              borderRadius: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#ffffff',
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            ← View Requests
          </button>
          <button
            onClick={fetchCustomer}
            style={{
              padding: '0.6rem 1.2rem',
              borderRadius: '8px',
              backgroundColor: '#14b8a6',
              border: 'none',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem 2rem' }}>
      <CustomerDetailView
        customer={customer}
        onUpdate={(updated) => setCustomer(updated)}
        onBack={() => router.back()}
      />
    </div>
  );
}
