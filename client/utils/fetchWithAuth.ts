// client/utils/fetchWithAuth.ts
import API_BASE_URL from '@/utils/apiBase'

export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  // token stored from login page
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('infrapilot_token') : null

  const fullUrl = url.startsWith('/') ? `${API_BASE_URL}${url}` : url

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  return fetch(fullUrl, {
    ...options,
    headers,
  })
}
