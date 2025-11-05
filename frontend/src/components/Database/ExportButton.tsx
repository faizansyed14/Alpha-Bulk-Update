import { useState } from 'react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { Download, Loader2, FileSpreadsheet } from 'lucide-react'

export default function ExportButton() {
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    try {
      const response = await api.get('/export/csv', {
        responseType: 'blob',
      })

      // Create blob URL and download
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `contacts_export_${new Date().toISOString().split('T')[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)

      toast.success('CSV exported successfully')
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Error exporting CSV')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="card bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-md">
            <FileSpreadsheet className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Export Database</h2>
            <p className="text-sm text-gray-600">Download all records as CSV file</p>
          </div>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="btn-primary disabled:opacity-50"
        >
          {exporting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </>
          )}
        </button>
      </div>
    </div>
  )
}
