'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'

export default function CandidateLayout({ children }) {
  const router = useRouter()
  const pathname = usePathname()
  const [ready, setReady] = useState(false)

  const PUBLIC_ROUTES = ['/candidate/login']

  useEffect(() => {
    // ✅ allow login page
    if (PUBLIC_ROUTES.includes(pathname)) {
      setReady(true)
      return
    }

    const token = localStorage.getItem('infrapilot_token')
    const userStr = localStorage.getItem('infrapilot_user')

    if (!token || !userStr) {
      router.replace('/candidate/login')
      return
    }

    try {
      const user = JSON.parse(userStr)
      if (user.role !== 'candidate') {
        router.replace('/candidate/login')
        return
      }
    } catch {
      router.replace('/candidate/login')
      return
    }

    setReady(true)
  }, [pathname, router])

  if (!ready) return null

  return <>{children}</>
}
