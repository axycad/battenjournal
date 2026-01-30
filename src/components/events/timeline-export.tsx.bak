'use client'

import { useState } from 'react'
import { Button } from '@/components/ui'
import type { EventWithScopes } from '@/actions/event'

interface TimelineExportProps {
  events: EventWithScopes[]
  caseId: string
  childName: string
}

export function TimelineExport({ events, caseId, childName }: TimelineExportProps) {
  const [exporting, setExporting] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

  const exportAsCSV = () => {
    if (events.length === 0) return

    // Create CSV header
    const headers = [
      'Date',
      'Time',
      'Event Type',
      'Severity',
      'Scopes',
      'Notes',
      'Author',
      'Backdated',
    ]

    // Create CSV rows
    const rows = events.map((event) => {
      const date = event.occurredAt.toLocaleDateString('en-GB')
      const time = event.occurredAt.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
      })
      const eventType = event.eventType
      const severity = event.severity ? `Level ${event.severity}` : 'Not set'
      const scopes = event.scopes.map((s) => s.label).join('; ')
      const notes = event.freeText?.replace(/"/g, '""') || ''
      const author = event.author.name || 'Unknown'
      const backdated = event.isBackdated ? 'Yes' : 'No'

      return [date, time, eventType, severity, scopes, `"${notes}"`, author, backdated]
    })

    // Combine into CSV string
    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n')

    // Create download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${childName}-events-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)

    setShowMenu(false)
  }

  const exportAsPDF = async () => {
    setExporting(true)
    try {
      // Call server action to generate PDF
      const response = await fetch(`/api/export/timeline-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId,
          eventIds: events.map((e) => e.id),
        }),
      })

      if (!response.ok) {
        throw new Error('Export failed')
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${childName}-events-${new Date().toISOString().split('T')[0]}.pdf`
      link.click()
      URL.revokeObjectURL(url)

      setShowMenu(false)
    } catch (error) {
      console.error('Export error:', error)
      alert('Failed to export PDF. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  const printTimeline = () => {
    window.print()
    setShowMenu(false)
  }

  const copyShareLink = () => {
    const url = new URL(window.location.href)
    if (events.length > 0) {
      const firstDate = events[events.length - 1].occurredAt.toISOString().split('T')[0]
      const lastDate = events[0].occurredAt.toISOString().split('T')[0]
      url.searchParams.set('from', firstDate)
      url.searchParams.set('to', lastDate)
    }

    navigator.clipboard.writeText(url.toString())
    alert('Link copied to clipboard')
    setShowMenu(false)
  }

  if (events.length === 0) {
    return null
  }

  return (
    <div className="relative">
      <Button
        variant="secondary"
        onClick={() => setShowMenu(!showMenu)}
        disabled={exporting}
      >
        {exporting ? 'Exporting...' : 'Export'}
      </Button>

      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute right-0 mt-xs z-20 w-48 bg-white border border-divider rounded-md shadow-lg">
            <div className="py-xs">
              <button
                type="button"
                onClick={exportAsCSV}
                className="w-full px-md py-sm text-left text-body hover:bg-bg-primary"
              >
                📊 Export as CSV
              </button>
              <button
                type="button"
                onClick={printTimeline}
                className="w-full px-md py-sm text-left text-body hover:bg-bg-primary"
              >
                🖨️ Print timeline
              </button>
              <div className="h-px bg-divider my-xs" />
              <button
                type="button"
                onClick={copyShareLink}
                className="w-full px-md py-sm text-left text-body hover:bg-bg-primary"
              >
                🔗 Copy share link
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
