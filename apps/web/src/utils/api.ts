import { getSubdomain } from './subdomain';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export interface ApiFetchOptions extends RequestInit {
  token?: string;
  subdomain?: string;
}

/**
 * Enhanced fetch helper that injects Bearer JWT and x-tenant-subdomain headers.
 */
export async function apiFetch<T = any>(
  endpoint: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const { token, subdomain, headers = {}, ...rest } = options;

  let activeToken = token;
  if (!activeToken && typeof window !== 'undefined') {
    activeToken = localStorage.getItem('auth_token') || undefined;
  }

  const activeSubdomain = subdomain || getSubdomain();

  const isFormData = typeof FormData !== 'undefined' && rest.body instanceof FormData;

  const finalHeaders: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(headers as Record<string, string>),
  };

  if (activeToken) {
    finalHeaders['Authorization'] = `Bearer ${activeToken}`;
  }

  if (activeSubdomain) {
    finalHeaders['x-tenant-subdomain'] = activeSubdomain;
  }

  const url = endpoint.startsWith('http')
    ? endpoint
    : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const res = await fetch(url, {
    ...rest,
    headers: finalHeaders,
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const errorMsg =
      data?.message ||
      (Array.isArray(data?.message) ? data.message.join(', ') : 'Request failed');
    const err = new Error(errorMsg) as any;
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}
