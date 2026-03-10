// client/utils/fetchWithAuth.ts
import API_BASE_URL from '@/utils/apiBase'

export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('infrapilot_token') : null

  const fullUrl = url.startsWith('/') ? `${API_BASE_URL}${url}` : url

  // Normalize headers from RequestInit (can be Headers | object | array)
  const incoming = new Headers(options.headers || undefined)

  // Only set JSON content type if the body is NOT FormData and if not already set
  const isFormData =
    typeof FormData !== 'undefined' && options.body instanceof FormData

  if (!incoming.has('Content-Type') && !isFormData) {
    incoming.set('Content-Type', 'application/json')
  }

  if (token && !incoming.has('Authorization')) {
    incoming.set('Authorization', `Bearer ${token}`)
  }

  return fetch(fullUrl, {
    ...options,
    headers: incoming,
  })
}
