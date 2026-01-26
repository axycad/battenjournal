import {
  registerSchema,
  loginSchema,
  createCaseSchema,
  inviteSchema,
} from '@/lib/validations'

describe('registerSchema', () => {
  it('validates correct input', () => {
    const result = registerSchema.safeParse({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'securepassword123',
    })
    expect(result.success).toBe(true)
  })

  it('requires name', () => {
    const result = registerSchema.safeParse({
      name: '',
      email: 'john@example.com',
      password: 'securepassword123',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Name is required')
    }
  })

  it('validates email format', () => {
    const result = registerSchema.safeParse({
      name: 'John',
      email: 'notanemail',
      password: 'securepassword123',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Invalid email address')
    }
  })

  it('requires minimum password length', () => {
    const result = registerSchema.safeParse({
      name: 'John',
      email: 'john@example.com',
      password: 'short',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Password must be at least 8 characters')
    }
  })

  it('limits name length', () => {
    const result = registerSchema.safeParse({
      name: 'a'.repeat(101),
      email: 'john@example.com',
      password: 'securepassword123',
    })
    expect(result.success).toBe(false)
  })

  it('limits password length', () => {
    const result = registerSchema.safeParse({
      name: 'John',
      email: 'john@example.com',
      password: 'a'.repeat(101),
    })
    expect(result.success).toBe(false)
  })
})

describe('loginSchema', () => {
  it('validates correct input', () => {
    const result = loginSchema.safeParse({
      email: 'john@example.com',
      password: 'anypassword',
    })
    expect(result.success).toBe(true)
  })

  it('validates email format', () => {
    const result = loginSchema.safeParse({
      email: 'invalid',
      password: 'password',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Invalid email address')
    }
  })

  it('requires password', () => {
    const result = loginSchema.safeParse({
      email: 'john@example.com',
      password: '',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Password is required')
    }
  })
})

describe('createCaseSchema', () => {
  it('validates correct input', () => {
    const result = createCaseSchema.safeParse({
      childDisplayName: 'Emma',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.diseaseProfileVersion).toBe('CLN2')
    }
  })

  it('requires child name', () => {
    const result = createCaseSchema.safeParse({
      childDisplayName: '',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Child name is required')
    }
  })

  it('limits child name length', () => {
    const result = createCaseSchema.safeParse({
      childDisplayName: 'a'.repeat(101),
    })
    expect(result.success).toBe(false)
  })

  it('accepts custom disease profile', () => {
    const result = createCaseSchema.safeParse({
      childDisplayName: 'Emma',
      diseaseProfileVersion: 'CLN3',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.diseaseProfileVersion).toBe('CLN3')
    }
  })
})

describe('inviteSchema', () => {
  it('validates correct input', () => {
    const result = inviteSchema.safeParse({
      caseId: 'case123',
      email: 'family@example.com',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.familyRole).toBe('EDITOR')
    }
  })

  it('requires case ID', () => {
    const result = inviteSchema.safeParse({
      caseId: '',
      email: 'family@example.com',
    })
    expect(result.success).toBe(false)
  })

  it('validates email format', () => {
    const result = inviteSchema.safeParse({
      caseId: 'case123',
      email: 'invalid',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Invalid email address')
    }
  })

  it('accepts valid family roles', () => {
    const roles = ['OWNER_ADMIN', 'EDITOR', 'VIEWER'] as const
    for (const role of roles) {
      const result = inviteSchema.safeParse({
        caseId: 'case123',
        email: 'family@example.com',
        familyRole: role,
      })
      expect(result.success).toBe(true)
    }
  })

  it('rejects invalid family roles', () => {
    const result = inviteSchema.safeParse({
      caseId: 'case123',
      email: 'family@example.com',
      familyRole: 'INVALID_ROLE',
    })
    expect(result.success).toBe(false)
  })
})
