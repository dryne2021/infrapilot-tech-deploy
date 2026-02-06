'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Hardcoded admin credentials
      const ADMIN_CREDENTIALS = {
        email: 'admin@infrapilot.com',
        password: 'Admin@123'
      }

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500))

      if (email === ADMIN_CREDENTIALS.email && password === ADMIN_CREDENTIALS.password) {
        const adminUser = {
          id: 'admin_001',
          name: 'Administrator',
          email: ADMIN_CREDENTIALS.email,
          role: 'admin',
          isAdmin: true,
          adminAuthenticated: true
        }
        
        localStorage.setItem('infrapilot_user', JSON.stringify(adminUser))
        localStorage.setItem('infrapilot_token', 'admin_auth_token')
        localStorage.setItem('admin_authenticated', 'true')
        
        router.push('/admin')
        router.refresh()
      } else {
        setError('Invalid admin credentials')
      }
    } catch (err) {
      setError('Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-black p-4">
      <div className="max-w-md w-full p-8 bg-gray-800 rounded-2xl shadow-2xl border border-gray-700">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🔐</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Admin Portal</h1>
          <p className="text-gray-400">Enter admin credentials to continue</p>
        </div>
        
        {error && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-700 rounded-lg">
            <p className="text-red-300 text-sm">{error}</p>
            <p className="text-gray-400 text-xs mt-2">For demo: admin@infrapilot.com / Admin@123</p>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-gray-300 mb-2 text-sm font-medium">Admin Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="admin@infrapilot.com"
              required
            />
          </div>
          
          <div>
            <label className="block text-gray-300 mb-2 text-sm font-medium">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="••••••••"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 focus:ring-4 focus:ring-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Authenticating...
              </span>
            ) : (
              'Login as Administrator'
            )}
          </button>
        </form>
        
        <div className="mt-8 pt-6 border-t border-gray-700">
          <p className="text-gray-500 text-sm text-center">
            ⚠️ This portal is for authorized personnel only
          </p>
        </div>
      </div>
    </div>
  )
}