'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'

export interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'recruiter' | 'candidate'
  status: 'active' | 'inactive'
  assignedCandidates?: string[]
  assignedRecruiterId?: string
  skills?: string[]
  experience?: string
  createdAt: string
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

// Mock users for development
const mockUsers: User[] = [
  {
    id: '1',
    name: 'Admin User',
    email: 'admin@infrapilot.com',
    role: 'admin',
    status: 'active',
    createdAt: new Date().toISOString()
  },
  {
    id: '2',
    name: 'John Recruiter',
    email: 'recruiter@infrapilot.com',
    role: 'recruiter',
    status: 'active',
    assignedCandidates: ['3', '4', '5'],
    createdAt: new Date().toISOString()
  },
  {
    id: '3',
    name: 'Jane Candidate',
    email: 'candidate@infrapilot.com',
    role: 'candidate',
    status: 'active',
    skills: ['React', 'Node.js', 'TypeScript'],
    experience: '3 years',
    assignedRecruiterId: '2',
    createdAt: new Date().toISOString()
  }
]

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  // Check for stored auth on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check localStorage for stored user
        const storedUser = localStorage.getItem('infrapilot_user')
        const storedToken = localStorage.getItem('infrapilot_token')

        if (storedUser && storedToken) {
          const userData = JSON.parse(storedUser)
          
          // Find user in mock data
          const foundUser = mockUsers.find(u => u.id === userData.id)
          
          if (foundUser) {
            setUser(foundUser)
            
            // Redirect based on role if on login page
            if (pathname === '/login') {
              redirectBasedOnRole(foundUser.role)
            }
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error)
        localStorage.removeItem('infrapilot_user')
        localStorage.removeItem('infrapilot_token')
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [pathname])

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

  const login = async (email: string, password: string) => {
    setIsLoading(true)
    try {
      // Find user in mock data
      const foundUser = mockUsers.find(u => u.email === email)
      
      if (!foundUser) {
        return { success: false, message: 'Invalid credentials' }
      }

      // Check password
      if (password !== 'password123') {
        return { success: false, message: 'Invalid credentials' }
      }

      // Store auth data
      const token = `mock-jwt-token-${foundUser.id}`
      localStorage.setItem('infrapilot_token', token)
      localStorage.setItem('infrapilot_user', JSON.stringify(foundUser))
      
      setUser(foundUser)
      redirectBasedOnRole(foundUser.role)

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
      // Check if user already exists
      const userExists = mockUsers.some(u => u.email === userData.email)
      if (userExists) {
        return { success: false, message: 'User already exists' }
      }

      // Create new user
      const newUser: User = {
        id: `mock-${Date.now()}`,
        name: userData.name || '',
        email: userData.email || '',
        role: userData.role || 'candidate',
        status: 'active',
        skills: userData.skills || [],
        experience: userData.experience || '',
        createdAt: new Date().toISOString()
      }

      // Mock storage
      const token = `mock-jwt-token-${newUser.id}`
      localStorage.setItem('infrapilot_token', token)
      localStorage.setItem('infrapilot_user', JSON.stringify(newUser))
      
      setUser(newUser)
      redirectBasedOnRole(newUser.role)

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

  const value = {
    user,
    isLoading,
    login,
    logout,
    register,
    updateUser,
    isAuthenticated: !!user
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
