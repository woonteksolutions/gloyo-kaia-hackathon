import { getAccessToken } from "@/auth/token";
import { getGnosisAuthUrl } from "@/config/api-endpoints";

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const accessToken = getAccessToken();
  const fullUrl = `${getGnosisAuthUrl()}${path}`;
  
  console.log('🚀 API Request:', {
    method: init.method || 'GET',
    path,
    fullUrl,
    hasToken: !!accessToken
  });

  const res = await fetch(fullUrl, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  });
  
  console.log('🚀 API Response:', {
    status: res.status,
    statusText: res.statusText,
    path,
    headers: Object.fromEntries(res.headers.entries())
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errorMessage = (data && (data.message || data.error)) || `API ${res.status} ${path}`;
    console.error('🚀 API Error:', {
      path,
      status: res.status,
      error: errorMessage,
      data
    });
    throw new Error(errorMessage);
  }
  return data as T;
}