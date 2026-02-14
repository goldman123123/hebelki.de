import { NextRequest, NextResponse } from 'next/server'
import { requireBusinessAuth } from '@/lib/auth'
import { db } from '@/lib/db'
import { aiUsageLog } from '@/lib/db/schema'
import { eq, and, gte, sql } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  const authResult = await requireBusinessAuth()
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { searchParams } = new URL(request.url)
  const period = searchParams.get('period') || 'month'

  const now = new Date()
  let startDate: Date
  switch (period) {
    case 'day':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      break
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      break
    case 'month':
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      break
  }

  const businessId = authResult.business.id
  const dateFilter = and(
    eq(aiUsageLog.businessId, businessId),
    gte(aiUsageLog.createdAt, startDate),
  )

  const [totals, byChannel, byModel, daily] = await Promise.all([
    // Total aggregates
    db
      .select({
        totalTokens: sql<number>`coalesce(sum(${aiUsageLog.totalTokens}), 0)::int`,
        totalCostCents: sql<number>`coalesce(sum(${aiUsageLog.estimatedCostCents}), 0)::int`,
        totalCalls: sql<number>`count(*)::int`,
      })
      .from(aiUsageLog)
      .where(dateFilter),

    // Group by channel
    db
      .select({
        channel: aiUsageLog.channel,
        tokens: sql<number>`coalesce(sum(${aiUsageLog.totalTokens}), 0)::int`,
        costCents: sql<number>`coalesce(sum(${aiUsageLog.estimatedCostCents}), 0)::int`,
        calls: sql<number>`count(*)::int`,
      })
      .from(aiUsageLog)
      .where(dateFilter)
      .groupBy(aiUsageLog.channel),

    // Group by model
    db
      .select({
        model: aiUsageLog.model,
        tokens: sql<number>`coalesce(sum(${aiUsageLog.totalTokens}), 0)::int`,
        costCents: sql<number>`coalesce(sum(${aiUsageLog.estimatedCostCents}), 0)::int`,
        calls: sql<number>`count(*)::int`,
      })
      .from(aiUsageLog)
      .where(dateFilter)
      .groupBy(aiUsageLog.model),

    // Daily breakdown
    db
      .select({
        date: sql<string>`to_char(${aiUsageLog.createdAt}::date, 'YYYY-MM-DD')`,
        tokens: sql<number>`coalesce(sum(${aiUsageLog.totalTokens}), 0)::int`,
        costCents: sql<number>`coalesce(sum(${aiUsageLog.estimatedCostCents}), 0)::int`,
      })
      .from(aiUsageLog)
      .where(dateFilter)
      .groupBy(sql`${aiUsageLog.createdAt}::date`)
      .orderBy(sql`${aiUsageLog.createdAt}::date`),
  ])

  const totalsRow = totals[0] || { totalTokens: 0, totalCostCents: 0, totalCalls: 0 }

  return NextResponse.json({
    period,
    totalTokens: totalsRow.totalTokens,
    totalCostCents: totalsRow.totalCostCents,
    totalCalls: totalsRow.totalCalls,
    byChannel,
    byModel,
    daily,
  })
}
