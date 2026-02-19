'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Input, Select } from '@/components/ui'
import { addCareContactAPI, updateCareContactAPI, deleteCareContactAPI } from '@/lib/api/profile'
import type { CareContact } from '@prisma/client'

interface ContactsSectionProps {
  caseId: string
  contacts: CareContact[]
  canEdit: boolean
}

const ROLE_OPTIONS = [
  { value: 'GP', label: 'GP' },
  { value: 'specialist', label: 'Specialist' },
  { value: 'emergency', label: 'Emergency contact' },
  { value: 'nurse', label: 'Nurse' },
  { value: 'therapist', label: 'Therapist' },
  { value: 'other', label: 'Other' },
]

export function ContactsSection({
  caseId,
  contacts,
  canEdit,
}: ContactsSectionProps) {
  const router = useRouter()
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [role, setRole] = useState('GP')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')

  function resetForm() {
    setRole('GP')
    setName('')
    setPhone('')
    setAddress('')
    setError('')
  }

  async function handleAdd() {
    if (!name.trim()) return
    setSaving(true)
    setError('')
    try {
      const result = await addCareContactAPI(caseId, {
        role,
        name: name.trim(),
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
      }) as { success: boolean; error?: string }

      if (!result.success) {
        setError(result.error || 'Failed to add')
      } else {
        setAdding(false)
        resetForm()
        router.refresh()
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to add')
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdate(id: string) {
    if (!name.trim()) return
    setSaving(true)
    setError('')
    try {
      const result = await updateCareContactAPI(id, {
        role,
        name: name.trim(),
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
      }) as { success: boolean; error?: string }

      if (!result.success) {
        setError(result.error || 'Failed to update')
      } else {
        setEditingId(null)
        resetForm()
        router.refresh()
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    setSaving(true)
    setError('')
    try {
      const result = await deleteCareContactAPI(id) as { success: boolean; error?: string }
      if (!result.success) {
        setError(result.error || 'Failed to delete')
      } else {
        router.refresh()
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete')
    } finally {
      setDeletingId(null)
      setSaving(false)
    }
  }

  function startEdit(contact: CareContact) {
    setEditingId(contact.id)
    setRole(contact.role)
    setName(contact.name)
    setPhone(contact.phone || '')
    setAddress(contact.address || '')
  }

  function cancelEdit() {
    setEditingId(null)
    resetForm()
  }

  return (
    <section className="p-md bg-white border border-divider rounded-md">
      <div className="flex items-center justify-between mb-md">
        <h2 className="section-header">Care contacts</h2>
        {canEdit && !adding && (
          <Button
            variant="text"
            onClick={() => setAdding(true)}
            className="h-auto px-0"
          >
            Add
          </Button>
        )}
      </div>

      {contacts.length === 0 && !adding && (
        <p className="text-text-secondary">No contacts recorded</p>
      )}

      <ul className="divide-y divide-divider">
        {contacts.map((contact) => {
          if (editingId === contact.id) {
            return (
              <li key={contact.id} className="py-sm">
                <div className="space-y-sm">
                  <Select
                    label="Role"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    options={ROLE_OPTIONS}
                  />
                  <Input
                    label="Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoFocus
                  />
                  <Input
                    label="Phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                  <Input
                    label="Address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                  {error && <p className="text-caption text-semantic-critical">{error}</p>}
                  <div className="flex gap-sm">
                    <Button
                      variant="secondary"
                      onClick={cancelEdit}
                      disabled={saving}
                      className="h-auto py-1 px-sm"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => handleUpdate(contact.id)}
                      loading={saving}
                      className="h-auto py-1 px-sm"
                    >
                      Save
                    </Button>
                  </div>
                </div>
              </li>
            )
          }

          if (deletingId === contact.id) {
            return (
              <li key={contact.id} className="py-sm">
                <p className="text-body mb-sm">
                  Remove {contact.name}?
                </p>
                <div className="flex gap-sm">
                  <Button
                    variant="secondary"
                    onClick={() => setDeletingId(null)}
                    disabled={saving}
                    className="h-auto py-1 px-sm"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleDelete(contact.id)}
                    loading={saving}
                    className="h-auto py-1 px-sm"
                  >
                    Remove
                  </Button>
                </div>
              </li>
            )
          }

          return (
            <li key={contact.id} className="py-sm flex items-start justify-between">
              <div>
                <p className="text-body">
                  <span className="text-text-secondary">{contact.role}:</span>{' '}
                  {contact.name}
                </p>
                {contact.phone && (
                  <p className="text-meta text-text-secondary">
                    <a href={`tel:${contact.phone}`} className="hover:text-accent-primary">
                      {contact.phone}
                    </a>
                  </p>
                )}
                {contact.address && (
                  <p className="text-meta text-text-secondary">{contact.address}</p>
                )}
              </div>
              {canEdit && (
                <div className="flex gap-sm">
                  <Button
                    variant="text"
                    onClick={() => startEdit(contact)}
                    className="h-auto px-0 text-meta"
                  >
                    Edit
                  </Button>
                  <Button
                    variant="text"
                    onClick={() => setDeletingId(contact.id)}
                    className="h-auto px-0 text-meta text-text-secondary"
                  >
                    Remove
                  </Button>
                </div>
              )}
            </li>
          )
        })}
      </ul>

      {adding && (
        <div className="mt-sm pt-sm border-t border-divider space-y-sm">
          <Select
            label="Role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            options={ROLE_OPTIONS}
          />
          <Input
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Dr. Smith"
            autoFocus
          />
          <Input
            label="Phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <Input
            label="Address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
          {error && <p className="text-caption text-semantic-critical">{error}</p>}
          <div className="flex gap-sm">
            <Button
              variant="secondary"
              onClick={() => {
                setAdding(false)
                resetForm()
              }}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleAdd} loading={saving}>
              Add contact
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}
