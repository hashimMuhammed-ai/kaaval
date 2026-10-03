'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardIndexPage() {
  const router = useRouter();

  useEffect(() => {
    try {
      const profileStr = localStorage.getItem('user_profile');
      if (profileStr) {
        const user = JSON.parse(profileStr);
        if (user.role === 'office_staff') {
          router.replace('/dashboard/requests');
          return;
        } else if (user.role === 'caregiver') {
          router.replace('/portal');
          return;
        }
      }
    } catch {
      // fallback
    }
    router.replace('/dashboard/analytics');
  }, [router]);

  return null;
}
