import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Image from 'next/image'
import './globals.css'
import { AuthProvider } from '../contexts/AuthContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Infrapilot Tech - Job Application Support Platform',
  description: 'Professional job application management for candidates, recruiters, and administrators',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full bg-gray-50`}>
        <AuthProvider>
          <div className="min-h-screen flex flex-col">
            
            {/* Main content area */}
            <main className="flex-1">
              {children}
            </main>
            
            {/* Footer */}
            <footer className="bg-white border-t py-4 mt-auto">
              <div className="container mx-auto px-4">
                <div className="flex flex-col md:flex-row justify-between items-center">
                  
                  {/* Logo + Company Info */}
                  <div className="mb-4 md:mb-0 flex items-center gap-3">
                    <Image
                      src="/logo.jpeg"
                      alt="Infrapilot Tech Logo"
                      width={50}
                      height={50}
                      className="object-contain"
                    />
                    <div>
                      <h2 className="text-xl font-bold text-blue-600">
                        Infrapilot Tech
                      </h2>
                      <p className="text-gray-600 text-sm">
                        Your job application support platform
                      </p>
                    </div>
                  </div>

                  {/* Footer Text */}
                  <div className="text-gray-500 text-sm text-center md:text-right">
                    <p>
                      © {new Date().getFullYear()} Infrapilot Tech. All rights reserved.
                    </p>
                    <p className="mt-1">
                      Secure & Professional Job Application Management
                    </p>
                  </div>

                </div>
              </div>
            </footer>

          </div>
        </AuthProvider>
      </body>
    </html>
  )
}
