/**
 * Hebelki Embeddable Widget Loader
 * Vanilla JS — no dependencies — ~3KB minified
 *
 * Usage:
 *
 *   Inline booking:
 *   <div data-hebelki-booking data-slug="physioplus" data-color="#10B981"></div>
 *   <script src="https://www.hebelki.de/embed/widget.js" async></script>
 *
 *   Floating chat bubble:
 *   <script src="https://www.hebelki.de/embed/widget.js"
 *           data-hebelki-chat data-slug="physioplus" data-color="#3B82F6" async></script>
 */
;(function () {
  'use strict'

  var ORIGIN =
    location.hostname === 'localhost' || location.hostname === '127.0.0.1'
      ? location.protocol + '//' + location.host
      : 'https://www.hebelki.de'

  // ── Helpers ──────────────────────────────────────────────

  function stripHash(color) {
    return (color || '').replace(/^#/, '')
  }

  function buildSrc(path, slug, color) {
    var url = ORIGIN + '/embed/' + path + '/' + slug
    if (color) url += '?color=' + stripHash(color)
    return url
  }

  // ── 1. Inline Booking Widgets ────────────────────────────

  function initBookingWidgets() {
    var els = document.querySelectorAll('[data-hebelki-booking]')
    for (var i = 0; i < els.length; i++) {
      var el = els[i]
      if (el.dataset.hebelkiInit) continue
      el.dataset.hebelkiInit = '1'

      var slug = el.dataset.slug
      if (!slug) continue

      var iframe = document.createElement('iframe')
      iframe.src = buildSrc('book', slug, el.dataset.color)
      iframe.style.cssText = 'width:100%;border:none;min-height:500px;display:block;'
      iframe.loading = 'lazy'
      iframe.allow = 'payment'
      iframe.title = 'Hebelki Booking'
      iframe.dataset.hebelkiSlug = slug

      el.appendChild(iframe)
    }
  }

  // ── 2. Floating Chat Bubble ──────────────────────────────

  function initChatBubble() {
    // Find the script tag with data-hebelki-chat
    var scripts = document.querySelectorAll('script[data-hebelki-chat]')
    if (!scripts.length) return

    var script = scripts[scripts.length - 1]
    var slug = script.dataset.slug
    if (!slug) return

    var color = script.dataset.color || '#3B82F6'
    var position = script.dataset.position || 'right'

    // Prevent double-init
    if (document.getElementById('hebelki-chat-bubble')) return

    // ── Styles ──
    var style = document.createElement('style')
    style.textContent =
      '#hebelki-chat-bubble{position:fixed;bottom:20px;z-index:2147483647;' +
      (position === 'left' ? 'left:20px;' : 'right:20px;') +
      '}' +
      '#hebelki-chat-btn{width:60px;height:60px;border-radius:50%;border:none;cursor:pointer;' +
      'display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,.15);' +
      'transition:transform .2s,box-shadow .2s;position:relative;}' +
      '#hebelki-chat-btn:hover{transform:scale(1.05);box-shadow:0 6px 20px rgba(0,0,0,.2);}' +
      '#hebelki-chat-btn svg{width:28px;height:28px;fill:white;}' +
      '#hebelki-chat-badge{position:absolute;top:-2px;right:-2px;width:18px;height:18px;' +
      'border-radius:50%;background:#EF4444;display:none;align-items:center;justify-content:center;' +
      'font-size:11px;color:white;font-weight:600;line-height:1;}' +
      '#hebelki-chat-container{position:fixed;bottom:90px;z-index:2147483647;' +
      (position === 'left' ? 'left:20px;' : 'right:20px;') +
      'width:380px;height:600px;border-radius:16px;overflow:hidden;display:none;' +
      'box-shadow:0 8px 30px rgba(0,0,0,.12);background:white;}' +
      '#hebelki-chat-container iframe{width:100%;height:100%;border:none;}' +
      '@media(max-width:767px){' +
      '#hebelki-chat-container{position:fixed;top:0;left:0;right:0;bottom:0;width:100%;height:100%;' +
      'border-radius:0;z-index:2147483647;}' +
      '}'
    document.head.appendChild(style)

    // ── Chat Bubble Button ──
    var bubble = document.createElement('div')
    bubble.id = 'hebelki-chat-bubble'

    var btn = document.createElement('button')
    btn.id = 'hebelki-chat-btn'
    btn.style.backgroundColor = color
    btn.setAttribute('aria-label', 'Chat öffnen')
    btn.innerHTML =
      '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">' +
      '<path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>' +
      '</svg>'

    var badge = document.createElement('span')
    badge.id = 'hebelki-chat-badge'
    btn.appendChild(badge)
    bubble.appendChild(btn)
    document.body.appendChild(bubble)

    // ── Chat Container (lazy) ──
    var container = document.createElement('div')
    container.id = 'hebelki-chat-container'
    document.body.appendChild(container)

    var chatIframe = null
    var isOpen = false
    var unread = 0

    btn.addEventListener('click', function () {
      isOpen = !isOpen

      if (isOpen) {
        // Lazy-load iframe on first open
        if (!chatIframe) {
          chatIframe = document.createElement('iframe')
          chatIframe.src = buildSrc('chat', slug, color)
          chatIframe.title = 'Hebelki Chat'
          chatIframe.allow = 'microphone'
          container.appendChild(chatIframe)
        }

        container.style.display = 'block'
        unread = 0
        badge.style.display = 'none'
        badge.textContent = ''

        // Swap to close icon
        btn.innerHTML =
          '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">' +
          '<path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="white"/>' +
          '</svg>'
        btn.appendChild(badge)
      } else {
        container.style.display = 'none'

        // Swap back to chat icon
        btn.innerHTML =
          '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">' +
          '<path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>' +
          '</svg>'
        btn.appendChild(badge)
      }
    })

    // Track unread messages when chat is closed
    window.__hebelkiChatBadge = function () {
      if (isOpen) return
      unread++
      badge.textContent = unread > 9 ? '9+' : String(unread)
      badge.style.display = 'flex'
    }
  }

  // ── 3. postMessage Handler ───────────────────────────────

  function handleMessage(event) {
    var data = event.data
    if (!data || data.source !== 'hebelki') return

    switch (data.type) {
      case 'hebelki:resize':
        // Resize booking iframe to fit content
        var iframes = document.querySelectorAll('iframe[data-hebelki-slug="' + data.slug + '"]')
        for (var i = 0; i < iframes.length; i++) {
          iframes[i].style.height = data.payload.height + 'px'
        }
        break

      case 'hebelki:booking-complete':
        // Dispatch custom event for customer JS
        var bookingEvent = new CustomEvent('hebelki:booking-complete', { detail: data.payload })
        window.dispatchEvent(bookingEvent)
        break

      case 'hebelki:booking-step':
        var stepEvent = new CustomEvent('hebelki:booking-step', { detail: data.payload })
        window.dispatchEvent(stepEvent)
        break

      case 'hebelki:new-message':
        // Show unread badge on chat bubble
        if (window.__hebelkiChatBadge) {
          window.__hebelkiChatBadge()
        }
        var msgEvent = new CustomEvent('hebelki:new-message', { detail: data.payload })
        window.dispatchEvent(msgEvent)
        break

      case 'hebelki:chat-ready':
        var readyEvent = new CustomEvent('hebelki:chat-ready', { detail: data.payload })
        window.dispatchEvent(readyEvent)
        break
    }
  }

  window.addEventListener('message', handleMessage)

  // ── Init ─────────────────────────────────────────────────

  function init() {
    initBookingWidgets()
    initChatBubble()
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
