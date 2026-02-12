interface BookingEmailData {
  customerName: string
  customerEmail: string
  serviceName: string
  staffName?: string
  businessName: string
  startsAt: Date
  endsAt: Date
  confirmationToken: string
  notes?: string
  price?: number
  currency?: string
  bookingStatus?: string
  confirmationUrl?: string
}

function formatDate(date: Date, timezone = 'Europe/Berlin'): string {
  return date.toLocaleDateString('de-DE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: timezone,
  })
}

function formatTime(date: Date, timezone = 'Europe/Berlin'): string {
  return date.toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timezone,
  })
}

function formatPrice(price: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency,
  }).format(price)
}

const baseStyles = `
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
  .header { background: #3B82F6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
  .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
  .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
  .detail-row { display: flex; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }
  .detail-label { font-weight: 600; width: 120px; color: #6b7280; }
  .detail-value { color: #111827; }
  .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
  .button { display: inline-block; background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0; }
  .button-secondary { background: #6b7280; }
  .highlight { background: #fef3c7; padding: 15px; border-radius: 6px; border-left: 4px solid #f59e0b; margin: 20px 0; }
`

function buildDetailsTable(data: BookingEmailData): string {
  return `
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280; width: 140px;">Service:</td>
          <td style="padding: 8px 0; font-weight: 600;">${data.serviceName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Datum:</td>
          <td style="padding: 8px 0; font-weight: 600;">${formatDate(data.startsAt)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Uhrzeit:</td>
          <td style="padding: 8px 0; font-weight: 600;">${formatTime(data.startsAt)} - ${formatTime(data.endsAt)} Uhr</td>
        </tr>
        ${data.staffName ? `
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Mitarbeiter:</td>
          <td style="padding: 8px 0; font-weight: 600;">${data.staffName}</td>
        </tr>
        ` : ''}
        ${data.price ? `
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Preis:</td>
          <td style="padding: 8px 0; font-weight: 600;">${formatPrice(data.price, data.currency)}</td>
        </tr>
        ` : ''}
        ${data.notes ? `
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Anmerkungen:</td>
          <td style="padding: 8px 0;">${data.notes}</td>
        </tr>
        ` : ''}
      </table>`
}

export function bookingConfirmationEmail(data: BookingEmailData): { subject: string; html: string; text: string } {
  const status = data.bookingStatus || 'pending'

  // Determine header, hint, and button based on booking status
  let headerTitle: string
  let hintHtml: string
  let hintText: string
  let confirmButtonHtml = ''
  let confirmButtonText = ''

  if (status === 'unconfirmed' && data.confirmationUrl) {
    // Customer needs to click email link to confirm
    headerTitle = 'Buchung eingegangen'
    confirmButtonHtml = `
    <div style="text-align: center; margin: 20px 0;">
      <a href="${data.confirmationUrl}" class="button" style="display: inline-block; background: #3B82F6; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
        Buchung bestätigen
      </a>
    </div>`
    confirmButtonText = `\nBitte bestätigen Sie Ihre Buchung über folgenden Link:\n${data.confirmationUrl}\n`
    hintHtml = `
    <div class="highlight">
      <strong>Wichtig:</strong> Bitte bestätigen Sie Ihre Buchung, indem Sie auf den Button oben klicken. Ohne Bestätigung wird Ihr Termin nicht reserviert.
    </div>`
    hintText = 'Bitte bestätigen Sie Ihre Buchung über den Link oben. Ohne Bestätigung wird Ihr Termin nicht reserviert.'
  } else if (status === 'pending') {
    // Admin approval required
    headerTitle = 'Buchung eingegangen'
    hintHtml = `
    <div class="highlight">
      <strong>Hinweis:</strong> Ihre Buchung wird vom Team geprüft. Sie erhalten eine weitere E-Mail, sobald Ihre Buchung bestätigt wurde.
    </div>`
    hintText = 'Ihre Buchung wird vom Team geprüft. Sie erhalten eine weitere E-Mail, sobald Ihre Buchung bestätigt wurde.'
  } else {
    // Auto-confirmed
    headerTitle = 'Buchung bestätigt'
    hintHtml = `
    <div class="highlight" style="background: #d1fae5; border-left-color: #10b981;">
      <strong>Bestätigt!</strong> Ihr Termin ist reserviert. Wir freuen uns auf Ihren Besuch.
    </div>`
    hintText = 'Ihr Termin ist bestätigt! Wir freuen uns auf Ihren Besuch.'
  }

  const subject = status === 'confirmed'
    ? `Buchungsbestätigung - ${data.serviceName} am ${formatDate(data.startsAt)}`
    : `Buchung eingegangen - ${data.serviceName} am ${formatDate(data.startsAt)}`

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>${baseStyles}</style>
</head>
<body>
  <div class="header"${status === 'confirmed' ? ' style="background: #10b981;"' : ''}>
    <h1>${headerTitle}</h1>
  </div>
  <div class="content">
    <p>Hallo ${data.customerName},</p>
    <p>vielen Dank für Ihre Buchung bei <strong>${data.businessName}</strong>.</p>

    <div class="details">
      <h3 style="margin-top: 0;">Buchungsdetails</h3>
      ${buildDetailsTable(data)}
    </div>

    ${confirmButtonHtml}
    ${hintHtml}

    <p>Bei Fragen können Sie diese E-Mail beantworten oder uns direkt kontaktieren.</p>

    <p>Mit freundlichen Grüßen,<br><strong>${data.businessName}</strong></p>
  </div>
  <div class="footer">
    <p>Buchungsnummer: ${data.confirmationToken}</p>
    <p>Powered by Hebelki</p>
  </div>
</body>
</html>
`

  const text = `
${headerTitle}

Hallo ${data.customerName},

vielen Dank für Ihre Buchung bei ${data.businessName}.

BUCHUNGSDETAILS
---------------
Service: ${data.serviceName}
Datum: ${formatDate(data.startsAt)}
Uhrzeit: ${formatTime(data.startsAt)} - ${formatTime(data.endsAt)} Uhr
${data.staffName ? `Mitarbeiter: ${data.staffName}\n` : ''}${data.price ? `Preis: ${formatPrice(data.price, data.currency)}\n` : ''}${data.notes ? `Anmerkungen: ${data.notes}\n` : ''}
Buchungsnummer: ${data.confirmationToken}
${confirmButtonText}
${hintText}

Mit freundlichen Grüßen,
${data.businessName}
`

  return { subject, html, text }
}

export function bookingNotificationEmail(data: BookingEmailData & { customerPhone?: string }): { subject: string; html: string; text: string } {
  const subject = `Neue Buchung - ${data.serviceName} am ${formatDate(data.startsAt)}`

  const statusLabel = data.bookingStatus === 'unconfirmed'
    ? 'Wartet auf Kundenbestätigung per E-Mail'
    : data.bookingStatus === 'pending'
      ? 'Wartet auf Genehmigung'
      : 'Automatisch bestätigt'

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>${baseStyles}</style>
</head>
<body>
  <div class="header" style="background: #10b981;">
    <h1>Neue Buchungsanfrage</h1>
  </div>
  <div class="content">
    <p>Eine neue Buchungsanfrage ist eingegangen:</p>

    <div class="details">
      <h3 style="margin-top: 0;">Kundeninformationen</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280; width: 140px;">Name:</td>
          <td style="padding: 8px 0; font-weight: 600;">${data.customerName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">E-Mail:</td>
          <td style="padding: 8px 0;"><a href="mailto:${data.customerEmail}">${data.customerEmail}</a></td>
        </tr>
        ${data.customerPhone ? `
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Telefon:</td>
          <td style="padding: 8px 0;"><a href="tel:${data.customerPhone}">${data.customerPhone}</a></td>
        </tr>
        ` : ''}
      </table>
    </div>

    <div class="details">
      <h3 style="margin-top: 0;">Termindetails</h3>
      ${buildDetailsTable(data)}
    </div>

    <div class="highlight">
      <strong>Status:</strong> ${statusLabel}
    </div>

    <p style="text-align: center;">
      ${data.bookingStatus === 'pending' ? 'Bitte überprüfen Sie die Anfrage und bestätigen oder lehnen Sie den Termin ab.' : ''}
    </p>
  </div>
  <div class="footer">
    <p>Buchungsnummer: ${data.confirmationToken}</p>
  </div>
</body>
</html>
`

  const text = `
Neue Buchungsanfrage

Eine neue Buchungsanfrage ist eingegangen:

KUNDENINFORMATIONEN
-------------------
Name: ${data.customerName}
E-Mail: ${data.customerEmail}
${data.customerPhone ? `Telefon: ${data.customerPhone}\n` : ''}
TERMINDETAILS
-------------
Service: ${data.serviceName}
Datum: ${formatDate(data.startsAt)}
Uhrzeit: ${formatTime(data.startsAt)} - ${formatTime(data.endsAt)} Uhr
${data.staffName ? `Mitarbeiter: ${data.staffName}\n` : ''}${data.price ? `Preis: ${formatPrice(data.price, data.currency)}\n` : ''}${data.notes ? `Anmerkungen: ${data.notes}\n` : ''}
Buchungsnummer: ${data.confirmationToken}

Status: ${statusLabel}
`

  return { subject, html, text }
}

export function bookingCancellationEmail(data: BookingEmailData & { reason?: string }): { subject: string; html: string; text: string } {
  const subject = `Buchung storniert - ${data.serviceName} am ${formatDate(data.startsAt)}`

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>${baseStyles}</style>
</head>
<body>
  <div class="header" style="background: #ef4444;">
    <h1>Buchung storniert</h1>
  </div>
  <div class="content">
    <p>Hallo ${data.customerName},</p>
    <p>Ihre Buchung bei <strong>${data.businessName}</strong> wurde storniert.</p>

    <div class="details">
      <h3 style="margin-top: 0;">Stornierte Buchung</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280; width: 140px;">Service:</td>
          <td style="padding: 8px 0;">${data.serviceName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Datum:</td>
          <td style="padding: 8px 0;">${formatDate(data.startsAt)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Uhrzeit:</td>
          <td style="padding: 8px 0;">${formatTime(data.startsAt)} - ${formatTime(data.endsAt)} Uhr</td>
        </tr>
        ${data.reason ? `
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Grund:</td>
          <td style="padding: 8px 0;">${data.reason}</td>
        </tr>
        ` : ''}
      </table>
    </div>

    <p>Wenn Sie einen neuen Termin buchen möchten, besuchen Sie bitte unsere Buchungsseite.</p>

    <p>Mit freundlichen Grüßen,<br><strong>${data.businessName}</strong></p>
  </div>
  <div class="footer">
    <p>Buchungsnummer: ${data.confirmationToken}</p>
    <p>Powered by Hebelki</p>
  </div>
</body>
</html>
`

  const text = `
Buchung storniert

Hallo ${data.customerName},

Ihre Buchung bei ${data.businessName} wurde storniert.

STORNIERTE BUCHUNG
------------------
Service: ${data.serviceName}
Datum: ${formatDate(data.startsAt)}
Uhrzeit: ${formatTime(data.startsAt)} - ${formatTime(data.endsAt)} Uhr
${data.reason ? `Grund: ${data.reason}\n` : ''}
Buchungsnummer: ${data.confirmationToken}

Wenn Sie einen neuen Termin buchen möchten, besuchen Sie bitte unsere Buchungsseite.

Mit freundlichen Grüßen,
${data.businessName}
`

  return { subject, html, text }
}

export function bookingConfirmedEmail(data: BookingEmailData): { subject: string; html: string; text: string } {
  const subject = `Termin bestätigt - ${data.serviceName} am ${formatDate(data.startsAt)}`

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>${baseStyles}</style>
</head>
<body>
  <div class="header" style="background: #10b981;">
    <h1>Termin bestätigt</h1>
  </div>
  <div class="content">
    <p>Hallo ${data.customerName},</p>
    <p>Ihr Termin bei <strong>${data.businessName}</strong> wurde bestätigt!</p>

    <div class="details">
      <h3 style="margin-top: 0;">Ihre Buchung</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280; width: 140px;">Service:</td>
          <td style="padding: 8px 0; font-weight: 600;">${data.serviceName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Datum:</td>
          <td style="padding: 8px 0; font-weight: 600;">${formatDate(data.startsAt)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Uhrzeit:</td>
          <td style="padding: 8px 0; font-weight: 600;">${formatTime(data.startsAt)} - ${formatTime(data.endsAt)} Uhr</td>
        </tr>
        ${data.staffName ? `
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Mitarbeiter:</td>
          <td style="padding: 8px 0; font-weight: 600;">${data.staffName}</td>
        </tr>
        ` : ''}
        ${data.price ? `
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Preis:</td>
          <td style="padding: 8px 0; font-weight: 600;">${formatPrice(data.price, data.currency)}</td>
        </tr>
        ` : ''}
      </table>
    </div>

    <div class="highlight" style="background: #d1fae5; border-left-color: #10b981;">
      <strong>Bestätigt!</strong> Wir freuen uns auf Ihren Besuch.
    </div>

    <p>Bei Fragen können Sie diese E-Mail beantworten oder uns direkt kontaktieren.</p>

    <p>Mit freundlichen Grüßen,<br><strong>${data.businessName}</strong></p>
  </div>
  <div class="footer">
    <p>Buchungsnummer: ${data.confirmationToken}</p>
    <p>Powered by Hebelki</p>
  </div>
</body>
</html>
`

  const text = `
Termin bestätigt

Hallo ${data.customerName},

Ihr Termin bei ${data.businessName} wurde bestätigt!

IHRE BUCHUNG
------------
Service: ${data.serviceName}
Datum: ${formatDate(data.startsAt)}
Uhrzeit: ${formatTime(data.startsAt)} - ${formatTime(data.endsAt)} Uhr
${data.staffName ? `Mitarbeiter: ${data.staffName}\n` : ''}${data.price ? `Preis: ${formatPrice(data.price, data.currency)}\n` : ''}
Buchungsnummer: ${data.confirmationToken}

Wir freuen uns auf Ihren Besuch!

Mit freundlichen Grüßen,
${data.businessName}
`

  return { subject, html, text }
}

export function bookingReminderEmail(data: BookingEmailData): { subject: string; html: string; text: string } {
  const subject = `Terminerinnerung - ${data.serviceName} morgen um ${formatTime(data.startsAt)} Uhr`

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>${baseStyles}</style>
</head>
<body>
  <div class="header" style="background: #f59e0b;">
    <h1>Terminerinnerung</h1>
  </div>
  <div class="content">
    <p>Hallo ${data.customerName},</p>
    <p>dies ist eine freundliche Erinnerung an Ihren bevorstehenden Termin bei <strong>${data.businessName}</strong>.</p>

    <div class="details">
      <h3 style="margin-top: 0;">Ihr Termin</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280; width: 140px;">Service:</td>
          <td style="padding: 8px 0; font-weight: 600;">${data.serviceName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Datum:</td>
          <td style="padding: 8px 0; font-weight: 600;">${formatDate(data.startsAt)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Uhrzeit:</td>
          <td style="padding: 8px 0; font-weight: 600;">${formatTime(data.startsAt)} - ${formatTime(data.endsAt)} Uhr</td>
        </tr>
        ${data.staffName ? `
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Mitarbeiter:</td>
          <td style="padding: 8px 0; font-weight: 600;">${data.staffName}</td>
        </tr>
        ` : ''}
      </table>
    </div>

    <div class="highlight">
      <strong>Wichtig:</strong> Falls Sie den Termin nicht wahrnehmen können, bitten wir um rechtzeitige Absage.
    </div>

    <p>Wir freuen uns auf Sie!</p>

    <p>Mit freundlichen Grüßen,<br><strong>${data.businessName}</strong></p>
  </div>
  <div class="footer">
    <p>Buchungsnummer: ${data.confirmationToken}</p>
    <p>Powered by Hebelki</p>
  </div>
</body>
</html>
`

  const text = `
Terminerinnerung

Hallo ${data.customerName},

dies ist eine freundliche Erinnerung an Ihren bevorstehenden Termin bei ${data.businessName}.

IHR TERMIN
----------
Service: ${data.serviceName}
Datum: ${formatDate(data.startsAt)}
Uhrzeit: ${formatTime(data.startsAt)} - ${formatTime(data.endsAt)} Uhr
${data.staffName ? `Mitarbeiter: ${data.staffName}\n` : ''}
Buchungsnummer: ${data.confirmationToken}

Falls Sie den Termin nicht wahrnehmen können, bitten wir um rechtzeitige Absage.

Wir freuen uns auf Sie!

Mit freundlichen Grüßen,
${data.businessName}
`

  return { subject, html, text }
}

// ============================================
// LIVE CHAT EMAIL TEMPLATES
// ============================================

interface LiveChatRequestEmailData {
  businessName: string
  customerName?: string
  firstMessage: string
  dashboardUrl: string
}

export function liveChatRequestEmail(data: LiveChatRequestEmailData): { subject: string; html: string; text: string } {
  const subject = `Neue Live-Chat-Anfrage - ${data.businessName}`

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>${baseStyles}</style></head>
<body>
  <div class="header" style="background: #f59e0b;">
    <h1>Neue Live-Chat-Anfrage</h1>
  </div>
  <div class="content">
    <p>Ein Kunde wartet auf eine Antwort im Live-Chat.</p>
    <div class="details">
      <table style="width: 100%; border-collapse: collapse;">
        ${data.customerName ? `
        <tr>
          <td style="padding: 8px 0; color: #6b7280; width: 140px;">Kunde:</td>
          <td style="padding: 8px 0; font-weight: 600;">${data.customerName}</td>
        </tr>` : ''}
        <tr>
          <td style="padding: 8px 0; color: #6b7280; width: 140px;">Nachricht:</td>
          <td style="padding: 8px 0;">${data.firstMessage}</td>
        </tr>
      </table>
    </div>
    <div style="text-align: center; margin: 20px 0;">
      <a href="${data.dashboardUrl}" class="button" style="display: inline-block; background: #f59e0b; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600;">
        Zum Live-Chat
      </a>
    </div>
    <p>Mit freundlichen Grüßen,<br><strong>Hebelki</strong></p>
  </div>
  <div class="footer"><p>Diese E-Mail wurde automatisch versendet.</p></div>
</body>
</html>`

  const text = `Neue Live-Chat-Anfrage - ${data.businessName}

Ein Kunde wartet auf eine Antwort im Live-Chat.
${data.customerName ? `Kunde: ${data.customerName}\n` : ''}Nachricht: ${data.firstMessage}

Zum Live-Chat: ${data.dashboardUrl}
`

  return { subject, html, text }
}

interface ChatEscalatedEmailData {
  businessName: string
  customerName?: string
  customerEmail?: string
  customerPhone?: string
  conversationSummary: string
  dashboardUrl: string
}

export function chatEscalatedEmail(data: ChatEscalatedEmailData): { subject: string; html: string; text: string } {
  const subject = `Unbeantwortete Chat-Anfrage - ${data.businessName}`

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>${baseStyles}</style></head>
<body>
  <div class="header" style="background: #ef4444;">
    <h1>Unbeantwortete Chat-Anfrage</h1>
  </div>
  <div class="content">
    <p>Ein Kunde hat im Live-Chat keine Antwort erhalten und wurde per E-Mail benachrichtigt.</p>
    <div class="details">
      <h3 style="margin-top: 0;">Kundeninformationen</h3>
      <table style="width: 100%; border-collapse: collapse;">
        ${data.customerName ? `
        <tr>
          <td style="padding: 8px 0; color: #6b7280; width: 140px;">Name:</td>
          <td style="padding: 8px 0; font-weight: 600;">${data.customerName}</td>
        </tr>` : ''}
        ${data.customerEmail ? `
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">E-Mail:</td>
          <td style="padding: 8px 0;"><a href="mailto:${data.customerEmail}">${data.customerEmail}</a></td>
        </tr>` : ''}
        ${data.customerPhone ? `
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Telefon:</td>
          <td style="padding: 8px 0;"><a href="tel:${data.customerPhone}">${data.customerPhone}</a></td>
        </tr>` : ''}
      </table>
    </div>
    <div class="details">
      <h3 style="margin-top: 0;">Gesprächszusammenfassung</h3>
      <p style="white-space: pre-wrap;">${data.conversationSummary}</p>
    </div>
    <div style="text-align: center; margin: 20px 0;">
      <a href="${data.dashboardUrl}" class="button" style="display: inline-block; background: #ef4444; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600;">
        Gespräch ansehen
      </a>
    </div>
    <p>Bitte kontaktieren Sie den Kunden zeitnah.</p>
    <p>Mit freundlichen Grüßen,<br><strong>Hebelki</strong></p>
  </div>
  <div class="footer"><p>Diese E-Mail wurde automatisch versendet.</p></div>
</body>
</html>`

  const text = `Unbeantwortete Chat-Anfrage - ${data.businessName}

Ein Kunde hat im Live-Chat keine Antwort erhalten.

${data.customerName ? `Name: ${data.customerName}\n` : ''}${data.customerEmail ? `E-Mail: ${data.customerEmail}\n` : ''}${data.customerPhone ? `Telefon: ${data.customerPhone}\n` : ''}
Gesprächszusammenfassung:
${data.conversationSummary}

Gespräch ansehen: ${data.dashboardUrl}

Bitte kontaktieren Sie den Kunden zeitnah.
`

  return { subject, html, text }
}

// ============================================
// INVOICE SENT EMAIL
// ============================================

interface InvoiceSentEmailData {
  customerName: string
  invoiceNumber: string
  businessName: string
  total: string
  pdfDownloadUrl: string
  dueDate?: string
}

export function invoiceSentEmail(data: InvoiceSentEmailData) {
  const subject = `Rechnung ${data.invoiceNumber} von ${data.businessName}`

  const html = `
<!DOCTYPE html>
<html>
<head><style>${baseStyles}</style></head>
<body>
  <div class="header">
    <h1>${data.businessName}</h1>
    <p>Rechnung ${data.invoiceNumber}</p>
  </div>
  <div class="content">
    <p>Guten Tag${data.customerName ? ` ${data.customerName}` : ''},</p>
    <p>anbei erhalten Sie die Rechnung <strong>${data.invoiceNumber}</strong> über <strong>${data.total}</strong>.</p>
    <div class="details">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-weight: 600; color: #6b7280;">Rechnungsnummer</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;">${data.invoiceNumber}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-weight: 600; color: #6b7280;">Betrag</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;">${data.total}</td>
        </tr>
        ${data.dueDate ? `
        <tr>
          <td style="padding: 8px 0; font-weight: 600; color: #6b7280;">Fällig bis</td>
          <td style="padding: 8px 0;">${data.dueDate}</td>
        </tr>` : ''}
      </table>
    </div>
    <p>
      <a href="${data.pdfDownloadUrl}" class="button">Rechnung als PDF herunterladen</a>
    </p>
    <p style="font-size: 12px; color: #6b7280;">Der Download-Link ist 7 Tage gültig.</p>
    <p>Bitte überweisen Sie den Betrag unter Angabe der Rechnungsnummer.</p>
    <p>Mit freundlichen Grüßen,<br><strong>${data.businessName}</strong></p>
  </div>
  <div class="footer">
    <p>Diese E-Mail wurde automatisch von Hebelki versendet.</p>
  </div>
</body>
</html>`

  const text = `Rechnung ${data.invoiceNumber} von ${data.businessName}

Guten Tag${data.customerName ? ` ${data.customerName}` : ''},

anbei erhalten Sie die Rechnung ${data.invoiceNumber} über ${data.total}.

PDF herunterladen: ${data.pdfDownloadUrl}
(Link ist 7 Tage gültig)

Bitte überweisen Sie den Betrag unter Angabe der Rechnungsnummer.

Mit freundlichen Grüßen,
${data.businessName}
`

  return { subject, html, text }
}

// ============================================
// GDPR DELETION REQUEST EMAIL
// ============================================

interface DeletionRequestEmailData {
  customerName?: string
  businessName: string
  confirmUrl: string
  exportUrl: string
  expiresAt: Date
}

export function deletionRequestEmail(data: DeletionRequestEmailData): { subject: string; html: string; text: string } {
  const subject = `Bestätigung Ihrer Löschanfrage - ${data.businessName}`

  const expiryDate = data.expiresAt.toLocaleDateString('de-DE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const greeting = data.customerName ? `Hallo ${data.customerName}` : 'Hallo'

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>${baseStyles}</style>
</head>
<body>
  <div class="header" style="background: #ef4444;">
    <h1>Löschanfrage</h1>
  </div>
  <div class="content">
    <p>${greeting},</p>
    <p>wir haben eine Anfrage zur Löschung Ihrer Daten bei <strong>${data.businessName}</strong> erhalten.</p>

    <div class="highlight" style="background: #fef3c7; border-left-color: #f59e0b;">
      <strong>Wichtig:</strong> Wenn Sie diese Anfrage nicht gestellt haben, können Sie diese E-Mail ignorieren. Ihre Daten bleiben unverändert.
    </div>

    <div class="details">
      <h3 style="margin-top: 0;">Was wird gelöscht?</h3>
      <ul style="color: #374151; padding-left: 20px;">
        <li>Ihre persönlichen Daten (Name, E-Mail, Telefon, Adresse)</li>
        <li>Alle Buchungen und Terminhistorie</li>
        <li>Alle Chat-Gespräche</li>
        <li>Alle Rechnungen</li>
      </ul>
      <p style="color: #6b7280; font-size: 14px;">Diese Aktion kann nicht rückgängig gemacht werden.</p>
    </div>

    <p><strong>Bevor Sie löschen:</strong> Sie können Ihre Daten herunterladen:</p>
    <div style="text-align: center; margin: 15px 0;">
      <a href="${data.exportUrl}" class="button" style="display: inline-block; background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
        Meine Daten herunterladen
      </a>
    </div>

    <p><strong>Löschung bestätigen:</strong></p>
    <div style="text-align: center; margin: 15px 0;">
      <a href="${data.confirmUrl}" class="button" style="display: inline-block; background: #ef4444; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
        Daten endgültig löschen
      </a>
    </div>

    <p style="color: #6b7280; font-size: 14px; text-align: center;">
      Dieser Link ist gültig bis ${expiryDate}.
    </p>

    <p>Mit freundlichen Grüßen,<br><strong>${data.businessName}</strong></p>
  </div>
  <div class="footer">
    <p>Diese E-Mail wurde automatisch versendet.</p>
    <p>Powered by Hebelki</p>
  </div>
</body>
</html>`

  const text = `Löschanfrage - ${data.businessName}

${greeting},

wir haben eine Anfrage zur Löschung Ihrer Daten bei ${data.businessName} erhalten.

WICHTIG: Wenn Sie diese Anfrage nicht gestellt haben, können Sie diese E-Mail ignorieren.

Was wird gelöscht:
- Ihre persönlichen Daten (Name, E-Mail, Telefon, Adresse)
- Alle Buchungen und Terminhistorie
- Alle Chat-Gespräche
- Alle Rechnungen

Diese Aktion kann nicht rückgängig gemacht werden.

Daten herunterladen: ${data.exportUrl}

Löschung bestätigen: ${data.confirmUrl}

Dieser Link ist gültig bis ${expiryDate}.

Mit freundlichen Grüßen,
${data.businessName}
`

  return { subject, html, text }
}
