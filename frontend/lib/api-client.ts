/**
 * Enhanced API client with comprehensive error handling
 * Prevents JSON parsing errors and provides clear error messages
 */

interface ApiErrorResponse {
  detail?: string;
  message?: string;
  error?: string;
}

// Get the backend API URL from environment variable
// Must start with NEXT_PUBLIC_ to be available in browser
const getBackendUrl = (): string => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) {
    console.warn('NEXT_PUBLIC_API_URL is not set. API calls may fail.');
    return ''; // Will make relative requests
  }
  return apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
};

// Build the full URL for API requests
const buildUrl = (path: string): string => {
  const baseUrl = getBackendUrl();
  if (!baseUrl) {
    console.warn('❌ No baseUrl set. Using relative URL:', path);
    return path; // Relative URL
  }
  // Ensure path starts with /
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const fullUrl = `${baseUrl}${cleanPath}`;
  console.log('✅ API URL:', fullUrl);
  return fullUrl;
};

export async function apiFetch<T>(
  url: string,
  options?: RequestInit
): Promise<{ data: T | null; error: string | null }> {
  try {
    const fullUrl = buildUrl(url);
    console.log(`📤 ${options?.method || 'GET'} ${fullUrl}`, options?.body ? JSON.parse(options.body as string) : '');
    const response = await fetch(fullUrl, {
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
