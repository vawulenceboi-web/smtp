/**
 * Enhanced API client with comprehensive error handling
 * Prevents JSON parsing errors and provides clear error messages
 */

interface ApiErrorResponse {
  detail?: string;
  message?: string;
  error?: string;
}

export async function apiFetch<T>(
  url: string,
  options?: RequestInit
): Promise<{ data: T | null; error: string | null }> {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    // Handle non-OK responses
    if (!response.ok) {
      try {
        const contentType = response.headers.get('content-type');
        let errorMessage = `HTTP ${response.status}`;

        // Try to parse error response if it's JSON
        if (contentType?.includes('application/json')) {
          const errorData: ApiErrorResponse = await response.json();
          errorMessage = errorData.detail || errorData.message || errorData.error || errorMessage;
        } else {
          // If not JSON, get plain text or just use status code
          const text = await response.text();
          if (text && text.length > 0 && text.length < 500) {
            errorMessage = text;
          }
        }

        return { data: null, error: errorMessage };
      } catch (e) {
        // If we can't parse the error response, return generic message
        return { data: null, error: `HTTP ${response.status} - ${response.statusText}` };
      }
    }

    // Handle successful response
    try {
      const contentType = response.headers.get('content-type');

      // Check if response has content
      if (response.status === 204 || !contentType?.includes('application/json')) {
        return { data: null, error: null };
      }

      const text = await response.text();
      if (!text || text.trim() === '') {
        return { data: null, error: null };
      }

      const data: T = JSON.parse(text);
      return { data, error: null };
    } catch (parseError) {
      const message = parseError instanceof Error ? parseError.message : 'Failed to parse response';
      return { data: null, error: `JSON Parse Error: ${message}` };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Network error';
    return { data: null, error: `Fetch Error: ${message}` };
  }
}

/**
 * Convenience method for POST requests
 */
export async function apiPost<T>(
  url: string,
  body?: any
): Promise<{ data: T | null; error: string | null }> {
  return apiFetch<T>(url, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * Convenience method for GET requests
 */
export async function apiGet<T>(
  url: string
): Promise<{ data: T | null; error: string | null }> {
  return apiFetch<T>(url, { method: 'GET' });
}

/**
 * Convenience method for PUT requests
 */
export async function apiPut<T>(
  url: string,
  body?: any
): Promise<{ data: T | null; error: string | null }> {
  return apiFetch<T>(url, {
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * Convenience method for DELETE requests
 */
export async function apiDelete<T>(
  url: string
): Promise<{ data: T | null; error: string | null }> {
  return apiFetch<T>(url, { method: 'DELETE' });
}
