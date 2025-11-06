import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Eye, CheckCircle2, AlertCircle, RefreshCw, Upload as UploadIcon, X } from 'lucide-react'
import api from '../../services/api'
import { PreviewChangesRequest, PreviewChangesResponse, UpdateDatabaseRequest } from '../../services/types'
import toast from 'react-hot-toast'

interface PreviewChangesProps {
  processedData: Record<string, any>[]
  updateMode: 'replace' | 'append'
  onPreviewData: (data: PreviewChangesResponse) => void
}

export default function PreviewChanges({
  processedData,
  updateMode,
  onPreviewData,
}: PreviewChangesProps) {
  const [previewing, setPreviewing] = useState(false)
  const [previewData, setPreviewData] = useState<PreviewChangesResponse | null>(null)
  const [updating, setUpdating] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const queryClient = useQueryClient()

  const handlePreview = async () => {
    setPreviewing(true)
    try {
      const request: PreviewChangesRequest = {
        records: processedData,
        update_mode: updateMode,
      }

      const response = await api.post<PreviewChangesResponse>(
        '/upload/preview-changes',
        request
      )

      setPreviewData(response.data)
      onPreviewData(response.data)
      
      // Auto-select all by default
      const allIds = new Set<number>()
      response.data.updates.forEach((u: any) => allIds.add(u.id))
      response.data.new_records.forEach((_: any, idx: number) => allIds.add(idx + 10000)) // Temporary IDs
      setSelectedIds(allIds)
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Error previewing changes')
    } finally {
      setPreviewing(false)
    }
  }

  const handleUpdate = async () => {
    if (!previewData) return

    setUpdating(true)
    try {
      // If no records selected, process all (send null to process all)
      const selectedIdsArray: number[] | undefined = selectedIds.size > 0 ? Array.from(selectedIds) : undefined
      
      const request: UpdateDatabaseRequest = {
        preview_data: previewData,
        selected_ids: selectedIdsArray,
      }

      const response = await api.post('/upload/update-database', request)
      
      if (response.data.success) {
        toast.success(
          `Successfully updated ${response.data.updated_count} records and added ${response.data.inserted_count} new records`
        )
        queryClient.invalidateQueries({ queryKey: ['records'] })
        queryClient.invalidateQueries({ queryKey: ['stats'] })
        setPreviewData(null)
        setSelectedIds(new Set())
      } else {
        toast.error('Error updating database')
      }
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Error updating database')
    } finally {
      setUpdating(false)
    }
  }

  const toggleSelection = (id: number) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const selectAll = () => {
    if (!previewData) return
    const allIds = new Set<number>()
    previewData.updates.forEach((u: any) => allIds.add(u.id))
    previewData.new_records.forEach((_, idx) => allIds.add(idx + 10000))
    setSelectedIds(allIds)
  }

  const deselectAll = () => {
    setSelectedIds(new Set())
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <Eye className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Preview Changes</h2>
            <p className="text-sm text-gray-500">Review changes before applying</p>
          </div>
        </div>
        <button
          onClick={handlePreview}
          disabled={previewing}
          className="btn-primary"
        >
          {previewing ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Previewing...
            </>
          ) : (
            <>
              <Eye className="h-4 w-4 mr-2" />
              Preview Changes
            </>
          )}
        </button>
      </div>

      {previewData && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-blue-700">Updates</p>
                <RefreshCw className="h-4 w-4 text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-blue-600">
                {previewData.summary.updated_count}
              </p>
            </div>
            <div className="p-5 bg-green-50 border border-green-200 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-green-700">New Records</p>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-green-600">
                {previewData.summary.new_count}
              </p>
            </div>
            <div className="p-5 bg-yellow-50 border border-yellow-200 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-yellow-700">Duplicates</p>
                <AlertCircle className="h-4 w-4 text-yellow-600" />
              </div>
              <p className="text-3xl font-bold text-yellow-600">
                {previewData.summary.duplicates_count}
              </p>
            </div>
            <div className="p-5 bg-red-50 border border-red-200 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-red-700">Conflicts</p>
                <X className="h-4 w-4 text-red-600" />
              </div>
              <p className="text-3xl font-bold text-red-600">
                {previewData.summary.identity_conflicts_count}
              </p>
            </div>
          </div>

          {/* Selection Controls */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-gray-700">
                {selectedIds.size} of {previewData.updates.length + previewData.new_records.length} selected
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={selectAll}
                className="text-sm px-3 py-1.5 text-primary-600 hover:bg-primary-50 rounded-md font-medium transition-colors"
              >
                Select All
              </button>
              <button
                onClick={deselectAll}
                className="text-sm px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded-md font-medium transition-colors"
              >
                Deselect All
              </button>
            </div>
          </div>

          {/* Updates List */}
          {previewData.updates.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <RefreshCw className="h-5 w-5 text-blue-600" />
                <span>Updates ({previewData.updates.length})</span>
              </h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {previewData.updates.map((update: any, _: number) => (
                  <div
                    key={update.id}
                    className={`p-4 border-2 rounded-xl transition-all duration-200 ${
                      selectedIds.has(update.id)
                        ? 'border-primary-500 bg-primary-50 shadow-sm'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start space-x-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(update.id)}
                        onChange={() => toggleSelection(update.id)}
                        className="mt-1 w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3 mb-3">
                          <span className="font-semibold text-gray-900">ID: {update.id}</span>
                          {update.match_type === 'email_match' && (
                            <span className="badge bg-yellow-100 text-yellow-800">
                              📧 Email Match
                            </span>
                          )}
                          {update.match_type === 'phone_match' && (
                            <span className="badge bg-blue-100 text-blue-800">
                              📞 Phone Match
                            </span>
                          )}
                          {update.match_type === 'both_match' && (
                            <div className="flex items-center space-x-2">
                              <span className="badge bg-yellow-100 text-yellow-800">
                                📧 Email Match
                              </span>
                              <span className="text-gray-400">+</span>
                              <span className="badge bg-blue-100 text-blue-800">
                                📞 Phone Match
                              </span>
                            </div>
                          )}
                          {update.identity_conflict && (
                            <span className="badge bg-red-100 text-red-800">
                              ⚠️ Identity Conflict
                            </span>
                          )}
                        </div>
                        
                        {/* Only show side-by-side comparison if there are changes */}
                        {update.changes && Object.keys(update.changes).length > 0 ? (
                          <>
                            {/* Side-by-side comparison */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                              {/* Old Record (from database) */}
                              <div className="bg-white p-4 rounded-lg border border-gray-200">
                                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center space-x-2">
                                  <span className="text-gray-500">📋</span>
                                  <span>Current in Database (ID: {update.id})</span>
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  <div className="bg-gray-50 p-2 rounded border border-gray-200">
                                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Company</span>
                                    <p className="text-sm font-medium text-gray-900 mt-1">{update.old_record?.company || '-'}</p>
                                  </div>
                                  <div className="bg-gray-50 p-2 rounded border border-gray-200">
                                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Name</span>
                                    <p className="text-sm font-medium text-gray-900 mt-1">{update.old_record?.name || '-'}</p>
                                  </div>
                                  <div className="bg-gray-50 p-2 rounded border border-gray-200">
                                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Surname</span>
                                    <p className="text-sm font-medium text-gray-900 mt-1">{update.old_record?.surname || '-'}</p>
                                  </div>
                                  <div className="bg-gray-50 p-2 rounded border border-gray-200">
                                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Email</span>
                                    <p className="text-sm font-medium text-gray-900 mt-1">{update.old_record?.email || '-'}</p>
                                  </div>
                                  <div className="bg-gray-50 p-2 rounded border border-gray-200">
                                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Phone</span>
                                    <p className="text-sm font-medium text-gray-900 mt-1">{update.old_record?.phone || '-'}</p>
                                  </div>
                                  {update.old_record?.position && (
                                    <div className="bg-gray-50 p-2 rounded border border-gray-200">
                                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Position</span>
                                      <p className="text-sm font-medium text-gray-900 mt-1">{update.old_record.position}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              {/* New Record (from Excel file) */}
                              <div className="bg-white p-4 rounded-lg border border-blue-200">
                                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center space-x-2">
                                  <span className="text-blue-600">📝</span>
                                  <span>From Upload File (Will update)</span>
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  <div className="bg-gray-50 p-2 rounded border border-gray-200">
                                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Company</span>
                                    <p className="text-sm font-medium text-gray-900 mt-1">{update.new_record?.Company || '-'}</p>
                                  </div>
                                  <div className="bg-gray-50 p-2 rounded border border-gray-200">
                                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Name</span>
                                    <p className="text-sm font-medium text-gray-900 mt-1">{update.new_record?.Name || '-'}</p>
                                  </div>
                                  <div className="bg-gray-50 p-2 rounded border border-gray-200">
                                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Surname</span>
                                    <p className="text-sm font-medium text-gray-900 mt-1">{update.new_record?.Surname || '-'}</p>
                                  </div>
                                  <div className="bg-gray-50 p-2 rounded border border-gray-200">
                                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Email</span>
                                    <p className="text-sm font-medium text-gray-900 mt-1">{update.new_record?.Email || '-'}</p>
                                  </div>
                                  <div className="bg-gray-50 p-2 rounded border border-gray-200">
                                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Phone</span>
                                    <p className="text-sm font-medium text-gray-900 mt-1">{update.new_record?.Phone || '-'}</p>
                                  </div>
                                  {update.new_record?.Position && (
                                    <div className="bg-gray-50 p-2 rounded border border-gray-200">
                                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Position</span>
                                      <p className="text-sm font-medium text-gray-900 mt-1">{update.new_record.Position}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            {/* Changes Summary - Only show changed fields */}
                            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                              <h4 className="text-xs font-semibold text-blue-900 mb-2">Changes:</h4>
                              <div className="space-y-2">
                                {Object.entries(update.changes).map(([key, value]: any) => (
                                  <div key={key} className="flex items-start space-x-3 text-sm bg-white p-3 rounded-lg border border-blue-200">
                                    <span className="font-medium text-gray-700 min-w-[100px]">{key}:</span>
                                    <div className="flex-1 flex items-center space-x-2">
                                      <span className="text-gray-500 line-through">{value.old || '(empty)'}</span>
                                      <span className="text-gray-400">→</span>
                                      <span className="font-medium text-blue-700">{value.new || '(empty)'}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </>
                        ) : (
                          /* No changes - show compact view */
                          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                            <p className="text-sm text-gray-600">
                              ✓ No changes - Record matches existing data
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Duplicates Section */}
          {previewData.duplicates && previewData.duplicates.length > 0 && (
            <div>
              <div className="flex items-center space-x-3 mb-3">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                  <span>Duplicates ({previewData.duplicates.length})</span>
                </h3>
              </div>
              <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-yellow-900">
                      Duplicates will be skipped
                    </p>
                    <p className="text-xs text-yellow-700 mt-1">
                      These records already exist in the database (matched by email or phone). They will be skipped and not inserted during the update.
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {previewData.duplicates.map((duplicate: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-4 border-2 rounded-xl border-yellow-200 bg-yellow-50"
                  >
                    <div className="flex items-center space-x-3 mb-3">
                      <span className="font-semibold text-gray-900">Duplicate Record</span>
                      {duplicate.match_type === 'email_match' && (
                        <span className="badge bg-yellow-100 text-yellow-800">
                          📧 Email Match
                        </span>
                      )}
                      {duplicate.match_type === 'phone_match' && (
                        <span className="badge bg-blue-100 text-blue-800">
                          📞 Phone Match
                        </span>
                      )}
                      {duplicate.match_type === 'both_match' && (
                        <div className="flex items-center space-x-2">
                          <span className="badge bg-yellow-100 text-yellow-800">
                            📧 Email Match
                          </span>
                          <span className="text-gray-400">+</span>
                          <span className="badge bg-blue-100 text-blue-800">
                            📞 Phone Match
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* Duplicate Record (from file) */}
                      <div className="bg-white p-4 rounded-lg border border-yellow-200">
                        <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center space-x-2">
                          <X className="h-4 w-4 text-yellow-600" />
                          <span>From Upload File (Will be skipped)</span>
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {Object.entries(duplicate.record || {}).filter(([key]) => !key.includes('_normalized')).map(([key, value]) => (
                            <div key={key} className="bg-gray-50 p-2 rounded border border-gray-200">
                              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{key}</span>
                              <p className="text-sm font-medium text-gray-900 mt-1">{String(value) || '-'}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {/* Existing Record (in database) */}
                      <div className="bg-white p-4 rounded-lg border border-green-200">
                        <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center space-x-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <span>Existing in Database (ID: {duplicate.existing_record?.id})</span>
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div className="bg-gray-50 p-2 rounded border border-gray-200">
                            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Company</span>
                            <p className="text-sm font-medium text-gray-900 mt-1">{duplicate.existing_record?.company || '-'}</p>
                          </div>
                          <div className="bg-gray-50 p-2 rounded border border-gray-200">
                            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Name</span>
                            <p className="text-sm font-medium text-gray-900 mt-1">{duplicate.existing_record?.name || '-'}</p>
                          </div>
                          <div className="bg-gray-50 p-2 rounded border border-gray-200">
                            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Surname</span>
                            <p className="text-sm font-medium text-gray-900 mt-1">{duplicate.existing_record?.surname || '-'}</p>
                          </div>
                          <div className="bg-gray-50 p-2 rounded border border-gray-200">
                            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Email</span>
                            <p className="text-sm font-medium text-gray-900 mt-1">{duplicate.existing_record?.email || '-'}</p>
                          </div>
                          <div className="bg-gray-50 p-2 rounded border border-gray-200">
                            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Phone</span>
                            <p className="text-sm font-medium text-gray-900 mt-1">{duplicate.existing_record?.phone || '-'}</p>
                          </div>
                          {duplicate.existing_record?.position && (
                            <div className="bg-gray-50 p-2 rounded border border-gray-200">
                              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Position</span>
                              <p className="text-sm font-medium text-gray-900 mt-1">{duplicate.existing_record.position}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* New Records */}
          {previewData.new_records.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span>New Records ({previewData.new_records.length})</span>
              </h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {previewData.new_records.map((record: any, idx: number) => {
                  const tempId = idx + 10000
                  return (
                    <div
                      key={tempId}
                      className={`p-4 border-2 rounded-xl transition-all duration-200 ${
                        selectedIds.has(tempId)
                          ? 'border-primary-500 bg-primary-50 shadow-sm'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start space-x-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(tempId)}
                          onChange={() => toggleSelection(tempId)}
                          className="mt-1 w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                        />
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-3">
                            <span className="font-semibold text-gray-900">New Record</span>
                            <span className="badge bg-green-100 text-green-800">New</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {Object.entries(record.record || {}).map(([key, value]) => (
                              <div key={key} className="bg-white p-3 rounded-lg border border-gray-200">
                                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{key}</span>
                                <p className="text-sm font-medium text-gray-900 mt-1">{String(value) || '-'}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Update Button */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              <span className="font-medium">{selectedIds.size}</span> record{selectedIds.size !== 1 ? 's' : ''} selected
            </div>
            <button
              onClick={handleUpdate}
              disabled={updating || selectedIds.size === 0}
              className="btn-primary bg-green-600 hover:bg-green-700 focus:ring-green-500 disabled:opacity-50"
            >
              {updating ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <UploadIcon className="h-4 w-4 mr-2" />
                  Update Database
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
