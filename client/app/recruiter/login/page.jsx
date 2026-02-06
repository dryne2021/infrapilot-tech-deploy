'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RecruiterLogin() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Get recruiters from localStorage
      const savedRecruiters = localStorage.getItem('infrapilot_recruiters')
      if (!savedRecruiters) {
        setError('No recruiters found in system. Contact admin.')
        setLoading(false)
        return
      }

      const recruiters = JSON.parse(savedRecruiters)
      
      // Find recruiter with matching credentials
      const recruiter = recruiters.find(
        r => r.username === username && r.password === password && r.isActive
      )

      if (recruiter) {
        // Create recruiter session
        const recruiterUser = {
          id: recruiter.id,
          name: recruiter.fullName,
          email: recruiter.email,
          role: 'recruiter',
          department: recruiter.department,
          specialization: recruiter.specialization,
          isActive: recruiter.isActive,
          recruiterAuthenticated: true
        }
        
        // Store in localStorage
        localStorage.setItem('infrapilot_user', JSON.stringify(recruiterUser))
        localStorage.setItem('infrapilot_token', `recruiter_${recruiter.id}`)
        localStorage.setItem('recruiter_authenticated', 'true')
        localStorage.setItem('recruiter_id', recruiter.id)
        
        // Redirect to recruiter dashboard
        router.push('/recruiter')
        router.refresh()
      } else {
        setError('Invalid credentials or account inactive. Contact admin.')
      }
    } catch (err) {
      setError('Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleDemoLogin = (role) => {
    if (role === 'john') {
      setUsername('john.smith')
      setPassword('password123')
    } else if (role === 'sarah') {
      setUsername('sarah.j')
      setPassword('password123')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-black p-4">
      <div className="max-w-md w-full p-8 bg-gray-800 rounded-2xl shadow-2xl border border-gray-700">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">👔</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Recruiter Portal</h1>
          <p className="text-gray-400">Enter your credentials to access candidate dashboard</p>
        </div>
        
        {error && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-700 rounded-lg">
            <p className="text-red-300 text-sm">{error}</p>
            <p className="text-gray-400 text-xs mt-2">Contact admin if you forgot your credentials</p>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-gray-300 mb-2 text-sm font-medium">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your username"
              required
            />
          </div>
          
          <div>
            <label className="block text-gray-300 mb-2 text-sm font-medium">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-gray-400 hover:text-white"
              >
                {showPassword ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                type="checkbox"
                className="h-4 w-4 text-blue-600 rounded"
              />
              <label className="ml-2 text-sm text-gray-400">Remember me</label>
            </div>
            <button
              type="button"
              className="text-sm text-blue-400 hover:text-blue-300"
              onClick={() => alert('Contact admin to reset password')}
            >
              Forgot password?
            </button>
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 focus:ring-4 focus:ring-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Logging in...
              </span>
            ) : (
              'Login as Recruiter'
            )}
          </button>
        </form>
        
        {/* Demo Login Buttons */}
        <div className="mt-6">
          <p className="text-gray-400 text-sm text-center mb-3">Demo Accounts:</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleDemoLogin('john')}
              className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 text-sm"
            >
              John Smith (Tech)
            </button>
            <button
              type="button"
              onClick={() => handleDemoLogin('sarah')}
              className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 text-sm"
            >
              Sarah Johnson (Finance)
            </button>
          </div>
        </div>
        
        <div className="mt-8 pt-6 border-t border-gray-700">
          <div className="text-center">
            <p className="text-gray-500 text-sm">
              Need access? Contact your administrator
            </p>
            <Link 
              href="/admin/login" 
              className="inline-block mt-2 text-sm text-blue-400 hover:text-blue-300"
            >
              Admin Login →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}