import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Edit, Loader2, Save, AlertCircle } from 'lucide-react'
import api from '../../services/api'
import { Contact } from '../../services/types'
import toast from 'react-hot-toast'

export default function EditRecord() {
  const [recordId, setRecordId] = useState<number | ''>('')
  const [formData, setFormData] = useState<Partial<Contact>>({})
  const [saving, setSaving] = useState(false)
  const [emailError, setEmailError] = useState<string>('')
  const queryClient = useQueryClient()

  const { data: record, isLoading, refetch } = useQuery<Contact>({
    queryKey: ['record', recordId],
    queryFn: async () => {
      if (!recordId) return null
      const response = await api.get(`/records/${recordId}`)
      return response.data
    },
    enabled: !!recordId,
  })

  useEffect(() => {
    if (record) {
      setFormData(record)
      setEmailError('')
    }
  }, [record])

  const validateEmail = (email: string): boolean => {
    if (!email) {
      setEmailError('Email is required')
      return false
    }
    
    if (!email.includes('@')) {
      setEmailError('Email must contain @ symbol')
      return false
    }
    
    if (!email.includes('.')) {
      setEmailError('Email must contain . (dot)')
      return false
    }
    
    // Check that @ comes before .
    const atIndex = email.indexOf('@')
    const dotIndex = email.indexOf('.', atIndex)
    if (dotIndex === -1 || dotIndex <= atIndex + 1) {
      setEmailError('Email must have a valid domain (e.g., example.com)')
      return false
    }
    
    // Check that there's text before @ and after .
    if (atIndex === 0 || dotIndex === email.length - 1) {
      setEmailError('Email format is invalid')
      return false
    }
    
    setEmailError('')
    return true
  }

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const email = e.target.value
    setFormData({ ...formData, email })
    
    // Validate on change if email is not empty
    if (email) {
      validateEmail(email)
    } else {
      setEmailError('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!recordId) {
      toast.error('Please enter a record ID')
      return
    }

    // Validate email before submission
    if (!validateEmail(formData.email || '')) {
      toast.error('Please fix the email validation errors')
      return
    }

    setSaving(true)
    try {
      await api.put(`/records/${recordId}`, formData)
      toast.success('Record updated successfully')
      queryClient.invalidateQueries({ queryKey: ['records'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      refetch()
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Error updating record')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card">
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
          <Edit className="h-4 w-4 text-green-600" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-gray-900">Edit Row</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Tip: You can also edit by clicking on any row in the table below
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Record ID
            </label>
            <div className="flex space-x-2">
              <input
                type="number"
                value={recordId}
                onChange={(e) => {
                  const value = e.target.value
                  setRecordId(value ? Number(value) : '')
                  setFormData({})
                }}
                placeholder="Enter ID"
                className="input-field text-sm py-2"
              />
              {recordId && (
                <button
                  type="button"
                  onClick={() => refetch()}
                  disabled={isLoading}
                  className="btn-secondary px-3 py-2 text-sm"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Load'
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {isLoading && recordId && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 text-primary-600 animate-spin" />
          </div>
        )}

        {record && !isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-3 border-t border-gray-200">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Company</label>
              <input
                type="text"
                value={formData.company || ''}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                className="input-field text-sm py-2"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input-field text-sm py-2"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Surname</label>
              <input
                type="text"
                value={formData.surname || ''}
                onChange={(e) => setFormData({ ...formData, surname: e.target.value })}
                className="input-field text-sm py-2"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={formData.email || ''}
                onChange={handleEmailChange}
                onBlur={() => formData.email && validateEmail(formData.email)}
                className={`input-field text-sm py-2 ${emailError ? 'border-red-500 focus:ring-red-500' : ''}`}
                required
                placeholder="example@domain.com"
              />
              {emailError && (
                <div className="mt-1 flex items-center space-x-1 text-xs text-red-600">
                  <AlertCircle className="h-3 w-3" />
                  <span>{emailError}</span>
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Position</label>
              <input
                type="text"
                value={formData.position || ''}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                className="input-field text-sm py-2"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="text"
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="input-field text-sm py-2"
                required
              />
            </div>
          </div>
        )}

        {record && !isLoading && (
          <button
            type="submit"
            disabled={saving}
            className="w-full btn-primary bg-green-600 hover:bg-green-700 focus:ring-green-500 text-sm py-2"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </button>
        )}

        {!record && recordId && !isLoading && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-xs text-red-700">Record ID {recordId} not found</p>
          </div>
        )}
      </form>
    </div>
  )
}
