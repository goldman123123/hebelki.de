import { config } from 'dotenv'
config({ path: '.env.local' })

import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq, sql } from 'drizzle-orm'
import { randomUUID } from 'crypto'
import {
  businesses,
  services,
  staff,
  staffServices,
  availabilityTemplates,
  availabilitySlots,
  customers,
  bookings,
  chatbotKnowledge,
} from '../src/lib/db/schema'

const neonSql = neon(process.env.DATABASE_URL!)
const db = drizzle(neonSql)

// ============================================
// HELPERS
// ============================================

function daysFromNow(days: number): Date {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d
}

function setTime(date: Date, hours: number, minutes: number): Date {
  const d = new Date(date)
  d.setHours(hours, minutes, 0, 0)
  return d
}

function addMinutes(date: Date, mins: number): Date {
  return new Date(date.getTime() + mins * 60_000)
}

// ============================================
// DEMO BUSINESS DEFINITIONS
// ============================================

interface DemoBusiness {
  name: string
  slug: string
  type: string
  primaryColor: string
  description: string
  tagline: string
  email: string
  phone: string
  address: string
  website: string
  staff: { name: string; email: string; title: string; bio: string }[]
  services: { name: string; description: string; durationMinutes: number; bufferMinutes: number; price: string; category: string; capacity: number }[]
  // staffServices: index of staff -> indices of services they handle
  staffServiceMap: number[][]
  // availability: per-staff schedule overrides (null = use default)
  availability: { days: { day: number; start: string; end: string }[] }[]
  customers: { name: string; email: string; phone: string }[]
  // bookings: [staffIdx, serviceIdx, customerIdx, daysFromNow, hour, status]
  bookingDefs: [number, number, number, number, number, string][]
  knowledge: { title: string; content: string; category: string; audience: string; authorityLevel: string; source: string }[]
}

const HEBELKI_KNOWLEDGE: DemoBusiness['knowledge'] = [
  {
    title: 'Was ist Hebelki?',
    content: 'Hebelki ist eine moderne SaaS-Plattform für Terminbuchung mit KI-Unterstützung. Unternehmen können ihren Kunden Online-Terminbuchung, KI-Chatbot, Sprachassistent und WhatsApp-Integration anbieten. Die Plattform ist speziell für den deutschen Markt entwickelt und DSGVO-konform.',
    category: 'platform',
    audience: 'public',
    authorityLevel: 'canonical',
    source: 'manual',
  },
  {
    title: 'Hebelki Preise',
    content: 'Hebelki bietet vier Tarife an: Free (kostenlos, 1 Mitarbeiter, 50 Buchungen/Monat), Starter (19 EUR/Monat, 3 Mitarbeiter, unbegrenzte Buchungen), Pro (49 EUR/Monat, 10 Mitarbeiter, KI-Chatbot, WhatsApp, Voice), Enterprise (auf Anfrage, unbegrenzt Mitarbeiter, eigene Domain, API-Zugang). Alle Tarife können 14 Tage kostenlos getestet werden.',
    category: 'pricing',
    audience: 'public',
    authorityLevel: 'canonical',
    source: 'manual',
  },
  {
    title: 'Hebelki Funktionen',
    content: 'Hebelki bietet folgende Funktionen: KI-Chatbot für automatische Kundenbetreuung, Sprachassistent für Telefonanrufe, WhatsApp-Integration für Terminbuchung per Chat, Online-Buchungsseite mit eigenem Branding, Kalender-Management, Kundenverwaltung, Rechnungserstellung, Team-Verwaltung mit Berechtigungen und ein Dashboard mit Auswertungen.',
    category: 'features',
    audience: 'public',
    authorityLevel: 'canonical',
    source: 'manual',
  },
  {
    title: 'Wie fange ich an?',
    content: 'Die Einrichtung von Hebelki dauert nur 5 Minuten: 1. Registrieren Sie sich auf hebelki.de, 2. Geben Sie Ihre Geschäftsdaten ein, 3. Erstellen Sie Ihre Dienstleistungen und Mitarbeiter, 4. Teilen Sie Ihren Buchungslink mit Ihren Kunden. Optional können Sie den KI-Chatbot aktivieren und Ihre Wissensbasis befüllen.',
    category: 'getting-started',
    audience: 'public',
    authorityLevel: 'canonical',
    source: 'manual',
  },
  {
    title: 'Datenschutz & DSGVO',
    content: 'Hebelki ist vollständig DSGVO-konform. Alle Daten werden in der EU gehostet (Neon PostgreSQL auf AWS Frankfurt). Wir verwenden Ende-zu-Ende-Verschlüsselung für sensible Daten. Kunden können jederzeit eine Löschung ihrer Daten beantragen (Art. 17 DSGVO). Unser Auftragsverarbeitungsvertrag (AVV) ist auf Anfrage verfügbar. Unterauftragnehmer: Clerk (Auth), Neon (DB), OpenAI (KI), Stripe (Zahlung).',
    category: 'privacy',
    audience: 'public',
    authorityLevel: 'canonical',
    source: 'manual',
  },
]

const DEMO_BUSINESSES: DemoBusiness[] = [
  // ========== 1. PfotenGlück Tierarztpraxis ==========
  {
    name: 'PfotenGlück Tierarztpraxis',
    slug: 'demo-vet',
    type: 'clinic',
    primaryColor: '#10B981',
    description: 'Ihre Tierarztpraxis im Herzen von Berlin-Mitte. Wir betreuen Hunde, Katzen und Kleintiere mit modernster Diagnostik und liebevoller Pflege.',
    tagline: 'Liebevolle Tiermedizin in Berlin-Mitte',
    email: 'praxis@pfotenglueck-berlin.de',
    phone: '+49 30 5557890',
    address: 'Torstraße 125, 10119 Berlin',
    website: 'https://pfotenglueck-berlin.de',
    staff: [
      { name: 'Dr. Katrin Wolff', email: 'k.wolff@pfotenglueck-berlin.de', title: 'Tierärztin (Kleintiere)', bio: 'Fachtierärztin für Kleintiere mit 12 Jahren Erfahrung. Schwerpunkte: Innere Medizin, Zahnheilkunde und Geriatrie.' },
      { name: 'Dr. Markus Engel', email: 'm.engel@pfotenglueck-berlin.de', title: 'Tierarzt (Chirurgie)', bio: 'Spezialist für Weichteil- und orthopädische Chirurgie. Zertifiziert in minimalinvasiven OP-Techniken.' },
      { name: 'Lisa Bauer', email: 'l.bauer@pfotenglueck-berlin.de', title: 'Tiermedizinische Fachangestellte', bio: 'Erfahrene TFA mit Zusatzqualifikation in Tierverhaltensberatung und Ernährungsberatung.' },
    ],
    services: [
      { name: 'Allgemeine Untersuchung', description: 'Gründliche körperliche Untersuchung mit Beratung zu Gesundheit und Vorsorge.', durationMinutes: 30, bufferMinutes: 10, price: '55.00', category: 'Untersuchung', capacity: 1 },
      { name: 'Impfung & Vorsorge', description: 'Schutzimpfungen, Entwurmung und allgemeine Gesundheitsvorsorge für Ihr Haustier.', durationMinutes: 20, bufferMinutes: 5, price: '45.00', category: 'Vorsorge', capacity: 1 },
      { name: 'Zahnbehandlung', description: 'Professionelle Zahnreinigung und Zahnbehandlung unter Narkose.', durationMinutes: 60, bufferMinutes: 15, price: '180.00', category: 'Behandlung', capacity: 1 },
      { name: 'Kastration / Sterilisation', description: 'Operative Kastration oder Sterilisation mit Voruntersuchung und Nachsorge.', durationMinutes: 90, bufferMinutes: 30, price: '250.00', category: 'Chirurgie', capacity: 1 },
      { name: 'Notfallsprechstunde', description: 'Dringende Behandlung bei akuten Beschwerden und Verletzungen.', durationMinutes: 45, bufferMinutes: 15, price: '95.00', category: 'Notfall', capacity: 1 },
    ],
    staffServiceMap: [
      [0, 1, 2, 4],    // Dr. Wolff: Untersuchung, Impfung, Zahn, Notfall
      [0, 2, 3, 4],    // Dr. Engel: Untersuchung, Zahn, Kastration, Notfall
      [0, 1],           // Lisa: Untersuchung, Impfung
    ],
    availability: [
      { days: [{ day: 1, start: '08:00', end: '18:00' }, { day: 2, start: '08:00', end: '18:00' }, { day: 3, start: '08:00', end: '14:00' }, { day: 4, start: '08:00', end: '18:00' }, { day: 5, start: '08:00', end: '16:00' }] },
      { days: [{ day: 1, start: '09:00', end: '17:00' }, { day: 2, start: '09:00', end: '17:00' }, { day: 3, start: '09:00', end: '17:00' }, { day: 4, start: '09:00', end: '17:00' }, { day: 5, start: '09:00', end: '17:00' }, { day: 6, start: '09:00', end: '13:00' }] },
      { days: [{ day: 1, start: '08:00', end: '16:00' }, { day: 2, start: '08:00', end: '16:00' }, { day: 3, start: '08:00', end: '16:00' }, { day: 4, start: '08:00', end: '16:00' }, { day: 5, start: '08:00', end: '14:00' }] },
    ],
    customers: [
      { name: 'Anna Richter', email: 'anna.richter@example.de', phone: '+49 176 12345678' },
      { name: 'Stefan Hoffmann', email: 'stefan.hoffmann@example.de', phone: '+49 151 98765432' },
      { name: 'Marie Schulz', email: 'marie.schulz@example.de', phone: '+49 170 11223344' },
      { name: 'Jan Weber', email: 'jan.weber@example.de', phone: '+49 172 55667788' },
      { name: 'Claudia Fischer', email: 'claudia.fischer@example.de', phone: '+49 160 99887766' },
      { name: 'Thomas Braun', email: 'thomas.braun@example.de', phone: '+49 175 44332211' },
      { name: 'Petra Neumann', email: 'petra.neumann@example.de', phone: '+49 163 77889900' },
    ],
    bookingDefs: [
      [0, 0, 0, -5, 10, 'completed'],
      [1, 3, 1, -3, 14, 'completed'],
      [0, 1, 2, -1, 9, 'completed'],
      [2, 0, 3, 0, 11, 'confirmed'],
      [0, 4, 4, 0, 15, 'confirmed'],
      [1, 0, 5, 1, 10, 'confirmed'],
      [0, 2, 6, 3, 9, 'confirmed'],
      [2, 1, 0, 5, 14, 'confirmed'],
    ],
    knowledge: [
      { title: 'Öffnungszeiten', content: 'Unsere Praxis ist von Montag bis Freitag von 08:00 bis 18:00 Uhr geöffnet. Samstags bieten wir von 09:00 bis 13:00 Uhr eine eingeschränkte Sprechstunde an. Notfälle werden jederzeit während der Öffnungszeiten behandelt.', category: 'faq', audience: 'public', authorityLevel: 'high', source: 'manual' },
      { title: 'Standort & Parken', content: 'PfotenGlück befindet sich in der Torstraße 125, 10119 Berlin-Mitte. Der nächste Parkplatz ist das Parkhaus Torstraße (2 Min. zu Fuß). Mit den Öffis: U8 Rosenthaler Platz (5 Min. Fußweg). Barrierefreier Zugang vorhanden.', category: 'faq', audience: 'public', authorityLevel: 'high', source: 'manual' },
      { title: 'Termin absagen', content: 'Termine können bis 24 Stunden vorher kostenlos storniert werden. Bei kurzfristigeren Absagen berechnen wir eine Ausfallgebühr von 30 EUR. Bitte rufen Sie uns an oder nutzen Sie den Stornierungslink in Ihrer Bestätigungsmail.', category: 'policies', audience: 'public', authorityLevel: 'high', source: 'manual' },
      { title: 'Tierversicherung', content: 'Wir akzeptieren alle gängigen Tier-Krankenversicherungen und rechnen direkt mit den Versicherungen ab. Bitte bringen Sie Ihre Versicherungsunterlagen zum Termin mit. Selbstzahler erhalten die Rechnung direkt nach der Behandlung.', category: 'faq', audience: 'public', authorityLevel: 'high', source: 'manual' },
      { title: 'Notfälle', content: 'Bei Notfällen außerhalb unserer Sprechzeiten wenden Sie sich bitte an die Tierärztliche Notaufnahme Berlin unter +49 30 838 62910. Während der Sprechzeiten behandeln wir Notfälle sofort — bitte rufen Sie vorher kurz an.', category: 'faq', audience: 'public', authorityLevel: 'high', source: 'manual' },
      { title: 'Erste-Besuch-Hinweise', content: 'Zum ersten Besuch bringen Sie bitte mit: Impfpass Ihres Tieres, bisherige Befunde/Röntgenbilder, aktuelle Medikamentenliste, Versicherungsunterlagen. Bitte kommen Sie 10 Minuten vor dem Termin für die Anmeldung.', category: 'faq', audience: 'public', authorityLevel: 'normal', source: 'manual' },
      { title: 'Preisinformationen intern', content: 'Preise basieren auf der GOT (Gebührenordnung für Tierärzte). Standardsatz 1-fach, bei Notfällen bis 3-fach. Rabatte für Tierschutzorganisationen nach Absprache. Ratenzahlung ab 500 EUR möglich.', category: 'pricing', audience: 'internal', authorityLevel: 'high', source: 'manual' },
      ...HEBELKI_KNOWLEDGE,
    ],
  },

  // ========== 2. AutoFix Berlin ==========
  {
    name: 'AutoFix Berlin',
    slug: 'demo-mechanic',
    type: 'other',
    primaryColor: '#F59E0B',
    description: 'Ihre KFZ-Werkstatt mit Termin-Service in Berlin-Charlottenburg. Professionelle Autoreparatur, Inspektion und TÜV-Vorbereitung.',
    tagline: 'Ihr Autowerkstatt-Profi in Charlottenburg',
    email: 'info@autofix-berlin.de',
    phone: '+49 30 3344556',
    address: 'Kantstraße 88, 10627 Berlin',
    website: 'https://autofix-berlin.de',
    staff: [
      { name: 'Michael Krause', email: 'm.krause@autofix-berlin.de', title: 'KFZ-Meister', bio: 'KFZ-Meister mit über 20 Jahren Erfahrung. Spezialisiert auf europäische Fahrzeugmarken, Motordiagnose und Elektrik.' },
      { name: 'Yusuf Demir', email: 'y.demir@autofix-berlin.de', title: 'KFZ-Mechatroniker', bio: 'Zertifizierter Mechatroniker mit Schwerpunkt Hybridfahrzeuge und moderne Fahrzeugelektronik.' },
      { name: 'Sebastian Koch', email: 's.koch@autofix-berlin.de', title: 'KFZ-Mechatroniker', bio: 'Erfahrener Mechaniker für Karosserie, Fahrwerk und Bremsen. TÜV-Prüfingenieur-Zulassung.' },
    ],
    services: [
      { name: 'Inspektion (klein)', description: 'Kleine Inspektion: Ölwechsel, Filterwechsel, Sichtprüfung aller Bauteile, Flüssigkeitsstände.', durationMinutes: 60, bufferMinutes: 15, price: '149.00', category: 'Inspektion', capacity: 1 },
      { name: 'Inspektion (groß)', description: 'Große Inspektion inkl. umfangreicher Prüfung aller Systeme, Zahnriemen-Check, Bremsen-Check.', durationMinutes: 120, bufferMinutes: 30, price: '289.00', category: 'Inspektion', capacity: 1 },
      { name: 'TÜV-Vorbereitung', description: 'Umfassende Prüfung und Vorbereitung für die Hauptuntersuchung (HU/AU). Kleine Mängel werden direkt behoben.', durationMinutes: 90, bufferMinutes: 15, price: '89.00', category: 'TÜV', capacity: 1 },
      { name: 'Reifenwechsel (4 Reifen)', description: 'Saisonaler Reifenwechsel inkl. Auswuchten, Reifendruck-Check und Sichtprüfung der Reifen.', durationMinutes: 30, bufferMinutes: 10, price: '49.00', category: 'Reifen', capacity: 2 },
      { name: 'Fehlerdiagnose', description: 'Elektronische Fehlerdiagnose mit OBD-Scanner inkl. Fehlercode-Auslesen und Beratung.', durationMinutes: 45, bufferMinutes: 10, price: '69.00', category: 'Diagnose', capacity: 1 },
    ],
    staffServiceMap: [
      [0, 1, 2, 4],    // Michael: alle Inspektionen, TÜV, Diagnose
      [0, 1, 4],        // Yusuf: Inspektionen, Diagnose
      [2, 3],            // Sebastian: TÜV, Reifenwechsel
    ],
    availability: [
      { days: [{ day: 1, start: '07:30', end: '17:00' }, { day: 2, start: '07:30', end: '17:00' }, { day: 3, start: '07:30', end: '17:00' }, { day: 4, start: '07:30', end: '17:00' }, { day: 5, start: '07:30', end: '15:00' }] },
      { days: [{ day: 1, start: '08:00', end: '17:00' }, { day: 2, start: '08:00', end: '17:00' }, { day: 3, start: '08:00', end: '17:00' }, { day: 4, start: '08:00', end: '17:00' }, { day: 5, start: '08:00', end: '16:00' }] },
      { days: [{ day: 1, start: '07:30', end: '16:30' }, { day: 2, start: '07:30', end: '16:30' }, { day: 3, start: '07:30', end: '16:30' }, { day: 4, start: '07:30', end: '16:30' }, { day: 5, start: '07:30', end: '14:00' }, { day: 6, start: '08:00', end: '12:00' }] },
    ],
    customers: [
      { name: 'Frank Meier', email: 'frank.meier@example.de', phone: '+49 176 22334455' },
      { name: 'Sandra Vogel', email: 'sandra.vogel@example.de', phone: '+49 151 66778899' },
      { name: 'Helmut Schwarz', email: 'helmut.schwarz@example.de', phone: '+49 170 33445566' },
      { name: 'Karin Lehmann', email: 'karin.lehmann@example.de', phone: '+49 172 77889900' },
      { name: 'Oliver Hartmann', email: 'oliver.hartmann@example.de', phone: '+49 160 11224433' },
      { name: 'Monika Becker', email: 'monika.becker@example.de', phone: '+49 175 55667788' },
    ],
    bookingDefs: [
      [0, 0, 0, -7, 8, 'completed'],
      [2, 3, 1, -4, 10, 'completed'],
      [1, 4, 2, -2, 9, 'completed'],
      [0, 1, 3, 0, 8, 'confirmed'],
      [2, 2, 4, 1, 10, 'confirmed'],
      [1, 0, 5, 2, 13, 'confirmed'],
      [0, 4, 0, 4, 9, 'confirmed'],
      [2, 3, 1, 6, 11, 'confirmed'],
    ],
    knowledge: [
      { title: 'Öffnungszeiten', content: 'AutoFix Berlin ist von Montag bis Freitag 07:30–17:00 Uhr geöffnet. Freitags schließen wir um 15:00 Uhr. Samstag 08:00–12:00 Uhr nur für Reifenwechsel und Abholung. Terminvereinbarung online oder telefonisch empfohlen.', category: 'faq', audience: 'public', authorityLevel: 'high', source: 'manual' },
      { title: 'Standort & Anfahrt', content: 'AutoFix Berlin, Kantstraße 88, 10627 Berlin-Charlottenburg. 5 kostenlose Kundenparkplätze direkt vor der Werkstatt. S-Bahn Savignyplatz (7 Min. Fußweg). Zufahrt auch über Hinterhof möglich.', category: 'faq', audience: 'public', authorityLevel: 'high', source: 'manual' },
      { title: 'Termin absagen', content: 'Termine können bis 48 Stunden vor dem vereinbarten Termin kostenlos storniert werden. Bei kurzfristigeren Absagen behalten wir uns eine Aufwandspauschale von 25 EUR vor. Umbuchungen sind jederzeit kostenlos möglich.', category: 'policies', audience: 'public', authorityLevel: 'high', source: 'manual' },
      { title: 'Bezahlung', content: 'Wir akzeptieren Barzahlung, EC-Karte und Überweisung. Bei Reparaturen über 500 EUR bieten wir Ratenzahlung über unseren Partner CreditPlus an. Firmenkunden erhalten auf Wunsch ein Zahlungsziel von 14 Tagen.', category: 'faq', audience: 'public', authorityLevel: 'high', source: 'manual' },
      { title: 'Leihwagen', content: 'Bei längeren Reparaturen stellen wir Ihnen kostenlos einen Leihwagen zur Verfügung (Verfügbarkeit vorausgesetzt). Bitte bei der Terminbuchung angeben, damit wir ein Fahrzeug reservieren können.', category: 'faq', audience: 'public', authorityLevel: 'normal', source: 'manual' },
      { title: 'Garantie auf Reparaturen', content: 'Auf alle Reparaturen geben wir 2 Jahre Garantie auf Arbeitsleistung und Originalteile. Bei Verschleißteilen (Bremsbeläge, Reifen) gelten die Herstellergarantiebedingungen.', category: 'policies', audience: 'public', authorityLevel: 'high', source: 'manual' },
      ...HEBELKI_KNOWLEDGE,
    ],
  },

  // ========== 3. Salon Haarwerk ==========
  {
    name: 'Salon Haarwerk',
    slug: 'demo-salon',
    type: 'salon',
    primaryColor: '#EC4899',
    description: 'Friseursalon & Beauty in Berlin-Kreuzberg. Haarschnitte, Färbung, Styling und Kosmetik in stilvollem Ambiente.',
    tagline: 'Dein Style-Erlebnis in Kreuzberg',
    email: 'hallo@salon-haarwerk.de',
    phone: '+49 30 6677889',
    address: 'Oranienstraße 42, 10999 Berlin',
    website: 'https://salon-haarwerk.de',
    staff: [
      { name: 'Nina Petersen', email: 'nina@salon-haarwerk.de', title: 'Friseurmeisterin & Inhaberin', bio: 'Friseurmeisterin mit 15 Jahren Erfahrung. Spezialistin für Balayage, kreative Farbtechniken und Hochzeitsstyling.' },
      { name: 'Emre Yilmaz', email: 'emre@salon-haarwerk.de', title: 'Senior Stylist', bio: 'Preisgekrönter Stylist mit Leidenschaft für Herrenschnitte, Fades und Bartpflege. Ausgebildet in London und Istanbul.' },
      { name: 'Julia Hartmann', email: 'julia@salon-haarwerk.de', title: 'Coloristin & Stylistin', bio: 'Spezialistin für Haarfarbe, Strähnentechniken und Haarpflege. Zertifizierte Olaplex-Anwenderin.' },
    ],
    services: [
      { name: 'Damenhaarschnitt', description: 'Waschen, Schneiden, Föhnen. Beratung zu Stil und Pflege inklusive.', durationMinutes: 60, bufferMinutes: 10, price: '55.00', category: 'Schnitt', capacity: 1 },
      { name: 'Herrenhaarschnitt', description: 'Präzisionsschnitt inkl. Waschen und Styling. Bartkorrektur auf Wunsch.', durationMinutes: 30, bufferMinutes: 5, price: '32.00', category: 'Schnitt', capacity: 1 },
      { name: 'Balayage / Strähnchen', description: 'Natürliche Farbverläufe und Strähnentechniken. Inkl. Pflegebehandlung und Styling.', durationMinutes: 90, bufferMinutes: 15, price: '120.00', category: 'Farbe', capacity: 1 },
      { name: 'Komplettfärbung', description: 'Professionelle Haarfärbung mit hochwertigen Produkten. Vorher-Beratung und Nachpflege.', durationMinutes: 75, bufferMinutes: 10, price: '85.00', category: 'Farbe', capacity: 1 },
      { name: 'Hochzeitsstyling', description: 'Exklusives Braut-Styling inkl. Probestyling-Termin. Hochsteckfrisuren, Accessoires, Finishing.', durationMinutes: 90, bufferMinutes: 15, price: '180.00', category: 'Styling', capacity: 1 },
    ],
    staffServiceMap: [
      [0, 2, 3, 4],    // Nina: Damen, Balayage, Färbung, Hochzeit
      [1, 0],           // Emre: Herren, Damen
      [0, 2, 3],        // Julia: Damen, Balayage, Färbung
    ],
    availability: [
      { days: [{ day: 2, start: '09:00', end: '19:00' }, { day: 3, start: '09:00', end: '19:00' }, { day: 4, start: '09:00', end: '19:00' }, { day: 5, start: '09:00', end: '19:00' }, { day: 6, start: '09:00', end: '16:00' }] },
      { days: [{ day: 1, start: '10:00', end: '19:00' }, { day: 2, start: '10:00', end: '19:00' }, { day: 3, start: '10:00', end: '19:00' }, { day: 4, start: '10:00', end: '19:00' }, { day: 5, start: '10:00', end: '18:00' }, { day: 6, start: '09:00', end: '15:00' }] },
      { days: [{ day: 1, start: '09:00', end: '18:00' }, { day: 2, start: '09:00', end: '18:00' }, { day: 3, start: '09:00', end: '18:00' }, { day: 4, start: '09:00', end: '18:00' }, { day: 5, start: '09:00', end: '17:00' }] },
    ],
    customers: [
      { name: 'Sophie Krüger', email: 'sophie.krueger@example.de', phone: '+49 176 33445566' },
      { name: 'Lena Hofmann', email: 'lena.hofmann@example.de', phone: '+49 151 22334455' },
      { name: 'Max Wagner', email: 'max.wagner@example.de', phone: '+49 170 44556677' },
      { name: 'Elena Roth', email: 'elena.roth@example.de', phone: '+49 172 88990011' },
      { name: 'David Schneider', email: 'david.schneider@example.de', phone: '+49 160 55443322' },
      { name: 'Jasmin Özkan', email: 'jasmin.oezkan@example.de', phone: '+49 175 11002233' },
      { name: 'Chris Berger', email: 'chris.berger@example.de', phone: '+49 163 99887700' },
      { name: 'Amelie Weiß', email: 'amelie.weiss@example.de', phone: '+49 178 66554433' },
    ],
    bookingDefs: [
      [0, 0, 0, -6, 10, 'completed'],
      [1, 1, 2, -4, 14, 'completed'],
      [2, 2, 1, -2, 11, 'completed'],
      [0, 3, 3, -1, 9, 'completed'],
      [1, 1, 4, 0, 15, 'confirmed'],
      [0, 0, 5, 1, 10, 'confirmed'],
      [2, 3, 6, 2, 11, 'confirmed'],
      [0, 4, 7, 5, 10, 'confirmed'],
      [1, 1, 2, 6, 16, 'confirmed'],
    ],
    knowledge: [
      { title: 'Öffnungszeiten', content: 'Salon Haarwerk ist Dienstag bis Freitag von 09:00 bis 19:00 Uhr geöffnet, Samstag von 09:00 bis 16:00 Uhr. Montag ist Ruhetag. Termine nach 18:00 Uhr sind auf Anfrage für Hochzeitskunden möglich.', category: 'faq', audience: 'public', authorityLevel: 'high', source: 'manual' },
      { title: 'Standort & Anfahrt', content: 'Salon Haarwerk, Oranienstraße 42, 10999 Berlin-Kreuzberg. U-Bahn: U1/U8 Kottbusser Tor (3 Min. Fußweg). Fahrradständer direkt vor dem Salon. Parken im Kiez ist begrenzt — wir empfehlen Öffis oder Fahrrad.', category: 'faq', audience: 'public', authorityLevel: 'high', source: 'manual' },
      { title: 'Termin absagen', content: 'Bitte sagen Sie Ihren Termin mindestens 24 Stunden vorher ab. Bei No-Shows oder kurzfristigen Absagen (unter 6 Stunden) berechnen wir 50% des Servicepreises. Online-Stornierung über Ihren Buchungslink möglich.', category: 'policies', audience: 'public', authorityLevel: 'high', source: 'manual' },
      { title: 'Preise & Bezahlung', content: 'Die angegebenen Preise sind Richtwerte. Der genaue Preis hängt von Haarlänge und -dichte ab. Wir akzeptieren Barzahlung und EC-Karte. Trinkgeld ist willkommen, aber kein Muss.', category: 'faq', audience: 'public', authorityLevel: 'high', source: 'manual' },
      { title: 'Allergien & Verträglichkeit', content: 'Bitte informieren Sie uns bei der Buchung über bekannte Allergien, insbesondere gegen Haarfarben oder Pflegemittel. Wir bieten hypoallergene Alternativen an und führen auf Wunsch vorab einen Hauttest durch.', category: 'faq', audience: 'public', authorityLevel: 'normal', source: 'manual' },
      { title: 'Hochzeitspaket intern', content: 'Hochzeitspaket: Probestyling (60 EUR, wird bei Buchung angerechnet) + Styling am Tag (180 EUR) + optionales Abend-Umstyling (80 EUR). Make-up über Partnerunternehmen BeautyBox buchbar. Wochenend-Aufpreis: +30 EUR.', category: 'services', audience: 'internal', authorityLevel: 'high', source: 'manual' },
      ...HEBELKI_KNOWLEDGE,
    ],
  },

  // ========== 4. PhysioVital Berlin ==========
  {
    name: 'PhysioVital Berlin',
    slug: 'demo-physio',
    type: 'clinic',
    primaryColor: '#0EA5E9',
    description: 'Physiotherapie & Rehabilitation in Berlin-Prenzlauer Berg. Individuelle Behandlung für Ihre Gesundheit und Mobilität.',
    tagline: 'Ihre Gesundheit in besten Händen',
    email: 'kontakt@physiovital-berlin.de',
    phone: '+49 30 4455667',
    address: 'Schönhauser Allee 78, 10439 Berlin',
    website: 'https://physiovital-berlin.de',
    staff: [
      { name: 'Dr. Hannah Bergmann', email: 'h.bergmann@physiovital-berlin.de', title: 'Physiotherapeutin (MSc)', bio: 'Master of Science in Physiotherapie. Spezialisiert auf orthopädische Rehabilitation, manuelle Therapie und Schmerzmanagement. 8 Jahre Berufserfahrung.' },
      { name: 'Lukas Wendt', email: 'l.wendt@physiovital-berlin.de', title: 'Sportphysiotherapeut', bio: 'Zertifizierter Sportphysiotherapeut. Betreut Leistungssportler und leitet das Sportreha-Programm. Spezialist für Knie- und Schulterverletzungen.' },
      { name: 'Ayşe Kaya', email: 'a.kaya@physiovital-berlin.de', title: 'Physiotherapeutin', bio: 'Schwerpunkte: Rückentherapie, Beckenbodenrehabilitation und Atemtherapie. Bilingual: Deutsch und Türkisch.' },
    ],
    services: [
      { name: 'Erstbefund & Diagnostik', description: 'Umfassende Erstuntersuchung mit Anamnese, Bewegungsanalyse und Erstellung eines individuellen Behandlungsplans.', durationMinutes: 60, bufferMinutes: 10, price: '95.00', category: 'Diagnostik', capacity: 1 },
      { name: 'Krankengymnastik', description: 'Gezielte Übungstherapie zur Verbesserung von Beweglichkeit, Kraft und Koordination.', durationMinutes: 30, bufferMinutes: 5, price: '45.00', category: 'Therapie', capacity: 1 },
      { name: 'Manuelle Therapie', description: 'Mobilisation von Gelenken und Wirbelsäule durch gezielte Handgriffe zur Schmerzlinderung.', durationMinutes: 30, bufferMinutes: 5, price: '55.00', category: 'Therapie', capacity: 1 },
      { name: 'Sportrehabilitation', description: 'Spezialisierte Therapie für Sportler: Reha nach Verletzung, Return-to-Sport-Testing, Prävention.', durationMinutes: 45, bufferMinutes: 10, price: '75.00', category: 'Sport', capacity: 1 },
      { name: 'Massage (30 Min)', description: 'Therapeutische Massage zur Muskelentspannung und Durchblutungsförderung.', durationMinutes: 30, bufferMinutes: 5, price: '40.00', category: 'Wellness', capacity: 1 },
    ],
    staffServiceMap: [
      [0, 1, 2, 4],    // Hannah: Erstbefund, KG, MT, Massage
      [0, 1, 3],        // Lukas: Erstbefund, KG, Sportreha
      [1, 2, 4],        // Ayşe: KG, MT, Massage
    ],
    availability: [
      { days: [{ day: 1, start: '08:00', end: '18:00' }, { day: 2, start: '08:00', end: '18:00' }, { day: 3, start: '08:00', end: '14:00' }, { day: 4, start: '08:00', end: '18:00' }, { day: 5, start: '08:00', end: '16:00' }] },
      { days: [{ day: 1, start: '07:00', end: '16:00' }, { day: 2, start: '07:00', end: '16:00' }, { day: 3, start: '07:00', end: '16:00' }, { day: 4, start: '07:00', end: '16:00' }, { day: 5, start: '07:00', end: '14:00' }, { day: 6, start: '08:00', end: '12:00' }] },
      { days: [{ day: 1, start: '09:00', end: '18:00' }, { day: 2, start: '09:00', end: '18:00' }, { day: 3, start: '09:00', end: '18:00' }, { day: 4, start: '09:00', end: '18:00' }, { day: 5, start: '09:00', end: '17:00' }] },
    ],
    customers: [
      { name: 'Robert Lange', email: 'robert.lange@example.de', phone: '+49 176 44556677' },
      { name: 'Martina Friedrich', email: 'martina.friedrich@example.de', phone: '+49 151 33445566' },
      { name: 'Kevin Scholz', email: 'kevin.scholz@example.de', phone: '+49 170 22334455' },
      { name: 'Ingrid Walter', email: 'ingrid.walter@example.de', phone: '+49 172 99887766' },
      { name: 'Ali Hassan', email: 'ali.hassan@example.de', phone: '+49 160 66778899' },
      { name: 'Christina Maier', email: 'christina.maier@example.de', phone: '+49 175 11223344' },
      { name: 'Dennis Schulze', email: 'dennis.schulze@example.de', phone: '+49 163 55667788' },
    ],
    bookingDefs: [
      [0, 0, 0, -6, 9, 'completed'],
      [1, 3, 2, -4, 8, 'completed'],
      [2, 2, 1, -3, 14, 'completed'],
      [0, 1, 3, -1, 10, 'completed'],
      [2, 4, 4, 0, 16, 'confirmed'],
      [1, 3, 2, 0, 9, 'confirmed'],
      [0, 2, 5, 1, 11, 'confirmed'],
      [2, 1, 6, 3, 15, 'confirmed'],
      [1, 1, 0, 5, 8, 'confirmed'],
      [0, 4, 3, 7, 10, 'confirmed'],
    ],
    knowledge: [
      { title: 'Öffnungszeiten', content: 'PhysioVital Berlin ist Montag bis Freitag von 07:00 bis 18:00 Uhr geöffnet. Samstag 08:00 bis 12:00 Uhr (nur mit Termin). Mittwochs verkürzte Sprechzeiten bis 14:00 Uhr. Termine nur nach Vereinbarung.', category: 'faq', audience: 'public', authorityLevel: 'high', source: 'manual' },
      { title: 'Standort & Anfahrt', content: 'PhysioVital Berlin, Schönhauser Allee 78, 10439 Berlin-Prenzlauer Berg. U2 Senefelderplatz (2 Min. Fußweg). Tram M2 Haltestelle Schönhauser Allee. Barrierefreier Zugang im Erdgeschoss.', category: 'faq', audience: 'public', authorityLevel: 'high', source: 'manual' },
      { title: 'Termin absagen / Rezepte', content: 'Bitte sagen Sie Ihren Termin mindestens 24 Stunden vorher ab. Für die erste Behandlung benötigen Sie ein gültiges Rezept (Verordnung) Ihres Arztes. Privatpatienten können auch ohne Rezept behandelt werden.', category: 'policies', audience: 'public', authorityLevel: 'high', source: 'manual' },
      { title: 'Krankenkasse & Abrechnung', content: 'Wir sind für alle gesetzlichen und privaten Krankenkassen zugelassen. Bei Kassenrezepten fällt eine gesetzliche Zuzahlung an (ca. 10 EUR pro Verordnung + 10% des Rezeptwerts). Privatpatienten erhalten eine Rechnung nach GebüTh.', category: 'faq', audience: 'public', authorityLevel: 'high', source: 'manual' },
      { title: 'Was mitbringen?', content: 'Bitte bringen Sie zum Termin mit: ärztliches Rezept, Versichertenkarte, bequeme Kleidung und ggf. vorhandene Befunde (MRT, Röntgen). Ein großes Handtuch stellen wir zur Verfügung.', category: 'faq', audience: 'public', authorityLevel: 'normal', source: 'manual' },
      { title: 'Sportreha-Programm', content: 'Unser Sportreha-Programm umfasst: funktionelle Diagnostik, individueller Trainingsplan, Return-to-Sport-Testing, Präventionsberatung. Für Leistungssportler bieten wir Abend-Termine nach Absprache.', category: 'services', audience: 'public', authorityLevel: 'normal', source: 'manual' },
      { title: 'Zuzahlungen intern', content: 'Zuzahlung GKV: 10 EUR Verordnungsgebühr + 10% des Rezeptwerts. Befreiung vorlegen! Privatpreise: KG 60 EUR/30min, MT 70 EUR/30min, Sportreha 90 EUR/45min. Selbstzahler-Massage: 50 EUR/30min.', category: 'pricing', audience: 'internal', authorityLevel: 'high', source: 'manual' },
      ...HEBELKI_KNOWLEDGE,
    ],
  },

  // ========== 5. FitZone Berlin ==========
  {
    name: 'FitZone Berlin',
    slug: 'demo-fitness',
    type: 'gym',
    primaryColor: '#8B5CF6',
    description: 'Fitness-Studio mit Personal Training in Berlin-Friedrichshain. Individuelles Training, Gruppenkurse und Ernährungsberatung.',
    tagline: 'Dein Fitness-Ziel. Unsere Mission.',
    email: 'info@fitzone-berlin.de',
    phone: '+49 30 8899001',
    address: 'Warschauer Straße 55, 10243 Berlin',
    website: 'https://fitzone-berlin.de',
    staff: [
      { name: 'Sarah Lindner', email: 's.lindner@fitzone-berlin.de', title: 'Personal Trainerin & Inhaberin', bio: 'Zertifizierte Personal Trainerin und Ernährungsberaterin. Schwerpunkte: Gewichtsmanagement, Krafttraining und funktionelles Training. B-Lizenz, A-Lizenz, Ernährungscoach.' },
      { name: 'Marco Rossi', email: 'm.rossi@fitzone-berlin.de', title: 'Fitness Trainer', bio: 'Ehemaliger Leistungssportler mit Schwerpunkt Krafttraining und Bodybuilding. Zertifizierter CrossFit Level 2 Trainer.' },
      { name: 'Kim Nguyen', email: 'k.nguyen@fitzone-berlin.de', title: 'Yoga & Pilates Trainerin', bio: 'Ausgebildete Yogalehrerin (500h RYT) und Pilates-Trainerin. Spezialistin für Flexibility, Mobility und Stressreduktion.' },
    ],
    services: [
      { name: 'Personal Training (60 Min)', description: 'Individuelles 1:1 Training mit deinem Coach. Trainingsplan, Technikkorrektur und Motivation.', durationMinutes: 60, bufferMinutes: 10, price: '69.00', category: 'Training', capacity: 1 },
      { name: 'Probetraining', description: 'Kostenloses Kennenlernen: Studio-Tour, Fitnesslevel-Check und Probetraining mit Trainer.', durationMinutes: 45, bufferMinutes: 10, price: '0.00', category: 'Beratung', capacity: 1 },
      { name: 'Ernährungsberatung', description: 'Individuelle Ernährungsanalyse und Ernährungsplan. Inkl. Körperzusammensetzungsanalyse (InBody).', durationMinutes: 45, bufferMinutes: 5, price: '59.00', category: 'Beratung', capacity: 1 },
      { name: 'Yoga-Kurs (75 Min)', description: 'Vinyasa Flow Yoga in kleiner Gruppe (max. 12 Personen). Alle Level willkommen.', durationMinutes: 75, bufferMinutes: 15, price: '18.00', category: 'Kurse', capacity: 12 },
      { name: 'HIIT Bootcamp', description: 'Intensives Gruppentraining im Park oder Studio. 45 Minuten Vollgas für maximale Fettverbrennung.', durationMinutes: 45, bufferMinutes: 10, price: '15.00', category: 'Kurse', capacity: 20 },
    ],
    staffServiceMap: [
      [0, 1, 2, 4],    // Sarah: PT, Probe, Ernährung, HIIT
      [0, 1, 4],        // Marco: PT, Probe, HIIT
      [1, 3],            // Kim: Probe, Yoga
    ],
    availability: [
      { days: [{ day: 1, start: '07:00', end: '20:00' }, { day: 2, start: '07:00', end: '20:00' }, { day: 3, start: '07:00', end: '20:00' }, { day: 4, start: '07:00', end: '20:00' }, { day: 5, start: '07:00', end: '18:00' }, { day: 6, start: '09:00', end: '14:00' }] },
      { days: [{ day: 1, start: '06:00', end: '18:00' }, { day: 2, start: '06:00', end: '18:00' }, { day: 3, start: '06:00', end: '18:00' }, { day: 4, start: '06:00', end: '18:00' }, { day: 5, start: '06:00', end: '16:00' }, { day: 6, start: '08:00', end: '13:00' }] },
      { days: [{ day: 1, start: '08:00', end: '20:00' }, { day: 2, start: '08:00', end: '20:00' }, { day: 3, start: '08:00', end: '20:00' }, { day: 4, start: '08:00', end: '20:00' }, { day: 5, start: '08:00', end: '18:00' }, { day: 6, start: '09:00', end: '13:00' }] },
    ],
    customers: [
      { name: 'Patrick Zimmermann', email: 'patrick.zimmermann@example.de', phone: '+49 176 55667788' },
      { name: 'Laura Klein', email: 'laura.klein@example.de', phone: '+49 151 44556677' },
      { name: 'Tobias Richter', email: 'tobias.richter@example.de', phone: '+49 170 33445566' },
      { name: 'Mia Schröder', email: 'mia.schroeder@example.de', phone: '+49 172 22334455' },
      { name: 'Felix Müller', email: 'felix.mueller@example.de', phone: '+49 160 88990011' },
      { name: 'Hannah Bauer', email: 'hannah.bauer@example.de', phone: '+49 175 77889900' },
      { name: 'Nico Wolf', email: 'nico.wolf@example.de', phone: '+49 163 66778899' },
      { name: 'Samira El-Amin', email: 'samira.elamin@example.de', phone: '+49 178 55667700' },
    ],
    bookingDefs: [
      [0, 0, 0, -7, 8, 'completed'],
      [1, 0, 1, -5, 7, 'completed'],
      [2, 3, 2, -3, 18, 'completed'],
      [0, 2, 3, -2, 10, 'completed'],
      [1, 4, 4, -1, 17, 'completed'],
      [0, 0, 5, 0, 9, 'confirmed'],
      [2, 3, 6, 0, 18, 'confirmed'],
      [1, 0, 1, 1, 7, 'confirmed'],
      [0, 1, 7, 2, 14, 'confirmed'],
      [2, 3, 2, 4, 18, 'confirmed'],
    ],
    knowledge: [
      { title: 'Öffnungszeiten', content: 'FitZone Berlin hat Montag bis Freitag von 06:00 bis 22:00 Uhr geöffnet. Samstag und Sonntag 08:00 bis 18:00 Uhr. Personal Training und Kurse nach Stundenplan. An Feiertagen 09:00 bis 16:00 Uhr.', category: 'faq', audience: 'public', authorityLevel: 'high', source: 'manual' },
      { title: 'Standort & Anfahrt', content: 'FitZone Berlin, Warschauer Straße 55, 10243 Berlin-Friedrichshain. S+U Warschauer Straße (3 Min. Fußweg). Fahrradparkplätze vor dem Studio. Duschen und Umkleiden vorhanden, Handtuchverleih 2 EUR.', category: 'faq', audience: 'public', authorityLevel: 'high', source: 'manual' },
      { title: 'Termin absagen', content: 'Personal Training und Ernährungsberatung: Absage bis 12 Stunden vorher kostenlos. Bei späteren Absagen wird der volle Betrag berechnet. Gruppenkurse: Absage bis 2 Stunden vorher über die Buchungsseite.', category: 'policies', audience: 'public', authorityLevel: 'high', source: 'manual' },
      { title: 'Mitgliedschaften & Preise', content: 'Monatsbeitrag: Basic (29,90 EUR, Studio-Zugang), Premium (49,90 EUR, Studio + alle Kurse), VIP (79,90 EUR, Studio + Kurse + 2x PT/Monat). Personal Training Einzelsitzungen: 69 EUR, 10er-Karte: 590 EUR. Probetraining immer kostenlos!', category: 'pricing', audience: 'public', authorityLevel: 'high', source: 'manual' },
      { title: 'Probetraining', content: 'Das Probetraining ist komplett kostenlos und unverbindlich. Es dauert ca. 45 Minuten und beinhaltet: Studio-Führung, kurzen Fitnesslevel-Check, Probetraining mit einem unserer Trainer. Einfach online buchen!', category: 'faq', audience: 'public', authorityLevel: 'high', source: 'manual' },
      { title: 'Kursplan', content: 'Montag: HIIT 07:00, Yoga 18:00 | Dienstag: Pilates 09:00, HIIT 18:00 | Mittwoch: Yoga 07:30, Bootcamp 18:00 | Donnerstag: Pilates 09:00, HIIT 18:00 | Freitag: Yoga 08:00, Bootcamp 17:00 | Samstag: Yoga 10:00', category: 'services', audience: 'public', authorityLevel: 'normal', source: 'manual' },
      { title: 'Trainer-Vergütung intern', content: 'PT-Erlöse: 60% Trainer, 40% Studio. Kurs-Pauschale: 35 EUR/Kurs bis 10 TN, +2 EUR/TN ab 11. Festgehalt Trainer: 2.800 EUR brutto (Vollzeit). Bonus bei >30 PT-Stunden/Monat: +5 EUR/Stunde.', category: 'operations', audience: 'internal', authorityLevel: 'high', source: 'manual' },
      ...HEBELKI_KNOWLEDGE,
    ],
  },
]

// ============================================
// SEED FUNCTION
// ============================================

async function seedDemo() {
  console.log('=== Seeding Demo Businesses ===\n')

  // Step 1: Delete existing demo data (idempotent)
  console.log('Cleaning existing demo data...')

  // Find all demo business IDs
  const demoBusinesses = await db
    .select({ id: businesses.id })
    .from(businesses)
    .where(sql`${businesses.settings}->>'isDemo' = 'true'`)

  if (demoBusinesses.length > 0) {
    const demoIds = demoBusinesses.map(b => b.id)
    console.log(`  Found ${demoIds.length} existing demo businesses to clean`)

    // Delete in FK-safe order
    for (const bizId of demoIds) {
      await db.delete(bookings).where(eq(bookings.businessId, bizId))
      await db.delete(customers).where(eq(customers.businessId, bizId))

      // Delete availability slots via templates
      const templates = await db.select({ id: availabilityTemplates.id })
        .from(availabilityTemplates)
        .where(eq(availabilityTemplates.businessId, bizId))
      for (const t of templates) {
        await db.delete(availabilitySlots).where(eq(availabilitySlots.templateId, t.id))
      }

      // Delete staff_services via staff
      const staffRows = await db.select({ id: staff.id })
        .from(staff)
        .where(eq(staff.businessId, bizId))
      for (const s of staffRows) {
        await db.delete(staffServices).where(eq(staffServices.staffId, s.id))
      }

      await db.delete(availabilityTemplates).where(eq(availabilityTemplates.businessId, bizId))
      await db.delete(services).where(eq(services.businessId, bizId))
      await db.delete(staff).where(eq(staff.businessId, bizId))
      await db.delete(chatbotKnowledge).where(eq(chatbotKnowledge.businessId, bizId))
      await db.delete(businesses).where(eq(businesses.id, bizId))
    }
    console.log('  Cleaned existing demo data')
  } else {
    console.log('  No existing demo data found')
  }

  // Step 2: Insert demo businesses
  console.log('')

  for (const biz of DEMO_BUSINESSES) {
    console.log(`--- Creating: ${biz.name} (${biz.slug}) ---`)

    // Insert business
    const [business] = await db.insert(businesses).values({
      name: biz.name,
      slug: biz.slug,
      type: biz.type,
      primaryColor: biz.primaryColor,
      description: biz.description,
      tagline: biz.tagline,
      email: biz.email,
      phone: biz.phone,
      address: biz.address,
      website: biz.website,
      timezone: 'Europe/Berlin',
      currency: 'EUR',
      minBookingNoticeHours: 2,
      maxAdvanceBookingDays: 60,
      cancellationPolicyHours: 24,
      allowWaitlist: true,
      requireApproval: false,
      planId: 'pro',
      settings: { isDemo: true },
      onboardingState: { completed: true, step: 5 },
    }).returning()
    console.log(`  Business: ${business.id}`)

    // Insert staff
    const staffRecords = await db.insert(staff).values(
      biz.staff.map(s => ({
        businessId: business.id,
        name: s.name,
        email: s.email,
        title: s.title,
        bio: s.bio,
        isActive: true,
      }))
    ).returning()
    console.log(`  Staff: ${staffRecords.length}`)

    // Insert services
    const serviceRecords = await db.insert(services).values(
      biz.services.map((s, i) => ({
        businessId: business.id,
        name: s.name,
        description: s.description,
        durationMinutes: s.durationMinutes,
        bufferMinutes: s.bufferMinutes,
        price: s.price,
        category: s.category,
        capacity: s.capacity,
        isActive: true,
        sortOrder: i + 1,
      }))
    ).returning()
    console.log(`  Services: ${serviceRecords.length}`)

    // Insert staff_services mappings
    const ssValues: { staffId: string; serviceId: string }[] = []
    for (let si = 0; si < biz.staffServiceMap.length; si++) {
      for (const svcIdx of biz.staffServiceMap[si]) {
        ssValues.push({
          staffId: staffRecords[si].id,
          serviceId: serviceRecords[svcIdx].id,
        })
      }
    }
    await db.insert(staffServices).values(ssValues)
    console.log(`  Staff-Service mappings: ${ssValues.length}`)

    // Insert availability templates + slots
    let templateCount = 0
    let slotCount = 0
    for (let si = 0; si < staffRecords.length; si++) {
      const [template] = await db.insert(availabilityTemplates).values({
        businessId: business.id,
        staffId: staffRecords[si].id,
        name: 'Standard',
        isDefault: true,
      }).returning()
      templateCount++

      const avail = biz.availability[si]
      if (avail.days.length > 0) {
        await db.insert(availabilitySlots).values(
          avail.days.map(d => ({
            templateId: template.id,
            dayOfWeek: d.day,
            startTime: d.start,
            endTime: d.end,
          }))
        )
        slotCount += avail.days.length
      }
    }
    console.log(`  Availability: ${templateCount} templates, ${slotCount} slots`)

    // Insert customers
    const customerRecords = await db.insert(customers).values(
      biz.customers.map(c => ({
        businessId: business.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        source: 'booking' as const,
      }))
    ).returning()
    console.log(`  Customers: ${customerRecords.length}`)

    // Insert bookings
    const bookingValues = biz.bookingDefs.map(([staffIdx, serviceIdx, custIdx, days, hour, status]) => {
      const svc = biz.services[serviceIdx]
      const date = daysFromNow(days)
      const startsAt = setTime(date, hour, 0)
      const endsAt = addMinutes(startsAt, svc.durationMinutes)

      return {
        id: randomUUID(),
        businessId: business.id,
        staffId: staffRecords[staffIdx].id,
        serviceId: serviceRecords[serviceIdx].id,
        customerId: customerRecords[custIdx].id,
        startsAt,
        endsAt,
        status,
        price: svc.price,
        source: 'web' as const,
        customerTimezone: 'Europe/Berlin',
        confirmedAt: status === 'confirmed' || status === 'completed' ? startsAt : null,
      }
    })
    await db.insert(bookings).values(bookingValues)
    console.log(`  Bookings: ${bookingValues.length}`)

    // Insert chatbot knowledge
    const knowledgeValues = biz.knowledge.map(k => ({
      id: randomUUID(),
      businessId: business.id,
      title: k.title,
      content: k.content,
      category: k.category,
      audience: k.audience,
      authorityLevel: k.authorityLevel,
      source: k.source,
      isActive: true,
      scopeType: 'global' as const,
    }))
    await db.insert(chatbotKnowledge).values(knowledgeValues)
    console.log(`  Knowledge entries: ${knowledgeValues.length}`)

    console.log('')
  }

  // Summary
  console.log('===================================')
  console.log('Demo seed completed successfully!')
  console.log('===================================\n')
  console.log('Created 5 demo businesses:')
  for (const biz of DEMO_BUSINESSES) {
    console.log(`  - ${biz.name} (/book/${biz.slug})`)
  }
  console.log('\nAll demo businesses have settings.isDemo = true')
  console.log('Re-run this script to reset demo data (idempotent)')
}

seedDemo()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed failed:', err)
    process.exit(1)
  })
