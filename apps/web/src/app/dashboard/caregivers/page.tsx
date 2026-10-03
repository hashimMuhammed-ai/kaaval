'use client';

import React from 'react';
import Link from 'next/link';

import { useCaregiverRoster } from './hooks/use-caregiver-roster';
import { CredentialsModal } from '../../../components/credentials-modal';
import { BulkImportModal } from './components/bulk-import-modal';
import { CaregiverDetailDrawer } from './components/caregiver-detail-drawer';
import { CaregiverStatsBar } from './components/caregiver-stats-bar';
import { CaregiverFilterBar } from './components/caregiver-filter-bar';
import { CaregiverBoardView } from './components/caregiver-board-view';
import { CaregiverTableView } from './components/caregiver-table-view';
import { CaregiverMobileFeed } from './components/caregiver-mobile-feed';

export default function CaregiverStatusBoardPage() {
  const {
    counts,
    loading,
    error,
    viewMode,
    setViewMode,
    mobileStatusTab,
    setMobileStatusTab,
    selectedDistrict,
    setSelectedDistrict,
    selectedSkill,
    setSelectedSkill,
    searchQuery,
    setSearchQuery,
    dragOverColumn,
    selectedCaregiver,
    resetModalData,
    setResetModalData,
    toastMessage,
    showImportModal,
    setShowImportModal,
    filteredCaregivers,
    columnData,
    mobileFilteredCaregivers,
    fetchData,
    showToast,
    handleUpdateStatus,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    openDrawer,
    closeDrawer,
    handleDrawerStatusChange,
    handleCaregiverUpdated,
    handleResetCredentials,
    handleResetFilters,
  } = useCaregiverRoster();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', width: '100%', minWidth: 0, maxWidth: '100%' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className="animate-fade-in"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid var(--primary-500)',
            boxShadow: 'var(--shadow-glow)',
            color: '#ffffff',
            padding: '0.85rem 1.4rem',
            borderRadius: 'var(--radius-lg)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            fontSize: '0.9rem',
          }}
        >
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--primary-400)' }} />
          {toastMessage}
        </div>
      )}

      {/* Top Header & Quick Actions */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          width: '100%',
          minWidth: 0,
        }}
      >
        <div>
          <div className="desktop-only" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span className="badge badge-teal">Caregiver Operations</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Kerala Agency Workforce Board
            </span>
          </div>
          <h1
            style={{
              fontSize: 'clamp(1.35rem, 3.5vw, 1.85rem)',
              fontWeight: 800,
              color: 'var(--text-main)',
              letterSpacing: '-0.02em',
              margin: 0,
            }}
          >
            Caregivers
          </h1>
          <p className="desktop-only" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '680px', marginTop: '0.25rem', marginBottom: 0 }}>
            Live roster tracking across Available, Assigned, On Leave, and Inactive states. Drag cards or select status to update immediately.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexShrink: 0 }}>
          <button
            onClick={fetchData}
            className="btn-secondary"
            title="Refresh Caregivers Roster"
            style={{ padding: '0.45rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 4v6h-6M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setShowImportModal(true)}
            className="btn-secondary desktop-only"
            title="Bulk import staff from CSV"
            style={{
              padding: '0.55rem 0.85rem',
              fontSize: '0.825rem',
              borderColor: '#0284c7',
              color: '#0284c7',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>Import CSV</span>
          </button>

          <Link
            href="/dashboard/caregivers/new"
            className="btn-primary desktop-only"
            style={{ padding: '0.55rem 1rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Add Caregiver</span>
          </Link>
        </div>
      </div>

      {/* KPI Metrics Summary Bar - Desktop only to keep mobile stream clean and compact */}
      <div className="desktop-only">
        <CaregiverStatsBar counts={counts} />
      </div>

      {/* Toolbar: Filters & View Switcher */}
      <CaregiverFilterBar
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        selectedDistrict={selectedDistrict}
        onDistrictChange={setSelectedDistrict}
        selectedSkill={selectedSkill}
        onSkillChange={setSelectedSkill}
        onResetFilters={handleResetFilters}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {error && (
        <div
          style={{
            padding: '1rem',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-md)',
            color: '#fca5a5',
            fontSize: '0.875rem',
          }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
          Loading live caregiver status board...
        </div>
      ) : (
        <>
          {/* Mobile Horizontal Status Filter Tabs & Cards Feed */}
          <CaregiverMobileFeed
            counts={counts}
            mobileStatusTab={mobileStatusTab}
            onMobileStatusTabChange={setMobileStatusTab}
            caregivers={mobileFilteredCaregivers}
            onOpenDrawer={openDrawer}
            onStatusChange={handleUpdateStatus}
          />

          {/* Desktop Board and Table Views */}
          <div className="desktop-only" style={{ width: '100%' }}>
            {viewMode === 'board' ? (
              /* ================= 4-COLUMN KANBAN BOARD ================= */
              <CaregiverBoardView
                columnData={columnData}
                dragOverColumn={dragOverColumn}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onDragStart={handleDragStart}
                onOpenDrawer={openDrawer}
                onStatusChange={handleUpdateStatus}
              />
            ) : (
              /* ================= DETAILED TABLE VIEW ================= */
              <CaregiverTableView
                caregivers={filteredCaregivers}
                onOpenDrawer={openDrawer}
                onStatusChange={handleUpdateStatus}
              />
            )}
          </div>
        </>
      )}

      {/* ================= CAREGIVER DETAIL & EDIT DRAWER ================= */}
      <CaregiverDetailDrawer
        caregiver={selectedCaregiver}
        isOpen={!!selectedCaregiver}
        onClose={closeDrawer}
        onStatusChange={handleDrawerStatusChange}
        onCaregiverUpdated={handleCaregiverUpdated}
        onResetCredentials={handleResetCredentials}
        showToast={showToast}
      />

      {/* Reset Credentials Modal */}
      <CredentialsModal
        isOpen={!!resetModalData}
        data={resetModalData}
        onClose={() => setResetModalData(null)}
      />

      {/* Bulk CSV Import Modal */}
      <BulkImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={fetchData}
        showToast={showToast}
      />

      {/* Mobile Floating Action Button: + Add Staff */}
      <Link
        href="/dashboard/caregivers/new"
        id="mobile-caregiver-fab"
        className="hide-on-desktop show-on-mobile"
        style={{
          position: 'fixed',
          bottom: 'calc(76px + env(safe-area-inset-bottom, 0px))',
          right: '1.25rem',
          backgroundColor: 'var(--primary-500)',
          color: '#ffffff',
          borderRadius: 'var(--radius-full)',
          padding: '0.75rem 1.25rem',
          fontWeight: 700,
          fontSize: '0.875rem',
          boxShadow: '0 8px 20px rgba(20, 184, 166, 0.45), 0 2px 6px rgba(0, 0, 0, 0.3)',
          alignItems: 'center',
          gap: '0.4rem',
          zIndex: 40,
          textDecoration: 'none',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        <span>Add Caregiver</span>
      </Link>
    </div>
  );
}
