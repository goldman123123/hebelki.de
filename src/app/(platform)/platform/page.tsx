'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { LogIn } from 'lucide-react'

interface Business {
  id: string
  name: string
  slug: string
  type: string | null
  planId: string | null
  createdAt: string
}

export default function PlatformPage() {
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [enteringId, setEnteringId] = useState<string | null>(null)

  useEffect(() => {
    async function fetchBusinesses() {
      try {
        const res = await fetch('/api/platform/businesses')
        if (!res.ok) throw new Error('Failed to load businesses')
        const data = await res.json()
        setBusinesses(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }
    fetchBusinesses()
  }, [])

  async function handleEnter(businessId: string) {
    setEnteringId(businessId)
    try {
      const res = await fetch('/api/platform/enter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId }),
      })
      if (!res.ok) throw new Error('Failed to enter business')
      window.location.href = '/dashboard'
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to enter business')
      setEnteringId(null)
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Businesses</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : error ? (
          <div className="py-8 text-center text-red-600">{error}</div>
        ) : businesses.length === 0 ? (
          <div className="py-8 text-center text-gray-500">No businesses found</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {businesses.map((biz) => (
                <TableRow key={biz.id}>
                  <TableCell className="font-medium">{biz.name}</TableCell>
                  <TableCell className="text-muted-foreground">{biz.slug}</TableCell>
                  <TableCell>
                    {biz.type ? (
                      <Badge variant="secondary">{biz.type}</Badge>
                    ) : (
                      <span className="text-muted-foreground">--</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {biz.planId ? (
                      <Badge variant="outline">{biz.planId}</Badge>
                    ) : (
                      <span className="text-muted-foreground">--</span>
                    )}
                  </TableCell>
                  <TableCell>{formatDate(biz.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      onClick={() => handleEnter(biz.id)}
                      disabled={enteringId !== null}
                    >
                      <LogIn className="mr-1 h-3.5 w-3.5" />
                      {enteringId === biz.id ? 'Entering...' : 'Enter'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
