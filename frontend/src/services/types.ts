export interface Contact {
  id: number
  company: string
  name: string
  surname: string
  email: string
  position?: string
  phone: string
  created_at: string
  updated_at: string
}

export interface UploadResponse {
  success: boolean
  message: string
  filename: string
  file_type?: string
  sheet_names: string[]
  error?: string
}

export interface ProcessSheetsRequest {
  sheet_names: string[]
}

export interface ProcessSheetsResponse {
  success: boolean
  message: string
  data: Record<string, any>[]
  column_mapping: Record<string, Record<string, string | null>>
  errors: Record<string, string[]>
  total_rows: number
}

export interface PreviewChangesRequest {
  records: Record<string, any>[]
  update_mode: 'replace' | 'append'
}

export interface PreviewChangesResponse {
  updates: any[]
  new_records: any[]
  duplicates: any[]
  identity_conflicts: any[]
  summary: {
    updated_count: number
    new_count: number
    duplicates_count: number
    kept_count: number
    identity_conflicts_count: number
  }
}

export interface UpdateDatabaseRequest {
  preview_data: any
  selected_ids?: number[]
}

export interface UpdateDatabaseResponse {
  success: boolean
  message: string
  updated_count: number
  inserted_count: number
  skipped_count: number
  errors: string[]
}

export interface StatsResponse {
  total_records: number
  columns: number
}

