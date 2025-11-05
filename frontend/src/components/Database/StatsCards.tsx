import { useQuery } from '@tanstack/react-query'
import { Database, Columns, Activity } from 'lucide-react'
import api from '../../services/api'
import { StatsResponse } from '../../services/types'

export default function StatsCards() {
  const { data: stats, isLoading } = useQuery<StatsResponse>({
    queryKey: ['stats'],
    queryFn: async () => {
      const response = await api.get('/records/stats')
      return response.data
    },
  })

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="card animate-pulse">
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
      <div className="card bg-gradient-to-br from-primary-50 to-primary-100 border-primary-200">
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center shadow-md">
            <Database className="h-6 w-6 text-white" />
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-primary-700 mb-1">Total Records</p>
            <p className="text-3xl font-bold text-primary-900">
              {stats?.total_records?.toLocaleString() || '0'}
            </p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-primary-200">
          <p className="text-xs text-primary-600">All contacts in database</p>
        </div>
      </div>

      <div className="card bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-md">
            <Columns className="h-6 w-6 text-white" />
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-blue-700 mb-1">Columns</p>
            <p className="text-3xl font-bold text-blue-900">
              {stats?.columns || 6}
            </p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-blue-200">
          <p className="text-xs text-blue-600">Data fields per record</p>
        </div>
      </div>

      <div className="card bg-gradient-to-br from-green-50 to-green-100 border-green-200">
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center shadow-md">
            <Activity className="h-6 w-6 text-white" />
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-green-700 mb-1">Status</p>
            <p className="text-3xl font-bold text-green-900">Active</p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-green-200">
          <p className="text-xs text-green-600">Database is operational</p>
        </div>
      </div>
    </div>
  )
}
