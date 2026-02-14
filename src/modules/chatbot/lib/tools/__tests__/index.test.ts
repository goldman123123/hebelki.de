import { describe, it, expect, vi } from 'vitest'
import { executeTool } from '../index'

// Mock all handler modules so we don't need real DB/API connections
vi.mock('../handlers/public', () => ({
  publicHandlers: {
    get_current_date: vi.fn().mockResolvedValue('2026-02-13'),
    get_available_services: vi.fn().mockResolvedValue([]),
    get_available_staff: vi.fn().mockResolvedValue([]),
    check_availability: vi.fn().mockResolvedValue([]),
    create_hold: vi.fn().mockResolvedValue({ id: 'hold-1' }),
    confirm_booking: vi.fn().mockResolvedValue({ id: 'booking-1' }),
    search_knowledge_base: vi.fn().mockResolvedValue([]),
    request_data_deletion: vi.fn().mockResolvedValue({ success: true }),
  },
}))

vi.mock('../handlers/admin', () => ({
  adminHandlers: {
    search_bookings: vi.fn().mockResolvedValue([]),
    update_booking_status: vi.fn().mockResolvedValue({ success: true }),
    get_business_stats: vi.fn().mockResolvedValue({}),
  },
}))

vi.mock('../handlers/assistant', () => ({
  assistantHandlers: {
    send_email: vi.fn().mockResolvedValue({ success: true }),
  },
}))

describe('executeTool - access control gates', () => {
  describe('customer actor', () => {
    const customerArgs = (toolArgs: Record<string, unknown> = {}) => ({
      ...toolArgs,
      _accessContext: { actorType: 'customer' as const },
    })

    it('allows customer to call customer-safe tools', async () => {
      await expect(
        executeTool('get_current_date', customerArgs({ businessId: 'b1' }))
      ).resolves.not.toThrow()

      await expect(
        executeTool('get_available_services', customerArgs({ businessId: 'b1' }))
      ).resolves.not.toThrow()

      await expect(
        executeTool('search_knowledge_base', customerArgs({ businessId: 'b1', query: 'test' }))
      ).resolves.not.toThrow()
    })

    it('blocks customer from admin tools', async () => {
      await expect(
        executeTool('search_bookings', customerArgs({ businessId: 'b1' }))
      ).rejects.toThrow('Tool "search_bookings" is not available')

      await expect(
        executeTool('update_booking_status', customerArgs({ bookingId: 'bk1' }))
      ).rejects.toThrow('Tool "update_booking_status" is not available')

      await expect(
        executeTool('get_business_stats', customerArgs({ businessId: 'b1' }))
      ).rejects.toThrow('Tool "get_business_stats" is not available')
    })

    it('blocks customer from assistant tools', async () => {
      await expect(
        executeTool('send_email', customerArgs({ to: 'test@test.com' }))
      ).rejects.toThrow('Tool "send_email" is not available')
    })
  })

  describe('staff actor with capabilities', () => {
    it('allows staff to use customer tools even with restricted capabilities', async () => {
      const args = {
        businessId: 'b1',
        _accessContext: { actorType: 'staff' as const },
        _memberCapabilities: { allowedTools: [] }, // Empty whitelist
      }

      // Customer tools should always work for staff
      await expect(
        executeTool('get_available_services', args)
      ).resolves.not.toThrow()
    })

    it('allows staff to use tools in their capabilities whitelist', async () => {
      const args = {
        businessId: 'b1',
        _accessContext: { actorType: 'staff' as const },
        _memberCapabilities: { allowedTools: ['search_bookings'] },
      }

      await expect(
        executeTool('search_bookings', args)
      ).resolves.not.toThrow()
    })

    it('blocks staff from tools not in their capabilities whitelist', async () => {
      const args = {
        businessId: 'b1',
        _accessContext: { actorType: 'staff' as const },
        _memberCapabilities: { allowedTools: ['search_bookings'] },
      }

      await expect(
        executeTool('get_business_stats', args)
      ).rejects.toThrow('Tool "get_business_stats" is not available')
    })

    it('allows staff without capabilities restriction to use all tools', async () => {
      const args = {
        businessId: 'b1',
        _accessContext: { actorType: 'staff' as const },
        // No _memberCapabilities — no restriction
      }

      await expect(
        executeTool('search_bookings', args)
      ).resolves.not.toThrow()

      await expect(
        executeTool('get_business_stats', args)
      ).resolves.not.toThrow()
    })
  })

  describe('owner actor', () => {
    it('allows owner to use admin tools', async () => {
      const args = {
        businessId: 'b1',
        _accessContext: { actorType: 'owner' as const },
      }

      await expect(
        executeTool('search_bookings', args)
      ).resolves.not.toThrow()

      await expect(
        executeTool('get_business_stats', args)
      ).resolves.not.toThrow()
    })
  })

  describe('unknown tool', () => {
    it('throws for unknown tool name', async () => {
      await expect(
        executeTool('nonexistent_tool', { businessId: 'b1' })
      ).rejects.toThrow('Unknown tool: nonexistent_tool')
    })
  })

  describe('default actor type', () => {
    it('treats missing _accessContext as customer', async () => {
      // No _accessContext → defaults to customer → blocked from admin tools
      await expect(
        executeTool('search_bookings', { businessId: 'b1' })
      ).rejects.toThrow('Tool "search_bookings" is not available')
    })

    it('allows customer-safe tools without _accessContext', async () => {
      await expect(
        executeTool('get_current_date', { businessId: 'b1' })
      ).resolves.not.toThrow()
    })
  })
})
