import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Database, Info, AlertTriangle, Trash2, CheckCircle2, XCircle } from 'lucide-react'
import api from '../../services/api'
import { StatsResponse } from '../../services/types'
import toast from 'react-hot-toast'

export default function Sidebar() {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const { data: stats, refetch } = useQuery<StatsResponse>({
    queryKey: ['stats'],
    queryFn: async () => {
      const response = await api.get('/records/stats')
      return response.data
    },
  })

  const handleDeleteAll = async () => {
    try {
      await api.delete('/records?confirm=true')
      toast.success('Database deleted successfully')
      setShowDeleteConfirm(false)
      refetch()
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Error deleting database')
    }
  }

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      {/* Database Status Card */}
      <div className="card">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
            <Database className="h-5 w-5 text-primary-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Database Status</h2>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm font-medium text-gray-600">Connection</span>
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-sm font-semibold text-green-600">Connected</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm font-medium text-gray-600">Total Records</span>
            <span className="text-lg font-bold text-gray-900">
              {stats?.total_records?.toLocaleString() || '0'}
            </span>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm font-medium text-gray-600">Columns</span>
            <span className="text-lg font-bold text-primary-600">
              {stats?.columns || 6}
            </span>
          </div>
        </div>
      </div>

      {/* Required Columns Info */}
      <div className="card">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Info className="h-5 w-5 text-blue-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Required Columns</h2>
        </div>
        
        <div className="space-y-2">
          {['Company', 'Name', 'Surname', 'Email', 'Position', 'Phone'].map((col) => (
            <div
              key={col}
              className="flex items-center space-x-2 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
              <span className="text-sm font-medium text-gray-700">{col}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Database Actions */}
      <div className="card border-red-200">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Danger Zone</h2>
        </div>
        
        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full btn-primary bg-red-600 hover:bg-red-700 focus:ring-red-500"
          >
            <Trash2 className="h-4 w-4 inline mr-2" />
            Delete Entire Database
          </button>
        ) : (
          <div className="space-y-3">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm font-medium text-red-900 mb-1">
                Are you absolutely sure?
              </p>
              <p className="text-xs text-red-700">
                This will permanently delete all {stats?.total_records?.toLocaleString() || 0} records. This action cannot be undone.
              </p>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={handleDeleteAll}
                className="flex-1 btn-primary bg-red-600 hover:bg-red-700 focus:ring-red-500"
              >
                <XCircle className="h-4 w-4 inline mr-2" />
                Confirm Delete
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
