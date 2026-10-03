'use client';

import { useState, useEffect, useMemo } from 'react';
import { apiFetch } from '../../../../utils/api';
import {
  STATUS_CONFIG,
  CaregiverStatusType,
} from '../../../../constants/caregiver-status';
import {
  Caregiver,
  CaregiverStatusCounts,
  TemporaryCredentials,
} from '../../../../types/caregiver';

export function useCaregiverRoster() {
  const [caregivers, setCaregivers] = useState<Caregiver[]>([]);
  const [counts, setCounts] = useState<CaregiverStatusCounts>({
    available: 0,
    assigned: 0,
    on_leave: 0,
    inactive: 0,
    total: 0,
    occupancyRate: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & View Mode
  const [viewMode, setViewMode] = useState<'board' | 'table'>('board');
  const [mobileStatusTab, setMobileStatusTab] = useState<CaregiverStatusType | 'all'>('all');
  const [selectedDistrict, setSelectedDistrict] = useState('All Districts');
  const [selectedSkill, setSelectedSkill] = useState('All Skills');
  const [searchQuery, setSearchQuery] = useState('');

  // Drag and Drop
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<CaregiverStatusType | null>(null);

  // Selected Caregiver Drawer & Modals
  const [selectedCaregiver, setSelectedCaregiver] = useState<Caregiver | null>(null);
  const [resetModalData, setResetModalData] = useState<TemporaryCredentials | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [rosterRes, countsRes] = await Promise.all([
        apiFetch('/caregivers?limit=100'),
        apiFetch('/caregivers/status-counts').catch(() => null),
      ]);

      setCaregivers(rosterRes.data || []);

      if (countsRes) {
        setCounts(countsRes);
      } else {
        // Fallback count calculation if counts endpoint wasn't cached yet
        const localCounts = {
          available: 0,
          assigned: 0,
          on_leave: 0,
          inactive: 0,
          total: (rosterRes.data || []).length,
          occupancyRate: 0,
        };
        for (const c of rosterRes.data || []) {
          if (c.status in localCounts) {
            (localCounts as any)[c.status]++;
          }
        }
        const activePool = localCounts.available + localCounts.assigned;
        localCounts.occupancyRate =
          activePool > 0 ? Math.round((localCounts.assigned / activePool) * 100) : 0;
        setCounts(localCounts);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load caregiver workforce data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered Caregivers
  const filteredCaregivers = useMemo(() => {
    return caregivers.filter((cg) => {
      // District filter
      if (
        selectedDistrict !== 'All Districts' &&
        cg.district?.toLowerCase() !== selectedDistrict.toLowerCase()
      ) {
        return false;
      }

      // Skill filter
      if (
        selectedSkill !== 'All Skills' &&
        (!cg.skills || !cg.skills.includes(selectedSkill))
      ) {
        return false;
      }

      // Search term
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = cg.fullName?.toLowerCase().includes(q);
        const matchesPhone = cg.phone?.includes(q);
        const matchesCity = cg.city?.toLowerCase().includes(q);
        if (!matchesName && !matchesPhone && !matchesCity) {
          return false;
        }
      }

      return true;
    });
  }, [caregivers, selectedDistrict, selectedSkill, searchQuery]);

  // Group caregivers into status columns
  const columnData = useMemo(() => {
    const map: Record<CaregiverStatusType, Caregiver[]> = {
      available: [],
      assigned: [],
      on_leave: [],
      inactive: [],
    };

    filteredCaregivers.forEach((cg) => {
      const st = cg.status as CaregiverStatusType;
      if (st in map) {
        map[st].push(cg);
      } else {
        map.available.push(cg);
      }
    });

    return map;
  }, [filteredCaregivers]);

  // Filter caregivers for mobile card view by active status tab
  const mobileFilteredCaregivers = useMemo(() => {
    if (mobileStatusTab === 'all') {
      return filteredCaregivers;
    }
    return filteredCaregivers.filter((cg) => cg.status === mobileStatusTab);
  }, [filteredCaregivers, mobileStatusTab]);

  // Status Change (via Drag & Drop, Dropdown, or Detail Drawer)
  const handleUpdateStatus = async (
    caregiverId: string,
    newStatus: CaregiverStatusType
  ) => {
    const cg = caregivers.find((c) => c.id === caregiverId);
    if (!cg || cg.status === newStatus) return;

    const previousStatus = cg.status;

    // Optimistic UI update
    setCaregivers((prev) =>
      prev.map((item) =>
        item.id === caregiverId ? { ...item, status: newStatus } : item
      )
    );

    // Optimistic counts update
    setCounts((prev) => {
      const updated = {
        ...prev,
        [previousStatus]: Math.max(0, (prev as any)[previousStatus] - 1),
        [newStatus]: (prev as any)[newStatus] + 1,
      };
      const activePool = updated.available + updated.assigned;
      updated.occupancyRate =
        activePool > 0 ? Math.round((updated.assigned / activePool) * 100) : 0;
      return updated;
    });

    try {
      await apiFetch(`/caregivers/${caregiverId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });

      showToast(
        `${cg.fullName} moved to "${STATUS_CONFIG[newStatus].label}"`
      );
    } catch (err: any) {
      // Revert optimistic update
      setCaregivers((prev) =>
        prev.map((item) =>
          item.id === caregiverId ? { ...item, status: previousStatus } : item
        )
      );
      alert(err?.message || 'Failed to update caregiver status on server.');
    }
  };

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    setDraggedId(id);
  };

  const handleDragOver = (e: React.DragEvent, col: CaregiverStatusType) => {
    e.preventDefault();
    if (dragOverColumn !== col) {
      setDragOverColumn(col);
    }
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = async (e: React.DragEvent, col: CaregiverStatusType) => {
    e.preventDefault();
    setDragOverColumn(null);
    const id = e.dataTransfer.getData('text/plain') || draggedId;
    setDraggedId(null);

    if (id) {
      await handleUpdateStatus(id, col);
    }
  };

  // Drawer handlers
  const openDrawer = (cg: Caregiver) => {
    setSelectedCaregiver(cg);
  };

  const closeDrawer = () => {
    setSelectedCaregiver(null);
  };

  const handleDrawerStatusChange = (id: string, st: CaregiverStatusType) => {
    handleUpdateStatus(id, st);
    setSelectedCaregiver((prev) => (prev && prev.id === id ? { ...prev, status: st } : prev));
  };

  const handleCaregiverUpdated = (updated: Caregiver) => {
    setCaregivers((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    setSelectedCaregiver(updated);
  };

  // Reset Credentials
  const handleResetCredentials = async (caregiverId: string) => {
    try {
      const res = await apiFetch(`/caregivers/${caregiverId}/reset-credentials`, {
        method: 'POST',
      });
      setResetModalData(res.temporaryCredentials);
    } catch (err: any) {
      alert(err?.message || 'Could not reset credentials.');
    }
  };

  // Filter Reset
  const handleResetFilters = () => {
    setSelectedDistrict('All Districts');
    setSelectedSkill('All Skills');
    setSearchQuery('');
  };

  return {
    // State
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

    // Memoized collections
    filteredCaregivers,
    columnData,
    mobileFilteredCaregivers,

    // Actions & Handlers
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
  };
}
