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
  let apiUrl = process.env.NEXT_PUBLIC_API_URL;
  
  // Log environment status to help debug issues
  if (typeof window !== 'undefined') {
    const logKey = '__api_client_log_shown__';
    // Only log once per page load to avoid spam
    if (!(window as any)[logKey]) {
      console.log('🔧 API CLIENT DEBUG INFO:');
      console.log('   NEXT_PUBLIC_API_URL:', apiUrl || '❌ NOT SET');
      console.log('   NODE_ENV:', process.env.NODE_ENV);
      console.log('   Current URL:', window.location.href);
      (window as any)[logKey] = true;
    }
  }
  
  if (!apiUrl) {
    console.warn('❌ CRITICAL: NEXT_PUBLIC_API_URL is not set. Frontend will make relative API requests which will fail with 404!');
    console.warn('   Fix: Set NEXT_PUBLIC_API_URL environment variable and restart dev server (or redeploy)');
    return ''; // Will make relative requests
  }
  
  // Ensure URL has protocol
  if (!apiUrl.startsWith('http://') && !apiUrl.startsWith('https://')) {
    console.warn(`⚠️  NEXT_PUBLIC_API_URL missing protocol. Adding https://`);
    apiUrl = `https://${apiUrl}`;
  }
  
  // Remove trailing slash
  return apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
};

// Build the full URL for API requests
const buildUrl = (path: string): string => {
  const baseUrl = getBackendUrl();
  
  if (!baseUrl) {
    const relativeUrl = path.startsWith('/') ? path : `/${path}`;
    console.warn(
      `⚠️  NO BACKEND URL - Using relative URL: ${relativeUrl}\n` +
      `    This will make requests to: ${typeof window !== 'undefined' ? window.location.origin : 'unknown'}\${relativeUrl}\n` +
      `    This typically results in 404 errors!`
    );
    return relativeUrl;
  }
  
  // Ensure path starts with /
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const fullUrl = `${baseUrl}${cleanPath}`;
  
  if (process.env.NODE_ENV === 'development') {
    console.log('✅ Full API URL:', fullUrl);
  }
  
  return fullUrl;
};

export async function apiFetch<T>(
  url: string,
  options?: RequestInit
): Promise<{ data: T | null; error: string | null }> {
  try {
    const fullUrl = buildUrl(url);
    const method = options?.method || 'GET';
    
    if (process.env.NODE_ENV === 'development' || !process.env.NEXT_PUBLIC_API_URL) {
      console.log(`📤 ${method} ${fullUrl}`);
      if (options?.body) {
        try {
          console.log('   Body:', JSON.parse(options.body as string));
        } catch {
          console.log('   Body:', options.body);
        }
      }
    }
    
    // Add cache busting headers to prevent 304 responses
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      ...options?.headers,
    };
    
    // Add timestamp to prevent caching
    const urlWithTimestamp = fullUrl.includes('?') 
      ? `${fullUrl}&_t=${Date.now()}` 
      : `${fullUrl}?_t=${Date.now()}`;
    
    const response = await fetch(urlWithTimestamp, {
      ...options,
      headers,
    });

    if (process.env.NODE_ENV === 'development' || !process.env.NEXT_PUBLIC_API_URL) {
      console.log(`📥 Response: ${response.status} ${response.statusText}`);
    }

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

        const error = `HTTP ${response.status}: ${errorMessage}`;
        console.error(`❌ API Error: ${error}`);
        return { data: null, error };
      } catch (e) {
        // If we can't parse the error response, return generic message
        const error = `HTTP ${response.status} - ${response.statusText}`;
        console.error(`❌ API Error: ${error}`);
        return { data: null, error };
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
