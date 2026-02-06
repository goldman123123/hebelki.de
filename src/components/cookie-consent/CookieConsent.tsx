/**
 * GDPR-Compliant Cookie Consent Banner
 *
 * Uses vanilla-cookieconsent for full compliance with:
 * - GDPR (EU General Data Protection Regulation)
 * - ePrivacy Directive
 * - TTDSG (German Telecommunications Telemedia Data Protection Act)
 *
 * Features:
 * - Granular cookie categories
 * - Multi-language support (German primary)
 * - Revision management
 * - Opt-in/opt-out tracking
 */

'use client'

import { useEffect } from 'react'
import 'vanilla-cookieconsent/dist/cookieconsent.css'
import './cookie-consent-custom.css'
import * as CookieConsent from 'vanilla-cookieconsent'

export function CookieConsentBanner() {
  useEffect(() => {
    CookieConsent.run({
      // Revision - increment when cookie policy changes to re-prompt users
      revision: 1,

      // Auto-clear cookies when user opts out
      autoClearCookies: true,

      // GUI Options
      guiOptions: {
        consentModal: {
          layout: 'box inline',
          position: 'bottom right',
          equalWeightButtons: false,
          flipButtons: false,
        },
        preferencesModal: {
          layout: 'box',
          position: 'right',
          equalWeightButtons: true,
          flipButtons: false,
        },
      },

      // Cookie Categories
      categories: {
        necessary: {
          enabled: true, // Always enabled
          readOnly: true, // Cannot be disabled
        },
        analytics: {
          enabled: false, // Opt-in required
          readOnly: false,
          autoClear: {
            cookies: [
              {
                name: /^_ga/, // Google Analytics
              },
              {
                name: '_gid',
              },
            ],
          },
        },
        marketing: {
          enabled: false, // Opt-in required
          readOnly: false,
        },
      },

      // Language Configuration
      language: {
        default: 'de',
        autoDetect: 'browser',

        translations: {
          de: {
            consentModal: {
              title: '🍪 Wir verwenden Cookies',
              description:
                'Diese Website verwendet Cookies, um die Funktionalität zu gewährleisten und Ihr Erlebnis zu verbessern. Sie können Ihre Einstellungen jederzeit anpassen.',
              acceptAllBtn: 'Alle akzeptieren',
              acceptNecessaryBtn: 'Nur notwendige',
              showPreferencesBtn: 'Einstellungen verwalten',
              footer: `
                <a href="/datenschutz">Datenschutzerklärung</a>
                <a href="/impressum">Impressum</a>
              `,
            },
            preferencesModal: {
              title: 'Cookie-Einstellungen',
              acceptAllBtn: 'Alle akzeptieren',
              acceptNecessaryBtn: 'Nur notwendige',
              savePreferencesBtn: 'Einstellungen speichern',
              closeIconLabel: 'Schließen',
              serviceCounterLabel: 'Dienst|Dienste',
              sections: [
                {
                  title: 'Ihre Cookie-Einstellungen',
                  description:
                    'Auf dieser Website verwenden wir Cookies. Einige davon sind essenziell, während andere uns helfen, diese Website und Ihre Erfahrung zu verbessern. Sie können Ihre Einwilligung jederzeit mit Wirkung für die Zukunft widerrufen.',
                },
                {
                  title: 'Notwendige Cookies <span class="pm__badge">Immer aktiv</span>',
                  description:
                    'Diese Cookies sind für die Funktion der Website erforderlich und können nicht deaktiviert werden. Sie werden normalerweise nur als Reaktion auf von Ihnen vorgenommene Aktionen gesetzt, die einer Anforderung von Diensten gleichkommen (z.B. Anmeldung, Chatbot-Sitzung).',
                  linkedCategory: 'necessary',
                  cookieTable: {
                    headers: {
                      name: 'Name',
                      domain: 'Anbieter',
                      description: 'Beschreibung',
                      expiration: 'Ablauf',
                    },
                    body: [
                      {
                        name: '__session',
                        domain: 'Clerk (Auth)',
                        description: 'Authentifizierungs-Cookie für Anmeldung',
                        expiration: '7 Tage',
                      },
                      {
                        name: 'cc_cookie',
                        domain: 'Hebelki',
                        description: 'Speichert Ihre Cookie-Einstellungen',
                        expiration: '6 Monate',
                      },
                    ],
                  },
                },
                {
                  title: 'Analyse Cookies',
                  description:
                    'Diese Cookies helfen uns zu verstehen, wie Besucher mit der Website interagieren, indem Informationen anonym gesammelt und gemeldet werden. Wir verwenden diese Informationen, um die Website zu verbessern.',
                  linkedCategory: 'analytics',
                  cookieTable: {
                    headers: {
                      name: 'Name',
                      domain: 'Anbieter',
                      description: 'Beschreibung',
                      expiration: 'Ablauf',
                    },
                    body: [
                      {
                        name: '_ga',
                        domain: 'Google Analytics',
                        description: 'Unterscheidet Benutzer',
                        expiration: '2 Jahre',
                      },
                      {
                        name: '_gid',
                        domain: 'Google Analytics',
                        description: 'Unterscheidet Benutzer',
                        expiration: '24 Stunden',
                      },
                    ],
                  },
                },
                {
                  title: 'Marketing Cookies',
                  description:
                    'Diese Cookies werden verwendet, um Werbung relevanter für Sie und Ihre Interessen zu machen. Sie werden auch verwendet, um die Häufigkeit der Werbung zu begrenzen und die Wirksamkeit von Werbekampagnen zu messen.',
                  linkedCategory: 'marketing',
                },
                {
                  title: 'Weitere Informationen',
                  description:
                    'Bei Fragen zu unserer Cookie-Richtlinie und Ihren Wahlmöglichkeiten wenden Sie sich bitte über unsere <a class="cc__link" href="/datenschutz">Datenschutzerklärung</a> an uns. Sie können Ihre Einwilligung jederzeit widerrufen oder ändern.',
                },
              ],
            },
          },
          en: {
            consentModal: {
              title: '🍪 We use cookies',
              description:
                'This website uses cookies to ensure functionality and improve your experience. You can adjust your settings at any time.',
              acceptAllBtn: 'Accept all',
              acceptNecessaryBtn: 'Necessary only',
              showPreferencesBtn: 'Manage preferences',
              footer: `
                <a href="/datenschutz">Privacy Policy</a>
                <a href="/impressum">Legal Notice</a>
              `,
            },
            preferencesModal: {
              title: 'Cookie Settings',
              acceptAllBtn: 'Accept all',
              acceptNecessaryBtn: 'Necessary only',
              savePreferencesBtn: 'Save settings',
              closeIconLabel: 'Close',
              serviceCounterLabel: 'Service|Services',
              sections: [
                {
                  title: 'Your Cookie Settings',
                  description:
                    'We use cookies on this website. Some are essential, while others help us improve this website and your experience. You can revoke your consent at any time.',
                },
                {
                  title: 'Necessary Cookies <span class="pm__badge">Always active</span>',
                  description:
                    'These cookies are required for the website to function and cannot be disabled. They are usually only set in response to actions you take (e.g., login, chatbot session).',
                  linkedCategory: 'necessary',
                },
                {
                  title: 'Analytics Cookies',
                  description:
                    'These cookies help us understand how visitors interact with the website by collecting and reporting information anonymously.',
                  linkedCategory: 'analytics',
                },
                {
                  title: 'Marketing Cookies',
                  description:
                    'These cookies are used to make advertising more relevant to you and your interests.',
                  linkedCategory: 'marketing',
                },
                {
                  title: 'More Information',
                  description:
                    'For questions about our cookie policy and your choices, please see our <a class="cc__link" href="/datenschutz">Privacy Policy</a>.',
                },
              ],
            },
          },
        },
      },

      // Callback when user accepts/rejects cookies
      onConsent: ({ cookie }) => {
        console.log('[CookieConsent] User consent recorded:', cookie)

        // Track consent event (for analytics if enabled)
        if (cookie.categories.includes('analytics')) {
          console.log('[CookieConsent] Analytics cookies accepted')
          // Initialize Google Analytics here when implemented
        }
      },

      // Callback when user changes preferences
      onChange: ({ changedCategories, changedServices }) => {
        console.log('[CookieConsent] Preferences changed:', {
          changedCategories,
          changedServices,
        })

        // Handle analytics opt-out
        if (changedCategories.includes('analytics')) {
          console.log('[CookieConsent] Analytics preferences changed')
          // Disable/enable analytics tracking
        }
      },
    })
  }, [])

  return null // Component is headless, renders via vanilla-cookieconsent
}
