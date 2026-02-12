/**
 * Voice Relay Server
 *
 * Standalone Fastify server (port 3006) that bridges:
 *   Twilio Media Stream (μ-law 8kHz) ↔ OpenAI Realtime API (PCM16 24kHz)
 *
 * Architecture:
 *   Customer calls → Twilio → WebSocket to this server → OpenAI Realtime
 *   OpenAI responds → this server → Twilio → customer hears audio
 *
 * This runs OUTSIDE of Next.js because Vercel serverless doesn't support
 * long-lived WebSockets. Run locally on port 3006 or deploy to Fly.io/Railway.
 */

import 'dotenv/config'
import Fastify from 'fastify'
import fastifyWebsocket from '@fastify/websocket'
import { WebSocket } from 'ws'
import { mulawToLinear24k, linear24kToMulaw } from './audio-utils'
import { executeVoiceToolCall } from './tool-bridge'
import { buildVoiceSystemPrompt, getVoiceToolDefinitions } from '../modules/chatbot/lib/voice-prompt'
import { tools } from '../modules/chatbot/lib/tools'
import { db } from '../lib/db'
import { businesses, services, chatbotConversations, chatbotMessages } from '../lib/db/schema'
import { eq, and } from 'drizzle-orm'

const PORT = parseInt(process.env.VOICE_RELAY_PORT || '3006', 10)
const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const OPENAI_REALTIME_URL = 'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview'
const VOICE = 'sage' // OpenAI TTS voice: alloy, echo, fable, onyx, nova, shimmer, sage

if (!OPENAI_API_KEY) {
  console.error('[VoiceRelay] OPENAI_API_KEY is required')
  process.exit(1)
}

// ============================================
// TYPES
// ============================================

interface TwilioMediaMessage {
  event: string
  sequenceNumber?: string
  media?: {
    track: string
    chunk: string
    timestamp: string
    payload: string // base64 μ-law audio
  }
  start?: {
    streamSid: string
    accountSid: string
    callSid: string
    tracks: string[]
    customParameters: Record<string, string>
    mediaFormat: {
      encoding: string
      sampleRate: number
      channels: number
    }
  }
  stop?: {
    accountSid: string
    callSid: string
  }
  streamSid?: string
}

interface SessionState {
  streamSid: string
  callSid: string
  businessId: string
  conversationId?: string
  openaiWs: WebSocket | null
}

// ============================================
// BUSINESS CONTEXT LOADER
// ============================================

async function loadBusinessContext(businessId: string) {
  const business = await db
    .select()
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1)
    .then((rows) => rows[0])

  if (!business) return null

  const businessServices = await db
    .select({ name: services.name, description: services.description })
    .from(services)
    .where(and(eq(services.businessId, businessId), eq(services.isActive, true)))
    .orderBy(services.sortOrder)

  return {
    business,
    services: businessServices,
    customInstructions:
      typeof business.settings === 'object' && business.settings !== null
        ? (business.settings as { chatbotInstructions?: string }).chatbotInstructions
        : undefined,
  }
}

/**
 * Look up businessId from the Twilio phone number that was called.
 * Falls back to the businessId passed via stream parameters.
 */
async function resolveBusinessId(
  calledNumber: string | undefined,
  paramBusinessId: string | undefined,
): Promise<string | null> {
  // First try: check stream parameter
  if (paramBusinessId) return paramBusinessId

  // Second try: lookup by twilioPhoneNumber column
  if (calledNumber) {
    const normalized = calledNumber.replace(/\s+/g, '')
    const result = await db
      .select({ id: businesses.id })
      .from(businesses)
      .where(eq(businesses.twilioPhoneNumber, normalized))
      .limit(1)
      .then((rows) => rows[0])

    if (result) return result.id
  }

  return null
}

// ============================================
// CONVERSATION LOGGING
// ============================================

async function createVoiceConversation(businessId: string, callSid: string): Promise<string> {
  const [conversation] = await db
    .insert(chatbotConversations)
    .values({
      businessId,
      channel: 'voice',
      status: 'active',
      metadata: { callSid, startedAt: new Date().toISOString() },
    })
    .returning()

  return conversation.id
}

async function saveVoiceMessage(
  conversationId: string,
  role: 'user' | 'assistant' | 'tool' | 'system',
  content: string,
  metadata?: Record<string, unknown>,
) {
  await db.insert(chatbotMessages).values({
    conversationId,
    role,
    content,
    ...(metadata ? { metadata } : {}),
  })
}

async function closeVoiceConversation(conversationId: string, callSid: string) {
  await db
    .update(chatbotConversations)
    .set({
      status: 'closed',
      metadata: { callSid, endedAt: new Date().toISOString() },
      updatedAt: new Date(),
    })
    .where(eq(chatbotConversations.id, conversationId))
}

// ============================================
// OPENAI REALTIME SESSION SETUP
// ============================================

function connectToOpenAI(
  session: SessionState,
  systemPrompt: string,
  voiceTools: ReturnType<typeof getVoiceToolDefinitions>,
  twilioWs: WebSocket,
) {
  const openaiWs = new WebSocket(OPENAI_REALTIME_URL, {
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'OpenAI-Beta': 'realtime=v1',
    },
  })

  session.openaiWs = openaiWs

  openaiWs.on('open', () => {
    console.log(`[VoiceRelay] OpenAI Realtime connected (call: ${session.callSid})`)

    // Configure session
    openaiWs.send(
      JSON.stringify({
        type: 'session.update',
        session: {
          modalities: ['text', 'audio'],
          instructions: systemPrompt,
          voice: VOICE,
          input_audio_format: 'pcm16',
          output_audio_format: 'pcm16',
          input_audio_transcription: {
            model: 'whisper-1',
          },
          turn_detection: {
            type: 'server_vad',
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 500,
          },
          tools: voiceTools,
          tool_choice: 'auto',
          temperature: 0.7,
        },
      }),
    )
  })

  openaiWs.on('message', async (data) => {
    try {
      const event = JSON.parse(data.toString())
      await handleOpenAIEvent(event, session, twilioWs)
    } catch (error) {
      console.error('[VoiceRelay] Error processing OpenAI message:', error)
    }
  })

  openaiWs.on('error', (error) => {
    console.error(`[VoiceRelay] OpenAI WebSocket error (call: ${session.callSid}):`, error.message)
  })

  openaiWs.on('close', (code, reason) => {
    console.log(`[VoiceRelay] OpenAI WebSocket closed (call: ${session.callSid}): ${code} ${reason}`)
    session.openaiWs = null
  })

  return openaiWs
}

// ============================================
// OPENAI EVENT HANDLER
// ============================================

async function handleOpenAIEvent(
  event: Record<string, unknown>,
  session: SessionState,
  twilioWs: WebSocket,
) {
  switch (event.type) {
    case 'session.created':
      console.log(`[VoiceRelay] Session created (call: ${session.callSid})`)
      break

    case 'session.updated':
      console.log(`[VoiceRelay] Session configured (call: ${session.callSid})`)
      break

    case 'response.audio.delta': {
      // OpenAI sends PCM16 24kHz audio → convert to μ-law 8kHz for Twilio
      const audioDelta = event.delta as string
      if (audioDelta && twilioWs.readyState === WebSocket.OPEN) {
        const mulawAudio = linear24kToMulaw(audioDelta)
        twilioWs.send(
          JSON.stringify({
            event: 'media',
            streamSid: session.streamSid,
            media: {
              payload: mulawAudio,
            },
          }),
        )
      }
      break
    }

    case 'response.audio_transcript.done': {
      // AI finished speaking — save transcript
      const transcript = event.transcript as string
      if (transcript && session.conversationId) {
        await saveVoiceMessage(session.conversationId, 'assistant', transcript, {
          model: 'gpt-4o-realtime',
          channel: 'voice',
        })
      }
      break
    }

    case 'conversation.item.input_audio_transcription.completed': {
      // User speech transcribed — save to conversation
      const userTranscript = event.transcript as string
      if (userTranscript && session.conversationId) {
        console.log(`[VoiceRelay] User said: "${userTranscript}" (call: ${session.callSid})`)
        await saveVoiceMessage(session.conversationId, 'user', userTranscript, {
          channel: 'voice',
        })
      }
      break
    }

    case 'response.function_call_arguments.done': {
      // Tool call completed — execute it
      const callId = event.call_id as string
      const toolName = event.name as string
      const toolArgs = event.arguments as string

      console.log(`[VoiceRelay] Tool call: ${toolName} (call: ${session.callSid})`)

      const result = await executeVoiceToolCall(
        { call_id: callId, name: toolName, arguments: toolArgs },
        session.businessId,
        session.conversationId,
      )

      // Save tool call and result to conversation
      if (session.conversationId) {
        await saveVoiceMessage(session.conversationId, 'tool', result.output, {
          tool_call_id: callId,
          tool_name: toolName,
          channel: 'voice',
        })
      }

      // Send result back to OpenAI
      if (session.openaiWs?.readyState === WebSocket.OPEN) {
        // Send the tool output
        session.openaiWs.send(
          JSON.stringify({
            type: 'conversation.item.create',
            item: {
              type: 'function_call_output',
              call_id: callId,
              output: result.output,
            },
          }),
        )

        // Trigger the AI to respond with the tool result
        session.openaiWs.send(
          JSON.stringify({
            type: 'response.create',
          }),
        )
      }
      break
    }

    case 'input_audio_buffer.speech_started':
      // User started speaking — clear any pending AI audio (barge-in)
      if (twilioWs.readyState === WebSocket.OPEN) {
        twilioWs.send(
          JSON.stringify({
            event: 'clear',
            streamSid: session.streamSid,
          }),
        )
      }
      break

    case 'error': {
      const error = event.error as { message?: string; code?: string }
      console.error(`[VoiceRelay] OpenAI error (call: ${session.callSid}):`, error)
      break
    }
  }
}

// ============================================
// SERVER SETUP
// ============================================

async function main() {
  const fastify = Fastify({ logger: false })

  await fastify.register(fastifyWebsocket)

  // Health check
  fastify.get('/health', async () => ({ status: 'ok', service: 'voice-relay' }))

  // Twilio Media Stream WebSocket endpoint
  fastify.register(async (app) => {
    app.get('/media', { websocket: true }, (socket) => {
      console.log('[VoiceRelay] Twilio WebSocket connected')

      const session: SessionState = {
        streamSid: '',
        callSid: '',
        businessId: '',
        openaiWs: null,
      }

      socket.on('message', async (data) => {
        try {
          const msg: TwilioMediaMessage = JSON.parse(data.toString())

          switch (msg.event) {
            case 'connected':
              console.log('[VoiceRelay] Twilio stream connected')
              break

            case 'start': {
              // Stream started — extract metadata and set up OpenAI connection
              session.streamSid = msg.start!.streamSid
              session.callSid = msg.start!.callSid

              const params = msg.start!.customParameters || {}
              console.log('[VoiceRelay] Stream started:', {
                callSid: session.callSid,
                streamSid: session.streamSid,
                params,
              })

              // Resolve business ID from parameters or phone number lookup
              const businessId = await resolveBusinessId(params.calledNumber, params.businessId)

              if (!businessId) {
                console.error('[VoiceRelay] Could not resolve businessId')
                socket.close()
                return
              }

              session.businessId = businessId

              // Load business context
              const ctx = await loadBusinessContext(businessId)
              if (!ctx) {
                console.error(`[VoiceRelay] Business not found: ${businessId}`)
                socket.close()
                return
              }

              // Create voice conversation for logging
              session.conversationId = await createVoiceConversation(businessId, session.callSid)
              console.log(`[VoiceRelay] Conversation created: ${session.conversationId}`)

              // Build voice system prompt
              const systemPrompt = buildVoiceSystemPrompt(
                {
                  name: ctx.business.name,
                  type: ctx.business.type,
                  email: ctx.business.email,
                  phone: ctx.business.phone,
                  services: ctx.services,
                  policies: {
                    minBookingNoticeHours: ctx.business.minBookingNoticeHours,
                    cancellationPolicyHours: ctx.business.cancellationPolicyHours,
                  },
                  customInstructions: ctx.customInstructions,
                },
                businessId,
              )

              // Get voice tool definitions
              const voiceTools = getVoiceToolDefinitions(tools)

              // Connect to OpenAI Realtime
              connectToOpenAI(session, systemPrompt, voiceTools, socket as unknown as WebSocket)
              break
            }

            case 'media': {
              // Audio data from caller → convert and forward to OpenAI
              if (msg.media?.payload && session.openaiWs?.readyState === WebSocket.OPEN) {
                const mulawBuffer = Buffer.from(msg.media.payload, 'base64')
                const pcm16Base64 = mulawToLinear24k(mulawBuffer)

                session.openaiWs.send(
                  JSON.stringify({
                    type: 'input_audio_buffer.append',
                    audio: pcm16Base64,
                  }),
                )
              }
              break
            }

            case 'stop': {
              console.log(`[VoiceRelay] Stream stopped (call: ${session.callSid})`)

              // Close OpenAI connection
              if (session.openaiWs?.readyState === WebSocket.OPEN) {
                session.openaiWs.close()
              }

              // Close conversation
              if (session.conversationId) {
                await closeVoiceConversation(session.conversationId, session.callSid)
              }
              break
            }
          }
        } catch (error) {
          console.error('[VoiceRelay] Error processing Twilio message:', error)
        }
      })

      socket.on('close', async () => {
        console.log(`[VoiceRelay] Twilio WebSocket closed (call: ${session.callSid})`)

        if (session.openaiWs?.readyState === WebSocket.OPEN) {
          session.openaiWs.close()
        }

        if (session.conversationId) {
          await closeVoiceConversation(session.conversationId, session.callSid).catch((err) => {
            console.error('[VoiceRelay] Error closing conversation:', err)
          })
        }
      })

      socket.on('error', (error) => {
        console.error(`[VoiceRelay] Twilio WebSocket error:`, error)
      })
    })
  })

  // Start server
  try {
    await fastify.listen({ port: PORT, host: '0.0.0.0' })
    console.log(`[VoiceRelay] Server running on port ${PORT}`)
    console.log(`[VoiceRelay] WebSocket endpoint: ws://localhost:${PORT}/media`)
    console.log(`[VoiceRelay] Health check: http://localhost:${PORT}/health`)
  } catch (err) {
    console.error('[VoiceRelay] Failed to start:', err)
    process.exit(1)
  }
}

main()
