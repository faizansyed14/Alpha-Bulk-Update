import { useState } from 'react'
import FileUploader from './FileUploader'
import UpdateModeSelector from './UpdateModeSelector'
import PreviewChanges from './PreviewChanges'
import { ProcessSheetsResponse, PreviewChangesResponse } from '../../services/types'

export default function UploadTab() {
  const [file, setFile] = useState<File | null>(null)
  const [updateMode, setUpdateMode] = useState<'replace' | 'append'>('replace')
  const [processedData, setProcessedData] = useState<ProcessSheetsResponse | null>(null)
  const [, setPreviewData] = useState<PreviewChangesResponse | null>(null)
  const [, setSelectedSheets] = useState<string[]>([])

  return (
    <div className="space-y-6">
      {/* Update Mode Selector */}
      <UpdateModeSelector mode={updateMode} onChange={setUpdateMode} />

      {/* File Uploader */}
      <FileUploader
        file={file}
        onFileChange={setFile}
        onProcessedData={setProcessedData}
        onSelectedSheets={setSelectedSheets}
      />

      {/* Preview Changes */}
      {processedData && processedData.success && (
        <PreviewChanges
          processedData={processedData.data}
          updateMode={updateMode}
          onPreviewData={setPreviewData}
        />
      )}
    </div>
  )
}

