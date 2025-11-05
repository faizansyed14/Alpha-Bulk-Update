import { ReactNode, useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Menu, X, Database, Upload, ChevronRight, ChevronLeft, LogOut } from 'lucide-react'
import Sidebar from './Sidebar'
import api from '../../services/api'
import toast from 'react-hot-toast'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarVisible, setSidebarVisible] = useState(true)

  // Load saved sidebar state from localStorage
  useEffect(() => {
    const savedState = localStorage.getItem('sidebarVisible')
    if (savedState !== null) {
      setSidebarVisible(savedState === 'true')
    }
  }, [])

  // Save sidebar state to localStorage
  useEffect(() => {
    localStorage.setItem('sidebarVisible', sidebarVisible.toString())
  }, [sidebarVisible])

  const toggleSidebar = () => {
    setSidebarVisible(!sidebarVisible)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50 backdrop-blur-sm bg-white/95">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Title */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Toggle sidebar"
              >
                {sidebarOpen ? (
                  <X className="h-6 w-6 text-gray-600" />
                ) : (
                  <Menu className="h-6 w-6 text-gray-600" />
                )}
              </button>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-primary-700 rounded-lg flex items-center justify-center shadow-md">
                  <Database className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Bulk Update</h1>
                  <p className="text-xs text-gray-500 hidden sm:block">Enterprise Data Management</p>
                </div>
              </div>
            </div>

            {/* Navigation Tabs - Desktop */}
            <div className="hidden md:flex items-center space-x-3">
              <nav className="flex items-center space-x-1 bg-gray-100 p-1 rounded-lg">
                <Link
                  to="/upload"
                  className={`${
                    location.pathname === '/upload' || location.pathname === '/'
                      ? 'bg-white text-primary-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  } flex items-center space-x-2 px-4 py-2 rounded-md font-medium text-sm transition-all duration-200`}
                >
                  <Upload className="h-4 w-4" />
                  <span>Upload & Update</span>
                </Link>
                <Link
                  to="/database"
                  className={`${
                    location.pathname === '/database'
                      ? 'bg-white text-primary-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  } flex items-center space-x-2 px-4 py-2 rounded-md font-medium text-sm transition-all duration-200`}
                >
                  <Database className="h-4 w-4" />
                  <span>View Database</span>
                </Link>
              </nav>
              
              {/* Logout Button */}
              <button
                onClick={async () => {
                  try {
                    await api.post('/auth/logout')
                  } catch (error) {
                    // Ignore logout errors
                  }
                  localStorage.removeItem('access_token')
                  localStorage.removeItem('token_expires_at')
                  delete api.defaults.headers.common['Authorization']
                  toast.success('Logged out successfully')
                  navigate('/login')
                }}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden lg:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex relative">
        {/* Sidebar - Desktop with Toggle Button */}
        <div className={`hidden lg:block relative transition-all duration-300 ease-in-out ${
          sidebarVisible ? 'w-72' : 'w-0'
        }`}>
          {sidebarVisible ? (
            <>
              <aside className="bg-white border-r border-gray-200 min-h-[calc(100vh-4rem)] sticky top-16 overflow-y-auto">
                <Sidebar />
              </aside>
              {/* Close Button */}
              <button
                onClick={toggleSidebar}
                className="absolute -right-3 top-24 z-10 w-6 h-6 bg-white border border-gray-300 rounded-full shadow-md hover:bg-gray-50 flex items-center justify-center transition-all hover:scale-110"
                aria-label="Close sidebar"
              >
                <ChevronLeft className="h-4 w-4 text-gray-600" />
              </button>
            </>
          ) : (
            /* Open Button */
            <button
              onClick={toggleSidebar}
              className="absolute left-0 top-24 z-10 w-6 h-6 bg-white border border-gray-300 rounded-full shadow-md hover:bg-gray-50 flex items-center justify-center transition-all hover:scale-110"
              aria-label="Open sidebar"
            >
              <ChevronRight className="h-4 w-4 text-gray-600" />
            </button>
          )}
        </div>

        {/* Sidebar - Mobile */}
        {sidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-40 flex">
            <div
              className="fixed inset-0 bg-gray-600 bg-opacity-75 transition-opacity"
              onClick={() => setSidebarOpen(false)}
            />
            <aside className="relative w-72 bg-white shadow-xl">
              <div className="absolute top-4 right-4">
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="Close sidebar"
                >
                  <X className="h-5 w-5 text-gray-600" />
                </button>
              </div>
              <Sidebar />
            </aside>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 min-h-[calc(100vh-4rem)] overflow-hidden">
          <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 h-full">
            {/* Mobile Navigation Tabs */}
            <div className="lg:hidden mb-6 space-y-3">
              <nav className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
                <Link
                  to="/upload"
                  className={`${
                    location.pathname === '/upload' || location.pathname === '/'
                      ? 'bg-white text-primary-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  } flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-md font-medium text-sm transition-all duration-200`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Upload className="h-4 w-4" />
                  <span>Upload</span>
                </Link>
                <Link
                  to="/database"
                  className={`${
                    location.pathname === '/database'
                      ? 'bg-white text-primary-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  } flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-md font-medium text-sm transition-all duration-200`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Database className="h-4 w-4" />
                  <span>Database</span>
                </Link>
              </nav>
              
              {/* Mobile Logout Button */}
              <button
                onClick={async () => {
                  try {
                    await api.post('/auth/logout')
                  } catch (error) {
                    // Ignore logout errors
                  }
                  localStorage.removeItem('access_token')
                  localStorage.removeItem('token_expires_at')
                  delete api.defaults.headers.common['Authorization']
                  toast.success('Logged out successfully')
                  navigate('/login')
                }}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </div>

            {/* Page Content */}
            <div className="space-y-6">{children}</div>
          </div>
        </main>
      </div>
    </div>
  )
}
