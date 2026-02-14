import { describe, it, expect } from 'vitest'
import {
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
  requirePermission,
  isOwner,
  isOwnerOrAdmin,
  getPermissionsForRole,
  ForbiddenError,
  type Permission,
} from '../permissions'
import type { BusinessMember } from '../auth'

// Minimal BusinessMember shape matching what hasPermission actually reads
function makeMember(role: string) {
  return { role } as unknown as BusinessMember
}

describe('hasPermission', () => {
  describe('owner role', () => {
    const owner = makeMember('owner')

    it('has full access to business management', () => {
      expect(hasPermission(owner, 'business:read')).toBe(true)
      expect(hasPermission(owner, 'business:update')).toBe(true)
      expect(hasPermission(owner, 'business:delete')).toBe(true)
    })

    it('has billing access', () => {
      expect(hasPermission(owner, 'billing:read')).toBe(true)
      expect(hasPermission(owner, 'billing:update')).toBe(true)
    })

    it('has member management access', () => {
      expect(hasPermission(owner, 'members:read')).toBe(true)
      expect(hasPermission(owner, 'members:invite')).toBe(true)
      expect(hasPermission(owner, 'members:update')).toBe(true)
      expect(hasPermission(owner, 'members:remove')).toBe(true)
    })
  })

  describe('admin role', () => {
    const admin = makeMember('admin')

    it('can read and update business but not delete', () => {
      expect(hasPermission(admin, 'business:read')).toBe(true)
      expect(hasPermission(admin, 'business:update')).toBe(true)
      expect(hasPermission(admin, 'business:delete')).toBe(false)
    })

    it('can read billing but not update', () => {
      expect(hasPermission(admin, 'billing:read')).toBe(true)
      expect(hasPermission(admin, 'billing:update')).toBe(false)
    })

    it('has full service management', () => {
      expect(hasPermission(admin, 'services:read')).toBe(true)
      expect(hasPermission(admin, 'services:create')).toBe(true)
      expect(hasPermission(admin, 'services:update')).toBe(true)
      expect(hasPermission(admin, 'services:delete')).toBe(true)
    })
  })

  describe('staff role', () => {
    const staff = makeMember('staff')

    it('has read-only access to business', () => {
      expect(hasPermission(staff, 'business:read')).toBe(true)
      expect(hasPermission(staff, 'business:update')).toBe(false)
      expect(hasPermission(staff, 'business:delete')).toBe(false)
    })

    it('has full booking access', () => {
      expect(hasPermission(staff, 'bookings:read')).toBe(true)
      expect(hasPermission(staff, 'bookings:create')).toBe(true)
      expect(hasPermission(staff, 'bookings:update')).toBe(true)
      expect(hasPermission(staff, 'bookings:delete')).toBe(true)
    })

    it('has full customer access', () => {
      expect(hasPermission(staff, 'customers:read')).toBe(true)
      expect(hasPermission(staff, 'customers:create')).toBe(true)
      expect(hasPermission(staff, 'customers:update')).toBe(true)
      expect(hasPermission(staff, 'customers:delete')).toBe(true)
    })

    it('cannot manage services or staff', () => {
      expect(hasPermission(staff, 'services:create')).toBe(false)
      expect(hasPermission(staff, 'services:update')).toBe(false)
      expect(hasPermission(staff, 'services:delete')).toBe(false)
      expect(hasPermission(staff, 'staff:create')).toBe(false)
      expect(hasPermission(staff, 'staff:update')).toBe(false)
      expect(hasPermission(staff, 'staff:delete')).toBe(false)
    })

    it('cannot manage members', () => {
      expect(hasPermission(staff, 'members:read')).toBe(false)
      expect(hasPermission(staff, 'members:invite')).toBe(false)
      expect(hasPermission(staff, 'members:update')).toBe(false)
      expect(hasPermission(staff, 'members:remove')).toBe(false)
    })

    it('has no billing access', () => {
      expect(hasPermission(staff, 'billing:read')).toBe(false)
      expect(hasPermission(staff, 'billing:update')).toBe(false)
    })

    it('can read settings but not update', () => {
      expect(hasPermission(staff, 'settings:read')).toBe(true)
      expect(hasPermission(staff, 'settings:update')).toBe(false)
      expect(hasPermission(staff, 'settings:availability')).toBe(false)
    })
  })

  describe('unknown role', () => {
    it('returns false for unknown roles', () => {
      const unknown = makeMember('hacker')
      expect(hasPermission(unknown, 'business:read')).toBe(false)
    })

    it('returns false for empty role', () => {
      const empty = { role: '' } as unknown as BusinessMember
      expect(hasPermission(empty, 'business:read')).toBe(false)
    })
  })
})

describe('hasAllPermissions', () => {
  it('returns true when member has all requested permissions', () => {
    const admin = makeMember('admin')
    expect(
      hasAllPermissions(admin, ['services:read', 'services:create', 'services:update'])
    ).toBe(true)
  })

  it('returns false when member lacks any permission', () => {
    const staff = makeMember('staff')
    expect(
      hasAllPermissions(staff, ['bookings:read', 'services:create'])
    ).toBe(false)
  })
})

describe('hasAnyPermission', () => {
  it('returns true when member has at least one permission', () => {
    const staff = makeMember('staff')
    expect(
      hasAnyPermission(staff, ['business:delete', 'bookings:read'])
    ).toBe(true)
  })

  it('returns false when member has none of the permissions', () => {
    const staff = makeMember('staff')
    expect(
      hasAnyPermission(staff, ['business:delete', 'billing:update'])
    ).toBe(false)
  })
})

describe('requirePermission', () => {
  it('does not throw when permission is granted', () => {
    const owner = makeMember('owner')
    expect(() => requirePermission(owner, 'business:delete')).not.toThrow()
  })

  it('throws ForbiddenError when permission is denied', () => {
    const staff = makeMember('staff')
    expect(() => requirePermission(staff, 'business:delete')).toThrow(ForbiddenError)
  })
})

describe('role checks', () => {
  it('isOwner returns true only for owner', () => {
    expect(isOwner(makeMember('owner'))).toBe(true)
    expect(isOwner(makeMember('admin'))).toBe(false)
    expect(isOwner(makeMember('staff'))).toBe(false)
  })

  it('isOwnerOrAdmin returns true for owner and admin', () => {
    expect(isOwnerOrAdmin(makeMember('owner'))).toBe(true)
    expect(isOwnerOrAdmin(makeMember('admin'))).toBe(true)
    expect(isOwnerOrAdmin(makeMember('staff'))).toBe(false)
  })
})

describe('getPermissionsForRole', () => {
  it('returns more permissions for owner than admin', () => {
    const ownerPerms = getPermissionsForRole('owner')
    const adminPerms = getPermissionsForRole('admin')
    expect(ownerPerms.length).toBeGreaterThan(adminPerms.length)
  })

  it('returns more permissions for admin than staff', () => {
    const adminPerms = getPermissionsForRole('admin')
    const staffPerms = getPermissionsForRole('staff')
    expect(adminPerms.length).toBeGreaterThan(staffPerms.length)
  })
})
