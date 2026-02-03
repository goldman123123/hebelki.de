'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ConfirmDialog } from '@/components/forms'
import { StaffForm } from '@/components/forms/StaffForm'
import { Plus, Pencil, Trash2, Loader2, MoreVertical } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
interface StaffFormData {
  name: string
  email?: string | null
  phone?: string | null
  title?: string | null
  bio?: string | null
  avatarUrl?: string | null
  isActive?: boolean
  serviceIds?: string[]
}

interface StaffMember {
  id: string
  name: string
  email: string | null
  phone: string | null
  title: string | null
  bio: string | null
  avatarUrl: string | null
  isActive: boolean | null
  serviceIds?: string[]
}

export default function StaffPage() {
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null)
  const [deleteStaff, setDeleteStaff] = useState<StaffMember | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchStaff = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/staff')
      const data = await res.json()
      setStaffMembers(data.staff || [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStaff()
  }, [fetchStaff])

  async function fetchStaffWithServices(staffId: string): Promise<StaffMember | null> {
    const res = await fetch(`/api/admin/staff/${staffId}`)
    const data = await res.json()
    return data.staff
  }

  async function handleCreate(data: StaffFormData) {
    const res = await fetch('/api/admin/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      const result = await res.json()
      // Assign services
      if (data.serviceIds && data.serviceIds.length > 0) {
        await fetch(`/api/admin/staff/${result.staff.id}/services`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ serviceIds: data.serviceIds }),
        })
      }
      fetchStaff()
    }
  }

  async function handleEdit(data: StaffFormData) {
    if (!editingStaff) return
    const res = await fetch(`/api/admin/staff/${editingStaff.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      // Update services
      await fetch(`/api/admin/staff/${editingStaff.id}/services`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceIds: data.serviceIds || [] }),
      })
      setEditingStaff(null)
      fetchStaff()
    }
  }

  async function handleDelete() {
    if (!deleteStaff) return
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/admin/staff/${deleteStaff.id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setDeleteStaff(null)
        fetchStaff()
      }
    } finally {
      setIsDeleting(false)
    }
  }

  async function handleToggleActive(member: StaffMember) {
    await fetch(`/api/admin/staff/${member.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !member.isActive }),
    })
    fetchStaff()
  }

  async function handleEditClick(member: StaffMember) {
    const staffWithServices = await fetchStaffWithServices(member.id)
    if (staffWithServices) {
      setEditingStaff(staffWithServices)
    }
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff</h1>
          <p className="text-gray-600">Manage your team members</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Staff
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : staffMembers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">No staff members configured yet.</p>
            <Button className="mt-4" onClick={() => setShowForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Team Member
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {staffMembers.map((member) => (
            <Card key={member.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={member.avatarUrl || undefined} />
                      <AvatarFallback>
                        {member.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase()
                          .slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{member.name}</h3>
                        {!member.isActive && (
                          <Badge variant="outline" className="text-xs">
                            Inactive
                          </Badge>
                        )}
                      </div>
                      {member.title && (
                        <p className="text-sm text-gray-500">{member.title}</p>
                      )}
                      {member.email && (
                        <p className="mt-2 text-sm text-gray-500">{member.email}</p>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEditClick(member)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleToggleActive(member)}>
                        {member.isActive ? 'Deactivate' : 'Activate'}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => setDeleteStaff(member)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {member.bio && (
                  <p className="mt-4 text-sm text-gray-600 line-clamp-3">
                    {member.bio}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <StaffForm
        open={showForm}
        onOpenChange={setShowForm}
        onSubmit={handleCreate}
      />

      <StaffForm
        open={!!editingStaff}
        onOpenChange={(open) => !open && setEditingStaff(null)}
        onSubmit={handleEdit}
        defaultValues={editingStaff ? {
          name: editingStaff.name,
          email: editingStaff.email,
          phone: editingStaff.phone,
          title: editingStaff.title,
          bio: editingStaff.bio,
          avatarUrl: editingStaff.avatarUrl,
          isActive: editingStaff.isActive ?? true,
          serviceIds: editingStaff.serviceIds || [],
        } : undefined}
        isEditing
      />

      <ConfirmDialog
        open={!!deleteStaff}
        onOpenChange={(open) => !open && setDeleteStaff(null)}
        title="Delete Staff Member"
        description={`Are you sure you want to delete "${deleteStaff?.name}"? This will hide them from booking but preserve historical data.`}
        onConfirm={handleDelete}
        isConfirming={isDeleting}
        confirmLabel="Delete"
      />
    </div>
  )
}
