import { useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { X, Edit, Trash2, Save, Loader2, XCircle, Check, AlertCircle } from 'lucide-react'
import api from '../../services/api'
import { Contact } from '../../services/types'
import toast from 'react-hot-toast'

interface EditRecordModalProps {
  record: Contact | null
  isOpen: boolean
  onClose: () => void
}

export default function EditRecordModal({ record, isOpen, onClose }: EditRecordModalProps) {
  const [formData, setFormData] = useState<Partial<Contact>>({})
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [emailError, setEmailError] = useState<string>('')
  const queryClient = useQueryClient()

  useEffect(() => {
    if (record) {
      setFormData(record)
      setShowDeleteConfirm(false)
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
    if (!record) return

    // Validate email before submission
    if (!validateEmail(formData.email || '')) {
      toast.error('Please fix the email validation errors')
      return
    }

    setSaving(true)
    try {
      const response = await api.put(`/records/${record.id}`, formData)
      console.log('Update response:', response.data)
      toast.success('Record updated successfully')
      // Force refetch to get updated timestamp
      await queryClient.refetchQueries({ queryKey: ['records'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      onClose()
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Error updating record')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!record) return

    setDeleting(true)
    try {
      await api.delete(`/records/${record.id}`)
      toast.success('Record deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['records'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      onClose()
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Error deleting record')
    } finally {
      setDeleting(false)
    }
  }

  if (!isOpen || !record) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-primary-50 to-blue-50">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
                <Edit className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Edit Record</h2>
                <p className="text-sm text-gray-500">ID: {record.id}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company *
                  </label>
                  <input
                    type="text"
                    value={formData.company || ''}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Surname *
                  </label>
                  <input
                    type="text"
                    value={formData.surname || ''}
                    onChange={(e) => setFormData({ ...formData, surname: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={handleEmailChange}
                    onBlur={() => formData.email && validateEmail(formData.email)}
                    className={`input-field ${emailError ? 'border-red-500 focus:ring-red-500' : ''}`}
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Position
                  </label>
                  <input
                    type="text"
                    value={formData.position || ''}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone *
                  </label>
                  <input
                    type="text"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>
              </div>

              {/* Metadata */}
              <div className="pt-4 border-t border-gray-200 space-y-2">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Created:</span>
                    <span className="ml-2 text-gray-900 font-medium">
                      {record.created_at ? new Date(record.created_at).toLocaleString() : '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Last Updated:</span>
                    <span className="ml-2 text-gray-900 font-medium">
                      {record.updated_at ? (() => {
                        // Ensure timestamp is treated as UTC
                        const timestampStr = record.updated_at.includes('+') || record.updated_at.endsWith('Z') 
                          ? record.updated_at 
                          : record.updated_at + 'Z'
                        const date = new Date(timestampStr)
                        return (
                          <span>
                            {date.toLocaleString('en-US', {
                              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true
                            })}
                            <span className="ml-2 text-xs text-gray-500">(UAE Time)</span>
                          </span>
                        )
                      })() : '-'}
                    </span>
                  </div>
                </div>
              </div>
            </form>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
            <div>
              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={saving || deleting}
                  className="btn-secondary bg-red-600 hover:bg-red-700 text-white border-red-600 focus:ring-red-500"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Record
                </button>
              ) : (
                <div className="flex items-center space-x-2">
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm font-medium text-red-900">Confirm deletion?</p>
                  </div>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="btn-primary bg-red-600 hover:bg-red-700 focus:ring-red-500"
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
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={deleting}
                    className="btn-secondary"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Cancel
                  </button>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={onClose}
                className="btn-secondary"
                disabled={saving || deleting}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving || deleting}
                className="btn-primary bg-green-600 hover:bg-green-700 focus:ring-green-500"
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
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

