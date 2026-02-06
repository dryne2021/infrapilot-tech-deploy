'use client'

import { ReactNode, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  Home, 
  Users, 
  Briefcase, 
  BarChart3, 
  Settings,
  UserPlus,
  FileText,
  LogOut,
  Menu,
  X
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

interface NavItem {
  name: string
  href: string
  icon: React.ElementType
  badge?: number
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()
  const { user, logout } = useAuth()

  const navigation: NavItem[] = [
    { name: 'Dashboard', href: '/admin', icon: Home },
    { name: 'Candidates', href: '/admin/candidates', icon: Users, badge: 42 },
    { name: 'Recruiters', href: '/admin/recruiters', icon: UserPlus },
    { name: 'Job Applications', href: '/admin/applications', icon: Briefcase, badge: 156 },
    { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
    { name: 'Reports', href: '/admin/reports', icon: FileText },
    { name: 'Settings', href: '/admin/settings', icon: Settings },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar toggle */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-md bg-white shadow-md"
        >
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-white border-r transform transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
      `}>
        {/* Logo */}
        <div className="h-16 border-b flex items-center justify-center">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg"></div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Infrapilot</h1>
              <p className="text-xs text-gray-500">Admin Panel</p>
            </div>
          </div>
        </div>

        {/* User Profile */}
        <div className="p-4 border-b">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="font-bold text-blue-600">A</span>
            </div>
            <div>
              <p className="font-medium text-gray-900">{user?.name || 'Admin User'}</p>
              <p className="text-sm text-gray-500">Administrator</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4">
          <ul className="space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={`
                      flex items-center justify-between px-4 py-3 rounded-lg transition-colors
                      ${isActive 
                        ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-600' 
                        : 'text-gray-700 hover:bg-gray-100'
                      }
                    `}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <div className="flex items-center space-x-3">
                      <item.icon size={20} />
                      <span className="font-medium">{item.name}</span>
                    </div>
                    {item.badge && (
                      <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-1 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Logout Button */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
          <button
            onClick={() => logout()}
            className="flex items-center justify-center w-full px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut size={20} />
            <span className="ml-3 font-medium">Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Top Bar */}
        <header className="bg-white border-b">
          <div className="px-6 h-16 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {navigation.find(item => pathname === item.href)?.name || 'Dashboard'}
              </h2>
              <p className="text-sm text-gray-500">Manage your recruitment platform</p>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <button className="relative p-2 text-gray-500 hover:text-gray-700">
                <div className="w-2 h-2 bg-red-500 rounded-full absolute top-1 right-1"></div>
                🔔
              </button>
              
              {/* Quick Stats */}
              <div className="hidden md:flex items-center space-x-6">
                <div className="text-right">
                  <p className="text-sm text-gray-500">Active Users</p>
                  <p className="font-semibold">1,234</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Applications</p>
                  <p className="font-semibold">156</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  )
}