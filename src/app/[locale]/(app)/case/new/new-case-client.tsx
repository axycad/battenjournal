'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {Link} from '@/navigation'
import { Button, Input } from '@/components/ui'
import { createCaseAPI } from '@/lib/api/cases'

export default function NewCasePage() {
  const router = useRouter()
  const [childName, setChildName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await createCaseAPI({
        childDisplayName: childName,
        diseaseProfileVersion: 'CLN2',
      })

      if (result.id) {
        router.push(`/case/${result.id}`)
      } else {
        setError('Failed to create case')
        setLoading(false)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create case')
      setLoading(false)
    }
  }

  return (
    <div className="max-w-sm mx-auto px-md py-lg">
      <h1 className="text-h2 font-bold text-text-primary mb-lg">Add child</h1>

      <form onSubmit={handleSubmit} className="space-y-sm">
        <Input
          label="Child's name"
          type="text"
          name="childName"
          value={childName}
          onChange={(e) => setChildName(e.target.value)}
          placeholder="How you refer to them"
          required
          autoFocus
        />
        <p className="text-caption text-text-secondary">
          This can be a first name or nickname. You can add their full legal name later in the profile.
        </p>

        {error && (
          <p className="text-caption text-semantic-critical">{error}</p>
        )}

        <div className="flex gap-sm pt-sm">
          <Link href="/dashboard" className="flex-1">
            <Button variant="secondary" type="button" className="w-full border-purple-200 hover:border-purple-400 hover:bg-purple-50">
              Cancel
            </Button>
          </Link>
          <Button type="submit" className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:shadow-lg" loading={loading}>
            Add child
          </Button>
        </div>
      </form>
    </div>
  )
}
