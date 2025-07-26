// A simple wrapper for fetch to handle common cases like base URL, headers, and error handling.
// In a real app, this would be more robust, likely using a library like axios or tanstack-query.

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

async function handleResponse<T>(response: Response): Promise<{ success: boolean; data?: T; error?: string }> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'An unknown error occurred' }));
    return { success: false, error: errorData.error || `Request failed with status ${response.status}` };
  }
  if (response.status === 204) {
    return { success: true };
  }
  const data = await response.json();
  return data;
}

export const apiClient = {
  get: async <T>(path: string): Promise<{ success: boolean; data?: T; error?: string }> => {
    // This assumes a mechanism for attaching the auth token is in place,
    // e.g., an interceptor or a context provider.
    const response = await fetch(`${API_BASE}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        // 'Authorization': `Bearer ${getAuthToken()}`
      },
    });
    return handleResponse<T>(response);
  },

  post: async <T>(path:string, body: any): Promise<{ success: boolean; data?: T; error?: string }> => {
    const response = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // 'Authorization': `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify(body),
    });
    return handleResponse<T>(response);
  },
  
  // ... other methods like put, delete
};

export interface Portfolio {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  gpu_count?: number; // This would be a nice addition from the API
}