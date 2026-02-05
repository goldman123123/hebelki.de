import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env.local
config({ path: resolve(__dirname, '../.env.local') })

import { db } from '../src/lib/db/index'
import { chatbotConversations, chatbotMessages } from '../src/lib/db/schema'
import { eq, desc } from 'drizzle-orm'

async function checkMessages() {
  try {
    // Get the most recent conversation
    const conversations = await db
      .select()
      .from(chatbotConversations)
      .orderBy(desc(chatbotConversations.updatedAt))
      .limit(1)

    if (!conversations.length) {
      console.log('No conversations found')
      return
    }

    const conversation = conversations[0]
    console.log('\n==== Most Recent Conversation ====')
    console.log(`ID: ${conversation.id}`)
    console.log(`Business ID: ${conversation.businessId}`)
    console.log(`Status: ${conversation.status}`)
    console.log(`Updated: ${conversation.updatedAt}`)

    // Get messages for this conversation
    const messages = await db
      .select()
      .from(chatbotMessages)
      .where(eq(chatbotMessages.conversationId, conversation.id))
      .orderBy(chatbotMessages.createdAt)

    console.log(`\n==== Messages (${messages.length} total) ====\n`)

    messages.forEach((msg, index) => {
      console.log(`\n--- Message ${index + 1} ---`)
      console.log(`Role: ${msg.role}`)
      console.log(`Content: ${msg.content}`)
      if (msg.metadata) {
        console.log(`Metadata:`, JSON.stringify(msg.metadata, null, 2))
      }
    })

    process.exit(0)
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

checkMessages()
