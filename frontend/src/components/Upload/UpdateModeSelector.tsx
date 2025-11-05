import { Radio, CheckCircle2 } from 'lucide-react'

interface UpdateModeSelectorProps {
  mode: 'replace' | 'append'
  onChange: (mode: 'replace' | 'append') => void
}

export default function UpdateModeSelector({ mode, onChange }: UpdateModeSelectorProps) {
  return (
    <div className="card">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
          <Radio className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Update Mode</h2>
          <p className="text-sm text-gray-500">Choose how records should be processed</p>
        </div>
      </div>
      
      <div className="space-y-4">
        <label
          className={`relative flex items-start p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
            mode === 'replace'
              ? 'border-primary-500 bg-primary-50 shadow-sm'
              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center h-5 mt-0.5">
            <input
              type="radio"
              name="updateMode"
              value="replace"
              checked={mode === 'replace'}
              onChange={() => onChange('replace')}
              className="w-4 h-4 text-primary-600 focus:ring-primary-500 border-gray-300"
            />
          </div>
          <div className="ml-4 flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <span className="font-semibold text-gray-900">Replace Mode</span>
              <span className="badge bg-primary-100 text-primary-700">Smart Update</span>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              Update existing records (matched by Email OR Phone), add new records, and keep existing records not present in the file.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="text-xs px-2 py-1 bg-white rounded-md text-gray-600 border border-gray-200">
                Updates existing
              </span>
              <span className="text-xs px-2 py-1 bg-white rounded-md text-gray-600 border border-gray-200">
                Adds new
              </span>
              <span className="text-xs px-2 py-1 bg-white rounded-md text-gray-600 border border-gray-200">
                Preserves unmatched
              </span>
            </div>
          </div>
          {mode === 'replace' && (
            <CheckCircle2 className="absolute top-4 right-4 h-5 w-5 text-primary-600" />
          )}
        </label>

        <label
          className={`relative flex items-start p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
            mode === 'append'
              ? 'border-primary-500 bg-primary-50 shadow-sm'
              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center h-5 mt-0.5">
            <input
              type="radio"
              name="updateMode"
              value="append"
              checked={mode === 'append'}
              onChange={() => onChange('append')}
              className="w-4 h-4 text-primary-600 focus:ring-primary-500 border-gray-300"
            />
          </div>
          <div className="ml-4 flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <span className="font-semibold text-gray-900">Append Mode</span>
              <span className="badge bg-green-100 text-green-700">No Duplicates</span>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              Add only new records where both Email AND Phone are new. Skip any records that match existing entries.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="text-xs px-2 py-1 bg-white rounded-md text-gray-600 border border-gray-200">
                Adds new only
              </span>
              <span className="text-xs px-2 py-1 bg-white rounded-md text-gray-600 border border-gray-200">
                Skips duplicates
              </span>
              <span className="text-xs px-2 py-1 bg-white rounded-md text-gray-600 border border-gray-200">
                No updates
              </span>
            </div>
          </div>
          {mode === 'append' && (
            <CheckCircle2 className="absolute top-4 right-4 h-5 w-5 text-primary-600" />
          )}
        </label>
      </div>
    </div>
  )
}
