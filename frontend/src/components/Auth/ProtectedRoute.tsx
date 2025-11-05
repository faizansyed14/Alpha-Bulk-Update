import { ReactNode, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import api from '../../services/api'

interface ProtectedRouteProps {
  children: ReactNode
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('access_token')
      const expiresAt = localStorage.getItem('token_expires_at')

      // Check if token exists and is not expired (synchronous check first)
      if (!token || !expiresAt) {
        setIsAuthenticated(false)
        navigate('/login', { replace: true })
        return
      }

      // Check if token is expired
      if (Date.now() > parseInt(expiresAt)) {
        localStorage.removeItem('access_token')
        localStorage.removeItem('token_expires_at')
        delete api.defaults.headers.common['Authorization']
        setIsAuthenticated(false)
        navigate('/login', { replace: true })
        return
      }

      // Verify token with backend
      try {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`
        const response = await api.get('/auth/verify')
        if (response.data.valid) {
          setIsAuthenticated(true)
        } else {
          localStorage.removeItem('access_token')
          localStorage.removeItem('token_expires_at')
          delete api.defaults.headers.common['Authorization']
          setIsAuthenticated(false)
          navigate('/login', { replace: true })
        }
      } catch (error) {
        localStorage.removeItem('access_token')
        localStorage.removeItem('token_expires_at')
        delete api.defaults.headers.common['Authorization']
        setIsAuthenticated(false)
        navigate('/login', { replace: true })
      }
    }

    checkAuth()
  }, [navigate])

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-blue-50 to-gray-100 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-12 w-12 text-primary-600 animate-spin" />
          <p className="text-gray-600 font-medium">Verifying authentication...</p>
        </div>
      </div>
    )
  }

  if (isAuthenticated === false) {
    return null // Will redirect to login
  }

  return <>{children}</>
}

