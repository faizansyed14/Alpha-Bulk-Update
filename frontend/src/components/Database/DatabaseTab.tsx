import { useState } from 'react'
import RecordsTable from './RecordsTable'
import SearchFilter from './SearchFilter'
import EditRecord from './EditRecord'
import DeleteRecord from './DeleteRecord'
import ExportButton from './ExportButton'
import StatsCards from './StatsCards'
import RollbackSnapshots from './RollbackSnapshots'

export default function DatabaseTab() {
  const [searchTerm, setSearchTerm] = useState('')

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <StatsCards />

      {/* Edit and Delete - Moved above search */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <EditRecord />
        <DeleteRecord />
      </div>

      {/* Search and Filter */}
      <SearchFilter onSearchChange={setSearchTerm} />

      {/* Records Table */}
      <RecordsTable searchTerm={searchTerm} />

      {/* Export */}
      <ExportButton />

      {/* Rollback Snapshots */}
      <RollbackSnapshots />
    </div>
  )
}
