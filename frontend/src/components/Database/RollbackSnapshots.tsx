import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { RotateCcw, Clock, FileText, AlertCircle, CheckCircle2, XCircle, Loader2, Eye, ChevronDown, ChevronUp, RefreshCw, Trash2, Trash } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'

interface Snapshot {
  id: number
  snapshot_name: string
  timestamp: string | null
  update_details: {
    estimated_updated_count?: number
    estimated_inserted_count?: number
    total_backed_up_records?: number
  } | null
  rolled_back: boolean
  records_count: number
  changes_data: {
    updates?: Array<{
      id: number
      old_record: any
      new_record: any
      match_type: string
      identity_conflict: boolean
      changes: Record<string, { old: any; new: any }>
    }>
    new_records?: Array<{
      record: any
      match_type: string
    }>
    summary?: {
      updated_count: number
      new_count: number
      duplicates_count: number
      identity_conflicts_count: number
    }
  } | null
}

export default function RollbackSnapshots() {
  const [showConfirm, setShowConfirm] = useState<number | null>(null)
  const [rollingBack, setRollingBack] = useState<number | null>(null)
  const [deletingSnapshot, setDeletingSnapshot] = useState<number | null>(null)
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false)
  const [deletingAll, setDeletingAll] = useState(false)
  const [expandedSnapshots, setExpandedSnapshots] = useState<Set<number>>(new Set())
  const queryClient = useQueryClient()

  const { data: snapshots = [], isLoading, refetch } = useQuery<Snapshot[]>({
    queryKey: ['snapshots'],
    queryFn: async () => {
      const response = await api.get('/upload/snapshots')
      return response.data
    },
  })

  const handleRollback = async (snapshotId: number) => {
    if (!snapshotId) return

    setRollingBack(snapshotId)
    try {
      const response = await api.post('/upload/rollback', {
        snapshot_id: snapshotId,
      })

      if (response.data.success) {
        let message = response.data.message || `Successfully rolled back ${response.data.restored_count} records`
        if (response.data.deleted_count > 0) {
          message += ` and deleted ${response.data.deleted_count} newly inserted records`
        }
        toast.success(message)
        queryClient.invalidateQueries({ queryKey: ['records'] })
        queryClient.invalidateQueries({ queryKey: ['stats'] })
        refetch()
        setShowConfirm(null)
      } else {
        toast.error(response.data.message || 'Rollback failed')
      }
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Error rolling back snapshot')
    } finally {
      setRollingBack(null)
    }
  }

  const formatDate = (timestamp: string | null) => {
    if (!timestamp) return { dateTime: 'Unknown', timeLabel: '' }
    try {
      // Ensure timestamp is treated as UTC if no timezone is specified
      const timestampStr = timestamp.includes('+') || timestamp.endsWith('Z') 
        ? timestamp 
        : timestamp + 'Z'
      const date = new Date(timestampStr)
      
      if (isNaN(date.getTime())) {
        return { dateTime: 'Invalid date', timeLabel: '' }
      }

      // Format date and time in user's local timezone (UAE)
      const dateTime = date.toLocaleString('en-US', {
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })

      return { dateTime, timeLabel: 'UAE Time' }
    } catch {
      return { dateTime: 'Invalid date', timeLabel: '' }
    }
  }

  const toggleExpanded = (snapshotId: number) => {
    const newExpanded = new Set(expandedSnapshots)
    if (newExpanded.has(snapshotId)) {
      newExpanded.delete(snapshotId)
    } else {
      newExpanded.add(snapshotId)
    }
    setExpandedSnapshots(newExpanded)
  }

  const handleDeleteSnapshot = async (snapshotId: number) => {
    if (!snapshotId) return

    setDeletingSnapshot(snapshotId)
    try {
      const response = await api.delete(`/upload/snapshots/${snapshotId}`)

      if (response.data.success) {
        toast.success('Snapshot deleted successfully')
        refetch()
      } else {
        toast.error(response.data.message || 'Failed to delete snapshot')
      }
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Error deleting snapshot')
    } finally {
      setDeletingSnapshot(null)
    }
  }

  const handleDeleteAllSnapshots = async (olderThanDays?: number) => {
    setDeletingAll(true)
    try {
      const response = await api.post('/upload/snapshots/delete-all', {
        older_than_days: olderThanDays || null,
      })

      if (response.data.success) {
        toast.success(`Successfully deleted ${response.data.deleted_count} snapshots`)
        refetch()
        setShowDeleteAllConfirm(false)
      } else {
        toast.error(response.data.message || 'Failed to delete snapshots')
      }
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Error deleting snapshots')
    } finally {
      setDeletingAll(false)
    }
  }

  return (
    <div className="card border-blue-200">
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
          <RotateCcw className="h-4 w-4 text-blue-600" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900">Rollback Snapshots</h2>
      </div>

      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-600">
          View and restore previous bulk update snapshots. You can rollback changes made during bulk updates.
        </p>
        {snapshots.length > 0 && (
          <button
            onClick={() => setShowDeleteAllConfirm(true)}
            className="btn-secondary text-sm py-2 px-4"
          >
            <Trash className="h-4 w-4 mr-2" />
            Delete All
          </button>
        )}
      </div>

      {/* Delete All Confirmation */}
      {showDeleteAllConfirm && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start space-x-2 mb-3">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-900">
                Delete All Snapshots?
              </p>
              <p className="text-xs text-red-700 mt-1">
                This will permanently delete all {snapshots.length} snapshots. This action cannot be undone.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleDeleteAllSnapshots()}
              disabled={deletingAll}
              className="flex-1 btn-primary bg-red-600 hover:bg-red-700 text-sm py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deletingAll ? (
                <>
                  <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-3 w-3 mr-2" />
                  Delete All Snapshots
                </>
              )}
            </button>
            <button
              onClick={() => setShowDeleteAllConfirm(false)}
              disabled={deletingAll}
              className="btn-secondary text-sm py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <XCircle className="h-3 w-3 mr-2" />
              Cancel
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
        </div>
      ) : snapshots.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <FileText className="h-12 w-12 mx-auto mb-3 text-gray-400" />
          <p>No snapshots available</p>
          <p className="text-xs mt-1">
            Snapshots are created automatically when you perform bulk updates
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {snapshots.map((snapshot) => (
            <div
              key={snapshot.id}
              className={`p-4 rounded-lg border ${
                snapshot.rolled_back
                  ? 'bg-gray-50 border-gray-200'
                  : 'bg-white border-gray-200 hover:border-blue-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-medium text-gray-900">
                        {snapshot.snapshot_name}
                      </h3>
                      {snapshot.rolled_back ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Rolled back
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                          <Clock className="h-3 w-3 mr-1" />
                          Available
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                    <div className="flex items-center space-x-1">
                      <Clock className="h-3 w-3" />
                      {(() => {
                        const { dateTime, timeLabel } = formatDate(snapshot.timestamp)
                        return (
                          <div className="flex flex-col">
                            <span>{dateTime}</span>
                            <span className="text-xs text-gray-400">{timeLabel}</span>
                          </div>
                        )
                      })()}
                    </div>
                    <div className="flex items-center space-x-1">
                      <FileText className="h-3 w-3" />
                      <span>{snapshot.records_count} records backed up</span>
                    </div>
                  </div>

                  {snapshot.update_details && (
                    <div className="flex items-center space-x-4 text-xs text-gray-500 mt-2">
                      {snapshot.update_details.estimated_updated_count !== undefined && (
                        <span>
                          Updated: {snapshot.update_details.estimated_updated_count}
                        </span>
                      )}
                      {snapshot.update_details.estimated_inserted_count !== undefined && (
                        <span>
                          Inserted: {snapshot.update_details.estimated_inserted_count}
                        </span>
                      )}
                    </div>
                  )}

                  {/* View Changes Button */}
                  {snapshot.changes_data && (
                    <button
                      onClick={() => toggleExpanded(snapshot.id)}
                      className="mt-3 flex items-center space-x-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
                    >
                      <Eye className="h-4 w-4" />
                      <span>{expandedSnapshots.has(snapshot.id) ? 'Hide' : 'View'} Changes</span>
                      {expandedSnapshots.has(snapshot.id) ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>
                  )}

                  {/* Expanded Changes View */}
                  {expandedSnapshots.has(snapshot.id) && snapshot.changes_data && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                        <Eye className="h-4 w-4 text-primary-600" />
                        <span>Changes Made in This Update</span>
                      </h4>

                      {/* Summary Cards */}
                      {snapshot.changes_data.summary && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs font-medium text-blue-700">Updates</p>
                              <RefreshCw className="h-3 w-3 text-blue-600" />
                            </div>
                            <p className="text-2xl font-bold text-blue-600">
                              {snapshot.changes_data.summary.updated_count || 0}
                            </p>
                          </div>
                          <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs font-medium text-green-700">New Records</p>
                              <CheckCircle2 className="h-3 w-3 text-green-600" />
                            </div>
                            <p className="text-2xl font-bold text-green-600">
                              {snapshot.changes_data.summary.new_count || 0}
                            </p>
                          </div>
                          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs font-medium text-yellow-700">Duplicates</p>
                              <AlertCircle className="h-3 w-3 text-yellow-600" />
                            </div>
                            <p className="text-2xl font-bold text-yellow-600">
                              {snapshot.changes_data.summary.duplicates_count || 0}
                            </p>
                          </div>
                          <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs font-medium text-red-700">Conflicts</p>
                              <XCircle className="h-3 w-3 text-red-600" />
                            </div>
                            <p className="text-2xl font-bold text-red-600">
                              {snapshot.changes_data.summary.identity_conflicts_count || 0}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Updates List */}
                      {snapshot.changes_data.updates && snapshot.changes_data.updates.length > 0 && (
                        <div className="mb-6">
                          <h5 className="text-sm font-semibold text-gray-900 mb-3 flex items-center space-x-2">
                            <RefreshCw className="h-4 w-4 text-blue-600" />
                            <span>Updates ({snapshot.changes_data.updates.length})</span>
                          </h5>
                          <div className="space-y-3 max-h-96 overflow-y-auto">
                            {snapshot.changes_data.updates.map((update: any) => (
                              <div
                                key={update.id}
                                className="p-4 border-2 rounded-xl border-gray-200 bg-white"
                              >
                                <div className="flex items-center space-x-3 mb-3">
                                  <span className="font-semibold text-gray-900">ID: {update.id}</span>
                                  <span
                                    className={`badge ${
                                      update.match_type === 'email_match'
                                        ? 'bg-yellow-100 text-yellow-800'
                                        : update.match_type === 'phone_match'
                                        ? 'bg-blue-100 text-blue-800'
                                        : 'bg-green-100 text-green-800'
                                    }`}
                                  >
                                    {update.match_type?.replace('_', ' ')}
                                  </span>
                                  {update.identity_conflict && (
                                    <span className="badge bg-red-100 text-red-800">
                                      Identity Conflict
                                    </span>
                                  )}
                                </div>
                                <div className="space-y-2">
                                  {Object.entries(update.changes || {}).map(([key, value]: any) => (
                                    <div key={key} className="flex items-start space-x-3 text-sm bg-white p-3 rounded-lg border border-gray-200">
                                      <span className="font-medium text-gray-700 min-w-[100px]">{key}:</span>
                                      <div className="flex-1 flex items-center space-x-2">
                                        <span className="text-gray-500 line-through">{value.old || '(empty)'}</span>
                                        <span className="text-gray-400">→</span>
                                        <span className="font-medium text-green-600">{value.new || '(empty)'}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* New Records List */}
                      {snapshot.changes_data.new_records && snapshot.changes_data.new_records.length > 0 && (
                        <div>
                          <h5 className="text-sm font-semibold text-gray-900 mb-3 flex items-center space-x-2">
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            <span>New Records ({snapshot.changes_data.new_records.length})</span>
                          </h5>
                          <div className="space-y-3 max-h-96 overflow-y-auto">
                            {snapshot.changes_data.new_records.map((record: any, idx: number) => (
                              <div
                                key={idx}
                                className="p-4 border-2 rounded-xl border-gray-200 bg-white"
                              >
                                <div className="flex items-center space-x-2 mb-3">
                                  <span className="font-semibold text-gray-900">New Record</span>
                                  <span className="badge bg-green-100 text-green-800">New</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                  {Object.entries(record.record || {}).map(([key, value]) => (
                                    <div key={key} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{key}</span>
                                      <p className="text-sm font-medium text-gray-900 mt-1">{String(value) || '-'}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {showConfirm === snapshot.id ? (
                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-start space-x-2 mb-3">
                        <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-yellow-900">
                            Confirm Rollback
                          </p>
                          <p className="text-xs text-yellow-700 mt-1">
                            This will restore {snapshot.records_count} records to their previous state. This action cannot be undone.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleRollback(snapshot.id)}
                          disabled={rollingBack === snapshot.id}
                          className="flex-1 btn-primary text-sm py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {rollingBack === snapshot.id ? (
                            <>
                              <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                              Rolling back...
                            </>
                          ) : (
                            <>
                              <RotateCcw className="h-3 w-3 mr-2" />
                              Confirm Rollback
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => setShowConfirm(null)}
                          disabled={rollingBack === snapshot.id}
                          className="btn-secondary text-sm py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <XCircle className="h-3 w-3 mr-2" />
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2 mt-3">
                      {!snapshot.rolled_back && (
                        <button
                          onClick={() => setShowConfirm(snapshot.id)}
                          disabled={rollingBack === snapshot.id}
                          className="btn-primary text-sm py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <RotateCcw className="h-3 w-3 mr-2" />
                          Rollback
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteSnapshot(snapshot.id)}
                        disabled={deletingSnapshot === snapshot.id || rollingBack === snapshot.id}
                        className="btn-secondary bg-red-50 hover:bg-red-100 text-red-700 border-red-200 text-sm py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {deletingSnapshot === snapshot.id ? (
                          <>
                            <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                            Deleting...
                          </>
                        ) : (
                          <>
                            <Trash2 className="h-3 w-3 mr-2" />
                            Delete
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

