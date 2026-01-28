'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {Link} from '@/navigation'
import { Button, Input } from '@/components/ui'
import { createCase } from '@/actions/case'

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
      const result = await createCase({
        childDisplayName: childName,
        diseaseProfileVersion: 'CLN2',
      })

      if (!result.success) {
        setError(result.error || 'Failed to create')
        setLoading(false)
        return
      }

      router.push(`/case/${result.data?.caseId}`)
    } catch {
      setError('Something went wrong')
      setLoading(false)
    }
  }

  return (
    <div className="max-w-sm mx-auto px-md py-lg">
      <h1 className="screen-title mb-lg">Add child</h1>

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
            <Button variant="secondary" type="button" className="w-full">
              Cancel
            </Button>
          </Link>
          <Button type="submit" className="flex-1" loading={loading}>
            Add child
          </Button>
        </div>
      </form>
    </div>
  )
}
