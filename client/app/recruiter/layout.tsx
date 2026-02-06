'use client'

import { usePathname } from 'next/navigation'

export default function RecruiterLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  
  return (
    <div>
      {/* You can add recruiter-specific header/nav here */}
      <main>
        {children}
      </main>
    </div>
  )
}