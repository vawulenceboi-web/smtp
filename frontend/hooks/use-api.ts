'use client';

import { useCallback } from 'react';

interface FetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  headers?: Record<string, string>;
}

interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

export function useApi() {
  const request = useCallback(
    async <T,>(
      endpoint: string,
      options: FetchOptions = {}
    ): Promise<ApiResponse<T>> => {
      try {
        const { method = 'GET', body, headers = {} } = options;
        
        const fetchOptions: RequestInit = {
          method,
          headers: {
            'Content-Type': 'application/json',
            ...headers,
          },
        };

        if (body) {
          fetchOptions.body = JSON.stringify(body);
        }

        const response = await fetch(`${API_BASE_URL}${endpoint}`, fetchOptions);

        if (!response.ok) {
          throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();
        return { data, error: null, loading: false };
      } catch (err) {
        const error = err instanceof Error ? err.message : 'Unknown error occurred';
        return { data: null, error, loading: false };
      }
    },
    []
  );

  // Relay API methods
  const relays = {
    list: useCallback(() => request<any[]>('/relays'), [request]),
    get: useCallback((id: string) => request<any>(`/relays/${id}`), [request]),
    create: useCallback((data: any) => request<any>('/relays', { method: 'POST', body: data }), [request]),
    update: useCallback((id: string, data: any) => request<any>(`/relays/${id}`, { method: 'PUT', body: data }), [request]),
    delete: useCallback((id: string) => request<any>(`/relays/${id}`, { method: 'DELETE' }), [request]),
    test: useCallback((id: string) => request<any>(`/relays/${id}/test`, { method: 'POST' }), [request]),
  };

  // Template API methods
  const templates = {
    list: useCallback(() => request<any[]>('/templates'), [request]),
    get: useCallback((id: string) => request<any>(`/templates/${id}`), [request]),
    create: useCallback((data: any) => request<any>('/templates', { method: 'POST', body: data }), [request]),
    update: useCallback((id: string, data: any) => request<any>(`/templates/${id}`, { method: 'PUT', body: data }), [request]),
    delete: useCallback((id: string) => request<any>(`/templates/${id}`, { method: 'DELETE' }), [request]),
  };

  // Campaign API methods
  const campaigns = {
    list: useCallback(() => request<any[]>('/campaigns'), [request]),
    get: useCallback((id: string) => request<any>(`/campaigns/${id}`), [request]),
    getStatus: useCallback((id: string) => request<any>(`/campaigns/${id}/status`), [request]),
    enqueue: useCallback((data: any) => request<any>('/campaigns/enqueue', { method: 'POST', body: data }), [request]),
  };

  return {
    request,
    relays,
    templates,
    campaigns,
  };
}
