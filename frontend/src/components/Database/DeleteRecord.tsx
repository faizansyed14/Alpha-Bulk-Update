import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Trash2, Loader2, XCircle, Check } from 'lucide-react'
import api from '../../services/api'
import { Contact } from '../../services/types'
import toast from 'react-hot-toast'

export default function DeleteRecord() {
  const [recordId, setRecordId] = useState<number | ''>('')
  const [showConfirm, setShowConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const queryClient = useQueryClient()

  const { data: record, isLoading } = useQuery<Contact>({
    queryKey: ['record', recordId],
    queryFn: async () => {
      if (!recordId) return null
      const response = await api.get(`/records/${recordId}`)
      return response.data
    },
    enabled: !!recordId,
  })

  const handleDelete = async () => {
    if (!recordId) {
      toast.error('Please enter a record ID')
      return
    }

    setDeleting(true)
    try {
      await api.delete(`/records/${recordId}`)
      toast.success('Record deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['records'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      setRecordId('')
      setShowConfirm(false)
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Error deleting record')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="card border-red-200">
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
          <Trash2 className="h-4 w-4 text-red-600" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900">Delete Row</h2>
      </div>
      
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Record ID
          </label>
          <input
            type="number"
            value={recordId}
            onChange={(e) => {
              const value = e.target.value
              setRecordId(value ? Number(value) : '')
              setShowConfirm(false)
            }}
            placeholder="Enter ID to delete"
            className="input-field text-sm py-2"
          />
        </div>

        {isLoading && recordId && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 text-primary-600 animate-spin" />
          </div>
        )}

        {record && !isLoading && (
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-xs font-medium text-gray-900 mb-1">Record to delete:</p>
            <p className="text-xs text-gray-600">
              ID: {record.id} | {record.company} | {record.name} {record.surname}
            </p>
          </div>
        )}

        {!record && recordId && !isLoading && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-xs text-red-700">Record ID {recordId} not found</p>
          </div>
        )}

        {!showConfirm ? (
          <button
            onClick={() => record && setShowConfirm(true)}
            disabled={!record || deleting}
            className="w-full btn-primary bg-red-600 hover:bg-red-700 focus:ring-red-500 disabled:opacity-50 text-sm py-2"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Record
          </button>
        ) : (
          <div className="space-y-2 p-3 bg-red-50 border-2 border-red-300 rounded-lg">
            <p className="text-xs font-semibold text-red-900">
              Confirm deletion?
            </p>
            <div className="flex space-x-2">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 btn-primary bg-red-600 hover:bg-red-700 focus:ring-red-500 text-sm py-2"
              >
                {deleting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 mr-2" />
                    Confirm
                  </>
                )}
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                disabled={deleting}
                className="flex-1 btn-secondary text-sm py-2"
              >
                <Check className="h-4 w-4 mr-2" />
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
