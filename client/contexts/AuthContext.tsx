'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'

export interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'recruiter' | 'candidate'
  status?: 'active' | 'inactive'
  assignedCandidates?: string[]
  assignedRecruiterId?: string
  skills?: string[]
  experience?: string
  createdAt?: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>
  logout: () => void
  register: (userData: Partial<User> & { password: string }) => Promise<{ success: boolean; message: string }>
  updateUser: (userData: Partial<User>) => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// ✅ Backend base URL (set NEXT_PUBLIC_API_URL in Render/Vercel for the frontend)
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ||
  'https://infrapilot-tech-deploy.onrender.com'

// ---------- helpers ----------
const safeJsonParse = <T,>(value: string | null): T | null => {
  if (!value) return null
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

const normalizeUser = (apiUser: any): User => {
  return {
    id: apiUser?._id || apiUser?.id || apiUser?.userId || '',
    name: apiUser?.name || apiUser?.fullName || '',
    email: apiUser?.email || '',
    role: apiUser?.role || 'candidate',
    status: apiUser?.status,
    skills: apiUser?.skills,
    experience: apiUser?.experience,
    createdAt: apiUser?.createdAt
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  const redirectBasedOnRole = (role: string) => {
    switch (role) {
      case 'admin':
        router.push('/admin')
        break
      case 'recruiter':
        router.push('/recruiter')
        break
      case 'candidate':
        router.push('/candidate')
        break
      default:
        router.push('/login')
    }
  }

  // ✅ Load session on mount by validating token with /auth/me
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const storedToken = localStorage.getItem('infrapilot_token')
        const storedUser = safeJsonParse<User>(localStorage.getItem('infrapilot_user'))

        if (!storedToken) {
          setUser(null)
          return
        }

        // Try to validate token and fetch real user
        const res = await fetch(`${API_BASE}/api/v1/auth/me`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${storedToken}`
          }
        })

        if (!res.ok) {
          // token invalid/expired
          localStorage.removeItem('infrapilot_token')
          localStorage.removeItem('infrapilot_user')
          setUser(null)
          return
        }

        const data = await res.json()

        // Your backend returns: { success, user, profile }
        const apiUser = data?.user || data?.data || data
        const normalized = normalizeUser(apiUser)

        // Update local storage & state
        localStorage.setItem('infrapilot_user', JSON.stringify(normalized))
        setUser(normalized)

        // If user is on login page, redirect
        if (pathname === '/login') {
          redirectBasedOnRole(normalized.role)
        }
      } catch (error) {
        console.error('Auth check failed:', error)
        localStorage.removeItem('infrapilot_token')
        localStorage.removeItem('infrapilot_user')
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  const login = async (email: string, password: string) => {
    setIsLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok || data?.success === false) {
        return { success: false, message: data?.error || data?.message || 'Invalid credentials' }
      }

      // Your backend returns: { success, token, ... }
      const token = data?.token
      if (!token) {
        return { success: false, message: 'Login failed: token missing from server response.' }
      }

      localStorage.setItem('infrapilot_token', token)

      // Immediately fetch /me so we store the real user role
      const meRes = await fetch(`${API_BASE}/api/v1/auth/me`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      })

      if (!meRes.ok) {
        localStorage.removeItem('infrapilot_token')
        return { success: false, message: 'Login failed: could not fetch user profile.' }
      }

      const meData = await meRes.json()
      const apiUser = meData?.user || meData?.data || meData
      const normalized = normalizeUser(apiUser)

      localStorage.setItem('infrapilot_user', JSON.stringify(normalized))
      setUser(normalized)
      redirectBasedOnRole(normalized.role)

      return { success: true, message: 'Login successful' }
    } catch (error) {
      console.error('Login failed:', error)
      return { success: false, message: 'Login failed. Please try again.' }
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    localStorage.removeItem('infrapilot_token')
    localStorage.removeItem('infrapilot_user')
    setUser(null)
    router.push('/login')
  }

  const register = async (userData: Partial<User> & { password: string }) => {
    setIsLoading(true)
    try {
      // Map frontend fields to your backend register fields
      const payload = {
        name: userData.name,
        email: userData.email,
        password: userData.password,
        role: userData.role || 'candidate',
        skills: userData.skills || [],
        experienceLevel: (userData as any).experienceLevel || 'entry'
      }

      const res = await fetch(`${API_BASE}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok || data?.success === false) {
        return { success: false, message: data?.error || data?.message || 'Registration failed' }
      }

      const token = data?.token
      if (!token) {
        return { success: false, message: 'Registration failed: token missing from server response.' }
      }

      localStorage.setItem('infrapilot_token', token)

      // Fetch /me to store the real user
      const meRes = await fetch(`${API_BASE}/api/v1/auth/me`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      })

      const meData = await meRes.json().catch(() => ({}))
      const apiUser = meData?.user || meData?.data || meData
      const normalized = normalizeUser(apiUser)

      localStorage.setItem('infrapilot_user', JSON.stringify(normalized))
      setUser(normalized)
      redirectBasedOnRole(normalized.role)

      return { success: true, message: 'Registration successful' }
    } catch (error) {
      console.error('Registration failed:', error)
      return { success: false, message: 'Registration failed. Please try again.' }
    } finally {
      setIsLoading(false)
    }
  }

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData }
      setUser(updatedUser)
      localStorage.setItem('infrapilot_user', JSON.stringify(updatedUser))
    }
  }

  const value: AuthContextType = {
    user,
    isLoading,
    login,
    logout,
    register,
    updateUser,
    isAuthenticated: !!user
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
