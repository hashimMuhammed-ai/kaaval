import React, { useState } from 'react';
import { KERALA_DISTRICTS } from '../../../../constants/kerala';
import { SKILL_OPTIONS } from '../../../../constants/skills';

interface CaregiverFilterBarProps {
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  selectedDistrict: string;
  onDistrictChange: (district: string) => void;
  selectedSkill: string;
  onSkillChange: (skill: string) => void;
  onResetFilters: () => void;
  viewMode: 'board' | 'table';
  onViewModeChange: (mode: 'board' | 'table') => void;
}

export function CaregiverFilterBar({
  searchQuery,
  onSearchQueryChange,
  selectedDistrict,
  onDistrictChange,
  selectedSkill,
  onSkillChange,
  onResetFilters,
  viewMode,
  onViewModeChange,
}: CaregiverFilterBarProps) {
  const [mobileFiltersExpanded, setMobileFiltersExpanded] = useState(false);

  const hasDistrictOrSkill =
    selectedDistrict !== 'All Districts' || selectedSkill !== 'All Skills';
  const hasActiveFilters = hasDistrictOrSkill || Boolean(searchQuery.trim());

  return (
    <div
      className="glass-panel"
      style={{
        padding: '0.75rem 1rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.75rem',
        width: '100%',
        minWidth: 0,
        boxSizing: 'border-box',
      }}
    >
      {/* Search & Filters */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', flex: 1, minWidth: 0 }}>
        {/* Main Search Row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '150px' }}>
            <input
              type="text"
              placeholder="Search caregiver name, phone, town..."
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              className="form-input"
              style={{
                paddingLeft: '2.2rem',
                paddingTop: '0.45rem',
                paddingBottom: '0.45rem',
                fontSize: '0.85rem',
                width: '100%',
                boxSizing: 'border-box',
              }}
            />
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--text-muted)"
              strokeWidth="2"
              style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>

          {/* Mobile Filter Toggle Button */}
          <button
            type="button"
            className="hide-on-desktop"
            onClick={() => setMobileFiltersExpanded(!mobileFiltersExpanded)}
            style={{
              padding: '0.45rem 0.65rem',
              borderRadius: 'var(--radius-md)',
              border: hasDistrictOrSkill ? '1px solid #0d9488' : '1px solid #cbd5e1',
              backgroundColor: hasDistrictOrSkill ? 'rgba(13, 148, 136, 0.12)' : '#ffffff',
              color: hasDistrictOrSkill ? '#0f766e' : '#475569',
              fontSize: '0.775rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            <span>Filters</span>
            {hasDistrictOrSkill && (
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: '#0d9488',
                }}
              />
            )}
          </button>

          {/* Desktop Filter Selects (Inline) */}
          <div className="desktop-only">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <select
                value={selectedDistrict}
                onChange={(e) => onDistrictChange(e.target.value)}
                className="form-select"
                style={{
                  minWidth: '135px',
                  paddingTop: '0.45rem',
                  paddingBottom: '0.45rem',
                  fontSize: '0.85rem',
                }}
              >
                {KERALA_DISTRICTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>

              <select
                value={selectedSkill}
                onChange={(e) => onSkillChange(e.target.value)}
                className="form-select"
                style={{
                  minWidth: '135px',
                  paddingTop: '0.45rem',
                  paddingBottom: '0.45rem',
                  fontSize: '0.85rem',
                }}
              >
                {SKILL_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>

              {hasActiveFilters && (
                <button
                  onClick={onResetFilters}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary-400)',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    padding: '0.35rem 0',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Expanded Filters Row */}
        {(mobileFiltersExpanded || hasDistrictOrSkill) && (
          <div
            className="hide-on-desktop"
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.5rem',
              paddingTop: '0.35rem',
              borderTop: '1px solid #f1f5f9',
            }}
          >
            <select
              value={selectedDistrict}
              onChange={(e) => onDistrictChange(e.target.value)}
              className="form-select"
              style={{
                flex: '1 1 120px',
                paddingTop: '0.4rem',
                paddingBottom: '0.4rem',
                fontSize: '0.8rem',
              }}
            >
              {KERALA_DISTRICTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>

            <select
              value={selectedSkill}
              onChange={(e) => onSkillChange(e.target.value)}
              className="form-select"
              style={{
                flex: '1 1 120px',
                paddingTop: '0.4rem',
                paddingBottom: '0.4rem',
                fontSize: '0.8rem',
              }}
            >
              {SKILL_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            {hasActiveFilters && (
              <button
                onClick={onResetFilters}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#0d9488',
                  fontSize: '0.775rem',
                  cursor: 'pointer',
                  fontWeight: 600,
                  padding: '0.2rem 0.4rem',
                }}
              >
                Clear Filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* View Switcher: Board vs Table (Desktop only) */}
      <div
        className="desktop-only"
        style={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: '#f1f5f9',
          padding: '3px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid #e2e8f0',
        }}
      >
        <button
          onClick={() => onViewModeChange('board')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.4rem 0.75rem',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer',
            border: 'none',
            backgroundColor: viewMode === 'board' ? 'var(--primary-500)' : 'transparent',
            color: viewMode === 'board' ? '#ffffff' : 'var(--text-secondary)',
            transition: 'all 0.15s ease',
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="9" rx="1" />
            <rect x="14" y="3" width="7" height="5" rx="1" />
            <rect x="14" y="12" width="7" height="9" rx="1" />
            <rect x="3" y="16" width="7" height="5" rx="1" />
          </svg>
          <span>Kanban Board</span>
        </button>

        <button
          onClick={() => onViewModeChange('table')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.4rem 0.75rem',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer',
            border: 'none',
            backgroundColor: viewMode === 'table' ? 'var(--primary-500)' : 'transparent',
            color: viewMode === 'table' ? '#ffffff' : 'var(--text-secondary)',
            transition: 'all 0.15s ease',
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="8" y1="6" x2="21" y2="6" />
            <line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" />
            <line x1="3" y1="12" x2="3.01" y2="12" />
            <line x1="3" y1="18" x2="3.01" y2="18" />
          </svg>
          <span>List Table</span>
        </button>
      </div>
    </div>
  );
}
