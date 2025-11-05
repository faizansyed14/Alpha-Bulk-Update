import { useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Search, X } from 'lucide-react'

interface SearchFilterProps {
  onSearchChange?: (searchTerm: string) => void
}

export default function SearchFilter({ onSearchChange }: SearchFilterProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const queryClient = useQueryClient()

  useEffect(() => {
    // Notify parent component of search term changes
    if (onSearchChange) {
      onSearchChange(searchTerm)
    }
  }, [searchTerm, onSearchChange])

  const handleSearch = () => {
    // Invalidate queries with the search term to trigger refetch
    queryClient.invalidateQueries({ 
      queryKey: ['records'],
      refetchType: 'active'
    })
  }

  const handleClear = () => {
    setSearchTerm('')
    // Invalidate and refetch without search term
    queryClient.invalidateQueries({ 
      queryKey: ['records'],
      refetchType: 'active'
    })
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  return (
    <div className="card">
      <div className="flex items-center space-x-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Search across all columns (Company, Name, Email, Phone...)"
            className="input-field pl-12 pr-10"
          />
          {searchTerm && (
            <button
              onClick={handleClear}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="h-4 w-4 text-gray-400" />
            </button>
          )}
        </div>
        <button
          onClick={handleSearch}
          className="btn-primary"
        >
          <Search className="h-4 w-4 mr-2" />
          Search
        </button>
      </div>
      {searchTerm && (
        <div className="mt-3 text-sm text-gray-600">
          Searching for: <span className="font-medium text-gray-900">"{searchTerm}"</span>
        </div>
      )}
    </div>
  )
}
