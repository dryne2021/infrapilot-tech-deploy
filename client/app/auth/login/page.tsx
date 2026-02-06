'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    // For demo: Accept any credentials or empty
    const userEmail = email || 'admin@infrapilot.com'
    const userPassword = password || 'password123'
    
    // Mock login delay
    setTimeout(() => {
      // Determine role based on email or default to admin
      let role = 'admin'
      if (userEmail.includes('recruiter')) role = 'recruiter'
      if (userEmail.includes('candidate')) role = 'candidate'
      
      localStorage.setItem('infrapilot_user', JSON.stringify({
        id: '1',
        email: userEmail,
        name: role.charAt(0).toUpperCase() + role.slice(1) + ' User',
        role: role
      }))
      localStorage.setItem('infrapilot_token', 'mock-token')
      router.push(`/${role}`)
      setLoading(false)
    }, 500)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-gray-100 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-block p-3 bg-blue-600 rounded-xl mb-4">
            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center">
              <span className="text-2xl font-bold text-blue-600">IP</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Infrapilot Tech</h1>
          <p className="text-gray-600 mt-2">Job Application Support Platform</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Sign in to your account</h2>
          <p className="text-gray-600 mb-6">Enter credentials or leave empty for demo</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="admin@infrapilot.com"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="password123"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Signing in...
                </span>
              ) : 'Sign In'}
            </button>
          </form>

          {/* Demo Info */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-2">Demo Credentials:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• <strong>Admin:</strong> admin@infrapilot.com / password123</li>
              <li>• <strong>Recruiter:</strong> recruiter@infrapilot.com / password123</li>
              <li>• <strong>Candidate:</strong> candidate@example.com / password123</li>
              <li className="mt-2 text-blue-700">Or leave fields empty for auto login</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}