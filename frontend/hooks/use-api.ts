'use client';

import { useCallback, useMemo } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api-client';

interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

/**
 * Deprecated: Use apiGet, apiPost, apiPut, apiDelete from @/lib/api-client instead
 * This hook is kept for backwards compatibility but delegates to centralized API client
 */
export function useApi() {
  // Relay API methods
  const relays = useMemo(() => ({
    list: () => apiGet<any[]>('/api/relays'),
    get: (id: string) => apiGet<any>(`/api/relays/${id}`),
    create: (data: any) => apiPost<any>('/api/relays', data),
    update: (id: string, data: any) => apiPut<any>(`/api/relays/${id}`, data),
    delete: (id: string) => apiDelete<any>(`/api/relays/${id}`),
    test: (id: string) => apiPost<any>(`/api/relays/${id}/test`, {}),
  }), []);

  // Template API methods
  const templates = useMemo(() => ({
    list: () => apiGet<any[]>('/api/templates'),
    get: (id: string) => apiGet<any>(`/api/templates/${id}`),
    create: (data: any) => apiPost<any>('/api/templates', data),
    update: (id: string, data: any) => apiPut<any>(`/api/templates/${id}`, data),
    delete: (id: string) => apiDelete<any>(`/api/templates/${id}`),
  }), []);

  // Campaign API methods
  const campaigns = useMemo(() => ({
    list: () => apiGet<any[]>('/api/campaigns'),
    get: (id: string) => apiGet<any>(`/api/campaigns/${id}`),
    getStatus: (id: string) => apiGet<any>(`/api/campaigns/${id}/status`),
    enqueue: (data: any) => apiPost<any>('/api/campaigns/enqueue', data),
  }), []);

  return {
    relays,
    templates,
    campaigns,
  };
}
