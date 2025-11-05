import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Loader2, Database, Clock } from 'lucide-react'
import api from '../../services/api'
import { Contact } from '../../services/types'
import EditRecordModal from './EditRecordModal'

interface RecordsTableProps {
  searchTerm?: string
}

export default function RecordsTable({ searchTerm = '' }: RecordsTableProps) {
  const [page, setPage] = useState(1)
  const [limit] = useState(100)
  const [selectedRecord, setSelectedRecord] = useState<Contact | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const { data: records, isLoading, isFetching } = useQuery<Contact[]>({
    queryKey: ['records', page, limit, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      })
      if (searchTerm) {
        params.append('search', searchTerm)
      }
      const response = await api.get(`/records?${params.toString()}`)
      return response.data
    },
  })

  const formatDate = (dateString: string | Date) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    // Exact date and time
    const exactDateTime = date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })

    // Relative time
    let relativeTime = ''
    if (diffMins < 1) relativeTime = 'Just now'
    else if (diffMins < 60) relativeTime = `${diffMins}m ago`
    else if (diffHours < 24) relativeTime = `${diffHours}h ago`
    else if (diffDays < 7) relativeTime = `${diffDays}d ago`
    else relativeTime = exactDateTime

    return { relativeTime, exactDateTime }
  }

  const isRecentlyUpdated = (updatedAt: string | Date) => {
    const date = new Date(updatedAt)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / 3600000)
    return diffHours < 24 // Updated within last 24 hours
  }

  const handleRowClick = (record: Contact) => {
    setSelectedRecord(record)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedRecord(null)
  }

  return (
    <>
      <div className="card overflow-hidden p-0 relative">
        {/* Loading Overlay - Only shows on table, not entire page */}
        {isLoading && (
          <div className="absolute inset-0 bg-white bg-opacity-75 z-50 flex items-center justify-center">
            <div className="flex flex-col items-center space-y-3">
              <Loader2 className="h-8 w-8 text-primary-600 animate-spin" />
              <p className="text-sm text-gray-600 font-medium">Loading records...</p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-0 px-6 pt-6 pb-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
              <Database className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Database Records</h2>
              <p className="text-sm text-gray-500">
                {records?.length || 0} record{records?.length !== 1 ? 's' : ''} on this page • Click any row to edit
              </p>
            </div>
          </div>
          {isFetching && !isLoading && (
            <Loader2 className="h-5 w-5 text-primary-600 animate-spin" />
          )}
        </div>

        {/* Excel-like Table Container - Increased height */}
        <div className="overflow-auto max-h-[calc(100vh-300px)] border-t border-gray-200">
          <table className="min-w-full border-collapse">
            <thead className="bg-white sticky top-0 z-10">
              <tr>
                <th className="border border-gray-300 bg-gray-100 px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider min-w-[80px]">
                  ID
                </th>
                <th className="border border-gray-300 bg-gray-100 px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider min-w-[150px]">
                  Company
                </th>
                <th className="border border-gray-300 bg-gray-100 px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider min-w-[120px]">
                  Name
                </th>
                <th className="border border-gray-300 bg-gray-100 px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider min-w-[120px]">
                  Surname
                </th>
                <th className="border border-gray-300 bg-gray-100 px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider min-w-[200px]">
                  Email
                </th>
                <th className="border border-gray-300 bg-gray-100 px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider min-w-[150px]">
                  Position
                </th>
                <th className="border border-gray-300 bg-gray-100 px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider min-w-[150px]">
                  Phone
                </th>
                <th className="border border-gray-300 bg-gray-100 px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider min-w-[200px]">
                  Updated
                </th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {records && records.length > 0 ? (
                records.map((record, idx) => {
                  const recentlyUpdated = record.updated_at && isRecentlyUpdated(record.updated_at)
                  const { relativeTime, exactDateTime } = formatDate(record.updated_at)
                  return (
                    <tr
                      key={record.id}
                      onClick={() => handleRowClick(record)}
                      className={`cursor-pointer hover:bg-blue-50 transition-colors ${
                        recentlyUpdated 
                          ? 'bg-green-50/50 hover:bg-green-100' 
                          : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                      }`}
                    >
                      <td className="border border-gray-300 px-4 py-3 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-700">{record.id}</span>
                      </td>
                      <td className="border border-gray-300 px-4 py-3 whitespace-nowrap">
                        <span className="text-sm text-gray-900">{record.company || '-'}</span>
                      </td>
                      <td className="border border-gray-300 px-4 py-3 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">{record.name || '-'}</span>
                      </td>
                      <td className="border border-gray-300 px-4 py-3 whitespace-nowrap">
                        <span className="text-sm text-gray-900">{record.surname || '-'}</span>
                      </td>
                      <td className="border border-gray-300 px-4 py-3 whitespace-nowrap">
                        <a
                          href={`mailto:${record.email}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-sm text-primary-600 hover:text-primary-700 hover:underline"
                        >
                          {record.email || '-'}
                        </a>
                      </td>
                      <td className="border border-gray-300 px-4 py-3 whitespace-nowrap">
                        <span className="text-sm text-gray-600">{record.position || '-'}</span>
                      </td>
                      <td className="border border-gray-300 px-4 py-3 whitespace-nowrap">
                        <a
                          href={`tel:${record.phone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-sm text-primary-600 hover:text-primary-700 hover:underline"
                        >
                          {record.phone || '-'}
                        </a>
                      </td>
                      <td className="border border-gray-300 px-4 py-3 whitespace-nowrap">
                        {record.updated_at && (
                          <div className="flex flex-col">
                            <div className="flex items-center space-x-1">
                              <Clock className={`h-3 w-3 ${recentlyUpdated ? 'text-green-600' : 'text-gray-400'}`} />
                              <span className={`text-xs font-medium ${recentlyUpdated ? 'text-green-700' : 'text-gray-600'}`}>
                                {relativeTime}
                              </span>
                            </div>
                            <span className="text-xs text-gray-500 mt-0.5" title={exactDateTime}>
                              {exactDateTime}
                            </span>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={8} className="border border-gray-300 px-6 py-12 text-center">
                    <div className="flex flex-col items-center space-y-3">
                      <Database className="h-12 w-12 text-gray-300" />
                      <p className="text-gray-600 font-medium">No records found</p>
                      <p className="text-sm text-gray-500">Upload an Excel file to get started</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn-secondary disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </button>
            <div className="px-4 py-2 bg-white border border-gray-300 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Page {page}</span>
            </div>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={records && records.length < limit}
              className="btn-secondary disabled:opacity-50"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </button>
          </div>
          <p className="text-sm text-gray-600">
            Showing {records?.length || 0} record{records?.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Edit Record Modal */}
      <EditRecordModal
        record={selectedRecord}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </>
  )
}
