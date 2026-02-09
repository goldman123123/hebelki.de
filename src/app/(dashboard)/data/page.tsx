import { redirect } from 'next/navigation'

/**
 * Data page - Redirects to /chatbot
 *
 * The Daten functionality has been merged into the Chatbot page.
 * This redirect ensures any bookmarks or links still work.
 */
export default function DataPage() {
  redirect('/chatbot')
}
