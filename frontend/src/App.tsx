import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Layout from './components/Common/Layout'
import UploadTab from './components/Upload/UploadTab'
import DatabaseTab from './components/Database/DatabaseTab'
import LoginPage from './components/Auth/LoginPage'
import ProtectedRoute from './components/Auth/ProtectedRoute'

// Component to handle root route redirect
function RootRedirect() {
  // Check authentication synchronously - this runs on every render
  // We need to check localStorage immediately when component mounts
  const token = localStorage.getItem('access_token')
  const expiresAt = localStorage.getItem('token_expires_at')
  
  // Clean up expired tokens
  if (token && expiresAt) {
    const expiryTime = parseInt(expiresAt)
    if (isNaN(expiryTime) || Date.now() > expiryTime) {
      localStorage.removeItem('access_token')
      localStorage.removeItem('token_expires_at')
      return <Navigate to="/login" replace />
    }
  }
  
  // If no token, redirect to login
  if (!token || !expiresAt) {
    return <Navigate to="/login" replace />
  }
  
  // If token exists and is valid, redirect to upload
  const isValid = Date.now() <= parseInt(expiresAt)
  if (isValid) {
    return <Navigate to="/upload" replace />
  }
  
  // Default: redirect to login
  return <Navigate to="/login" replace />
}

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        
        {/* Root route - redirect based on auth */}
        <Route path="/" element={<RootRedirect />} />
        
        {/* Protected Routes */}
        <Route
          path="/upload"
          element={
            <ProtectedRoute>
              <Layout>
                <UploadTab />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/database"
          element={
            <ProtectedRoute>
              <Layout>
                <DatabaseTab />
              </Layout>
            </ProtectedRoute>
          }
        />
        
        {/* Redirect unknown routes to login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
      <Toaster position="top-right" />
    </Router>
  )
}

export default App
