export const HEBELKI_ORIGIN = 'https://www.hebelki.de'
export const MESSAGE_SOURCE = 'hebelki' as const

export type HebelkiMessageType =
  | 'hebelki:resize'
  | 'hebelki:booking-complete'
  | 'hebelki:booking-step'
  | 'hebelki:chat-ready'
  | 'hebelki:new-message'

export interface HebelkiMessage {
  type: HebelkiMessageType
  source: typeof MESSAGE_SOURCE
  slug: string
  payload: unknown
}

export function sendToParent(type: HebelkiMessageType, slug: string, payload: unknown = {}) {
  if (typeof window === 'undefined') return
  if (window.self === window.top) return // not in an iframe

  window.parent.postMessage(
    { type, source: MESSAGE_SOURCE, slug, payload },
    '*'
  )
}

export function isHebelkiMessage(event: MessageEvent): event is MessageEvent<HebelkiMessage> {
  return (
    event.data &&
    typeof event.data === 'object' &&
    event.data.source === MESSAGE_SOURCE &&
    typeof event.data.type === 'string'
  )
}
