import API_BASE_URL from '@/utils/apiBase'

export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('infrapilot_token') : null

  const fullUrl = url.startsWith('/') ? `${API_BASE_URL}${url}` : url

  const incoming = new Headers(options.headers || undefined)

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
    credentials: 'include', // ⭐ IMPORTANT
    headers: incoming,
  })
}