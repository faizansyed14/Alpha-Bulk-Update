import { useState } from 'react'
import api from '../../services/api'
import { UploadResponse, ProcessSheetsResponse } from '../../services/types'
import toast from 'react-hot-toast'
import { Upload, FileSpreadsheet, CheckCircle2, Loader2 } from 'lucide-react'

interface FileUploaderProps {
  file: File | null
  onFileChange: (file: File | null) => void
  onProcessedData: (data: ProcessSheetsResponse) => void
  onSelectedSheets: (sheets: string[]) => void
}

export default function FileUploader({
  file,
  onFileChange,
  onProcessedData,
  onSelectedSheets,
}: FileUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [uploadResponse, setUploadResponse] = useState<UploadResponse | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      onFileChange(selectedFile)
      handleUpload(selectedFile)
    }
  }

  const handleUpload = async (uploadFile: File) => {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', uploadFile)

      const response = await api.post<UploadResponse>('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      setUploadResponse(response.data)
      if (response.data.success && response.data.sheet_names.length > 0) {
        // Auto-process first sheet or all sheets
        handleProcessSheets(response.data.sheet_names, uploadFile)
      } else {
        toast.error(response.data.error || 'Upload failed')
      }
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Error uploading file')
    } finally {
      setUploading(false)
    }
  }

  const handleProcessSheets = async (sheetNames: string[], uploadFile: File) => {
    setProcessing(true)
    try {
      const formData = new FormData()
      formData.append('file', uploadFile)
      formData.append('sheet_names', JSON.stringify(sheetNames))

      const response = await api.post<ProcessSheetsResponse>(
        '/upload/process-sheets',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      )

      onProcessedData(response.data)
      onSelectedSheets(sheetNames)
      if (response.data.success) {
        toast.success(`Successfully processed ${response.data.total_rows} rows`)
      } else {
        toast.error('Error processing sheets')
      }
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Error processing sheets')
    } finally {
      setProcessing(false)
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls'))) {
      onFileChange(droppedFile)
      handleUpload(droppedFile)
    } else {
      toast.error('Please upload an Excel file (.xlsx or .xls)')
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  return (
    <div className="card">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
          <FileSpreadsheet className="h-5 w-5 text-primary-600" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Upload Excel File</h2>
          <p className="text-sm text-gray-500">Select or drag & drop your Excel file</p>
        </div>
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200 ${
          isDragging
            ? 'border-primary-500 bg-primary-50 scale-[1.02]'
            : 'border-gray-300 hover:border-primary-400 bg-gray-50'
        }`}
      >
        {uploading || processing ? (
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-12 w-12 text-primary-600 animate-spin" />
            <div className="text-center">
              <p className="text-sm font-medium text-gray-900">
                {uploading ? 'Uploading file...' : 'Processing sheets...'}
              </p>
              <p className="text-xs text-gray-500 mt-1">Please wait</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center space-y-4">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
                <Upload className="h-8 w-8 text-primary-600" />
              </div>
              <div>
                <p className="text-base font-medium text-gray-900 mb-1">
                  Drag and drop your Excel file here
                </p>
                <p className="text-sm text-gray-500">or</p>
              </div>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="btn-primary cursor-pointer inline-flex items-center"
              >
                <Upload className="h-4 w-4 mr-2" />
                Browse Files
              </label>
              <p className="text-xs text-gray-500 mt-2">
                Supported formats: .xlsx, .xls
              </p>
            </div>
          </>
        )}
      </div>

      {file && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-3">
            <FileSpreadsheet className="h-5 w-5 text-gray-600" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
              <p className="text-xs text-gray-500">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
        </div>
      )}

      {uploadResponse && uploadResponse.success && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-sm font-medium text-green-900">
                {uploadResponse.message}
              </p>
              <p className="text-xs text-green-700 mt-1">
                Found {uploadResponse.sheet_names.length} sheet(s): {uploadResponse.sheet_names.join(', ')}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
