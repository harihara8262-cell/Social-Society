const BASE_URL = 'http://localhost:5000/api';

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
  details?: any;
}

/**
 * Custom fetch wrapper to interact with the backend API
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  
  // Set credentials to 'include' to ensure cookies are sent with every request
  const defaultOptions: RequestInit = {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  };

  // Merge headers if provided
  const mergedHeaders = {
    ...defaultOptions.headers,
    ...options.headers,
  };

  // If body is FormData (e.g. file upload), let the browser set the boundary header
  if (options.body instanceof FormData) {
    const headersObj = mergedHeaders as Record<string, string>;
    delete headersObj['Content-Type'];
  }

  const mergedOptions: RequestInit = {
    ...defaultOptions,
    ...options,
    headers: mergedHeaders,
  };

  const response = await fetch(url, mergedOptions);

  let data: any = {};
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = { message: await response.text() };
  }

  if (!response.ok) {
    const errorMsg = data.message || data.detail || data.error || `HTTP error! status: ${response.status}`;
    const error: any = new Error(errorMsg);
    error.status = response.status;
    error.details = data.details || null;
    throw error;
  }

  return data as T;
}
