'use client'

import { useState } from 'react'
import { Button } from '@/components/ui'
import { createExportAPI, exportToCSVAPI, type ExportFormat, type ExportBundle } from '@/lib/api/export'

interface ExportFormProps {
  caseId: string
  availableScopes: { code: string; label: string; eventCount: number }[]
  hasResearchConsent: boolean
}

export function ExportForm({ caseId, availableScopes, hasResearchConsent }: ExportFormProps) {
  const [format, setFormat] = useState<ExportFormat>('json')
  const [selectedScopes, setSelectedScopes] = useState<string[]>([])
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [includeMedia, setIncludeMedia] = useState(false)
  const [includeDocuments, setIncludeDocuments] = useState(false)

  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')
  const [exportResult, setExportResult] = useState<ExportBundle | null>(null)

  function toggleScope(code: string) {
    setSelectedScopes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    )
  }

  function selectAllScopes() {
    setSelectedScopes(availableScopes.map((s) => s.code))
  }

  function clearScopes() {
    setSelectedScopes([])
  }

  async function handleExport() {
    setExporting(true)
    setError('')
    setExportResult(null)

    const result = await createExportAPI({
      caseId,
      format,
      scopeCodes: selectedScopes.length > 0 ? selectedScopes : undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      includeMedia,
      includeDocuments,
    })

    if (!result.success) {
      setError(result.error || 'Export failed')
    } else {
      setExportResult(result.data!)
    }

    setExporting(false)
  }

  async function handleDownload() {
    if (!exportResult) return

    let content: string
    let filename: string
    let mimeType: string

    if (format === 'csv') {
      content = await exportToCSVAPI(exportResult.events || [])
      filename = `export-${exportResult.id}.csv`
      mimeType = 'text/csv'
    } else {
      content = JSON.stringify(exportResult, null, 2)
      filename = `export-${exportResult.id}.json`
      mimeType = 'application/json'
    }

    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Show download result
  if (exportResult) {
    return (
      <div className="space-y-md">
        <div className="p-md bg-semantic-success/5 border border-semantic-success/30 rounded-md">
          <h2 className="text-body font-medium text-semantic-success mb-sm">Export ready</h2>
          <p className="text-meta text-text-secondary mb-md">
            Your export contains {exportResult.events?.length || 0} events
            {exportResult.metadata && ', profile data'}
            {exportResult.metadata && ' and additional data'}
          </p>

          <div className="flex gap-sm">
            <Button onClick={handleDownload}>
              Download {format.toUpperCase()}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setExportResult(null)
                setError('')
              }}
            >
              New export
            </Button>
          </div>
        </div>

        {/* Export summary */}
        <div className="p-md bg-white border border-divider rounded-md">
          <h3 className="text-body font-medium mb-sm">Export details</h3>
          <dl className="space-y-sm text-meta">
            <div className="flex justify-between">
              <dt className="text-text-secondary">Export ID</dt>
              <dd className="font-mono">{exportResult.id}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-secondary">Exported at</dt>
              <dd>{new Date(exportResult.createdAt).toLocaleString()}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-secondary">Events</dt>
              <dd>{exportResult.events?.length || 0}</dd>
            </div>
          </dl>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-lg">
      {/* Format selection */}
      <section className="p-md bg-white border border-divider rounded-md">
        <h2 className="text-body font-medium mb-sm">Format</h2>
        <div className="flex gap-sm">
          <label className="flex items-center gap-xs cursor-pointer">
            <input
              type="radio"
              name="format"
              value="json"
              checked={format === 'json'}
              onChange={() => setFormat('json')}
              className="text-accent-primary"
            />
            <span className="text-meta">JSON (complete data)</span>
          </label>
          <label className="flex items-center gap-xs cursor-pointer">
            <input
              type="radio"
              name="format"
              value="csv"
              checked={format === 'csv'}
              onChange={() => setFormat('csv')}
              className="text-accent-primary"
            />
            <span className="text-meta">CSV (events only)</span>
          </label>
        </div>
      </section>

      {/* Scope filter */}
      <section className="p-md bg-white border border-divider rounded-md">
        <div className="flex items-center justify-between mb-sm">
          <h2 className="text-body font-medium">Filter by category</h2>
          <div className="flex gap-sm">
            <button
              onClick={selectAllScopes}
              className="text-caption text-accent-primary hover:underline"
            >
              Select all
            </button>
            <button
              onClick={clearScopes}
              className="text-caption text-text-secondary hover:underline"
            >
              Clear
            </button>
          </div>
        </div>
        <p className="text-meta text-text-secondary mb-sm">
          Leave empty to export all categories
        </p>
        <div className="flex flex-wrap gap-xs">
          {availableScopes.map((scope) => (
            <button
              key={scope.code}
              onClick={() => toggleScope(scope.code)}
              className={`px-sm py-1 text-meta rounded-sm border transition-colors ${
                selectedScopes.includes(scope.code)
                  ? 'border-accent-primary bg-accent-primary/10 text-accent-primary'
                  : 'border-divider text-text-secondary hover:border-accent-primary'
              }`}
            >
              {scope.label} ({scope.eventCount})
            </button>
          ))}
        </div>
      </section>

      {/* Date range */}
      <section className="p-md bg-white border border-divider rounded-md">
        <h2 className="text-body font-medium mb-sm">Date range</h2>
        <p className="text-meta text-text-secondary mb-sm">
          Leave empty to export all dates
        </p>
        <div className="grid grid-cols-2 gap-sm">
          <div>
            <label className="block text-meta text-text-secondary mb-xs">From</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-sm py-2 text-body border border-divider rounded-sm bg-white"
            />
          </div>
          <div>
            <label className="block text-meta text-text-secondary mb-xs">To</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-sm py-2 text-body border border-divider rounded-sm bg-white"
            />
          </div>
        </div>
      </section>

      {/* Include options */}
      <section className="p-md bg-white border border-divider rounded-md">
        <h2 className="text-body font-medium mb-sm">Include</h2>
        <div className="space-y-sm">
          <label className="flex items-center gap-sm cursor-pointer">
            <input
              type="checkbox"
              checked={includeMedia}
              onChange={(e) => setIncludeMedia(e.target.checked)}
              className="rounded border-divider text-accent-primary"
            />
            <span className="text-meta">Media files manifest (download links)</span>
          </label>
          <label className="flex items-center gap-sm cursor-pointer">
            <input
              type="checkbox"
              checked={includeDocuments}
              onChange={(e) => setIncludeDocuments(e.target.checked)}
              className="rounded border-divider text-accent-primary"
            />
            <span className="text-meta">Documents manifest (download links)</span>
          </label>
        </div>
      </section>

      {/* Research export */}
      {hasResearchConsent && (
        <section className="p-md bg-accent-primary/5 border border-accent-primary/30 rounded-md">
          <h2 className="text-body font-medium mb-sm">Research export</h2>
          <p className="text-meta text-text-secondary mb-sm">
            You have research consent enabled. You can create an anonymised export for research purposes.
          </p>
          <Button variant="secondary">Create research export</Button>
        </section>
      )}

      {error && (
        <div className="p-sm bg-semantic-critical/5 border border-semantic-critical/30 rounded-sm">
          <p className="text-meta text-semantic-critical">{error}</p>
        </div>
      )}

      <Button onClick={handleExport} loading={exporting} className="w-full">
        Export data
      </Button>
    </div>
  )
}
