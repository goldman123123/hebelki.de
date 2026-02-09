/**
 * Support Conversations API
 *
 * GET /api/chatbot/support/conversations
 *
 * Lists conversations with status live_queue, live_active, or escalated.
 * Auth-protected: requires business membership.
 */

import { NextResponse } from 'next/server'
import { requireBusinessAuth } from '@/lib/auth'
import { db } from '@/lib/db'
import { chatbotConversations, chatbotMessages, customers } from '@/lib/db/schema'
import { eq, and, inArray, desc, sql } from 'drizzle-orm'

export async function GET() {
  try {
    const authResult = await requireBusinessAuth()
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const { business } = authResult

    // Fetch conversations that need staff attention
    const conversations = await db
      .select({
        id: chatbotConversations.id,
        status: chatbotConversations.status,
        channel: chatbotConversations.channel,
        metadata: chatbotConversations.metadata,
        createdAt: chatbotConversations.createdAt,
        updatedAt: chatbotConversations.updatedAt,
        customerId: chatbotConversations.customerId,
        customerName: customers.name,
        customerEmail: customers.email,
        customerPhone: customers.phone,
      })
      .from(chatbotConversations)
      .leftJoin(customers, eq(chatbotConversations.customerId, customers.id))
      .where(and(
        eq(chatbotConversations.businessId, business.id),
        inArray(chatbotConversations.status, ['live_queue', 'live_active', 'escalated'])
      ))
      .orderBy(desc(chatbotConversations.updatedAt))

    // Get last message and unread count for each conversation
    const enriched = await Promise.all(
      conversations.map(async (conv) => {
        // Last message
        const lastMsg = await db
          .select({
            content: chatbotMessages.content,
            role: chatbotMessages.role,
            createdAt: chatbotMessages.createdAt,
          })
          .from(chatbotMessages)
          .where(eq(chatbotMessages.conversationId, conv.id))
          .orderBy(desc(chatbotMessages.createdAt))
          .limit(1)
          .then(rows => rows[0])

        // Unread count (user messages since last staff message)
        const [unreadResult] = await db
          .select({ count: sql<number>`count(*)` })
          .from(chatbotMessages)
          .where(and(
            eq(chatbotMessages.conversationId, conv.id),
            eq(chatbotMessages.role, 'user'),
            sql`${chatbotMessages.createdAt} > coalesce(
              (select max(created_at) from chatbot_messages
               where conversation_id = ${conv.id} and role = 'staff'),
              '1970-01-01'
            )`
          ))

        return {
          ...conv,
          lastMessage: lastMsg ? {
            content: lastMsg.content.substring(0, 100),
            role: lastMsg.role,
            createdAt: lastMsg.createdAt?.toISOString(),
          } : null,
          unreadCount: Number(unreadResult?.count || 0),
        }
      })
    )

    return NextResponse.json({ success: true, conversations: enriched })
  } catch (error) {
    console.error('[Support Conversations API] Error:', error)
    return NextResponse.json(
      { error: 'Fehler beim Laden der Gespräche' },
      { status: 500 }
    )
  }
}
