import type { Locale } from '@/i18n/config'
import { getEmailTranslations } from '@/lib/email-i18n'

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
  manageUrl?: string
}

function getDateLocale(locale: Locale): string {
  return locale === 'de' ? 'de-DE' : 'en-US'
}

function formatDate(date: Date, timezone = 'Europe/Berlin', locale: Locale = 'de'): string {
  return date.toLocaleDateString(getDateLocale(locale), {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: timezone,
  })
}

function formatTime(date: Date, timezone = 'Europe/Berlin', locale: Locale = 'de'): string {
  return date.toLocaleTimeString(getDateLocale(locale), {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timezone,
  })
}

function formatPrice(price: number, currency = 'EUR', locale: Locale = 'de'): string {
  return new Intl.NumberFormat(getDateLocale(locale), {
    style: 'currency',
    currency,
  }).format(price)
}

/** Time string with optional "Uhr" suffix (German only) */
function timeWithUhr(time: string, t: (key: string) => string): string {
  const uhr = t('uhr')
  return uhr ? `${time} ${uhr}` : time
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

function buildDetailsTable(data: BookingEmailData, tl: (key: string) => string, tc: (key: string) => string, locale: Locale = 'de'): string {
  return `
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280; width: 140px;">${tl('service')}</td>
          <td style="padding: 8px 0; font-weight: 600;">${data.serviceName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">${tl('date')}</td>
          <td style="padding: 8px 0; font-weight: 600;">${formatDate(data.startsAt, undefined, locale)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">${tl('time')}</td>
          <td style="padding: 8px 0; font-weight: 600;">${timeWithUhr(`${formatTime(data.startsAt, undefined, locale)} - ${formatTime(data.endsAt, undefined, locale)}`, tc)}</td>
        </tr>
        ${data.staffName ? `
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">${tl('staff')}</td>
          <td style="padding: 8px 0; font-weight: 600;">${data.staffName}</td>
        </tr>
        ` : ''}
        ${data.price ? `
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">${tl('price')}</td>
          <td style="padding: 8px 0; font-weight: 600;">${formatPrice(data.price, data.currency, locale)}</td>
        </tr>
        ` : ''}
        ${data.notes ? `
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">${tl('notes')}</td>
          <td style="padding: 8px 0;">${data.notes}</td>
        </tr>
        ` : ''}
      </table>`
}

export async function bookingConfirmationEmail(data: BookingEmailData, locale: Locale = 'de'): Promise<{ subject: string; html: string; text: string }> {
  const tc = await getEmailTranslations(locale, 'emails.common')
  const tl = await getEmailTranslations(locale, 'emails.labels')
  const t = await getEmailTranslations(locale, 'emails.confirmation')

  const status = data.bookingStatus || 'pending'

  let headerTitle: string
  let hintHtml: string
  let hintText: string
  let confirmButtonHtml = ''
  let confirmButtonText = ''

  if (status === 'unconfirmed' && data.confirmationUrl) {
    headerTitle = t('receivedTitle')
    confirmButtonHtml = `
    <div style="text-align: center; margin: 20px 0;">
      <a href="${data.confirmationUrl}" class="button" style="display: inline-block; background: #3B82F6; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
        ${t('confirmButton')}
      </a>
    </div>`
    confirmButtonText = `\n${t('textConfirmLink')}\n${data.confirmationUrl}\n`
    hintHtml = `
    <div class="highlight">
      <strong>${t('confirmHintImportant')}</strong> ${t('confirmHint')}
    </div>`
    hintText = t('textConfirmHint')
  } else if (status === 'pending') {
    headerTitle = t('receivedTitle')
    hintHtml = `
    <div class="highlight">
      <strong>${t('pendingHintLabel')}</strong> ${t('pendingHint')}
    </div>`
    hintText = t('pendingHint')
  } else {
    headerTitle = t('confirmedTitle')
    hintHtml = `
    <div class="highlight" style="background: #d1fae5; border-left-color: #10b981;">
      <strong>${t('autoConfirmedLabel')}</strong> ${t('autoConfirmedHint')}
    </div>`
    hintText = t('autoConfirmedHint')
  }

  const dateStr = formatDate(data.startsAt, undefined, locale)
  const subject = status === 'confirmed'
    ? t('subjectConfirmed', { service: data.serviceName, date: dateStr })
    : t('subjectReceived', { service: data.serviceName, date: dateStr })

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
    <p>${tc('greeting', { name: data.customerName })}</p>
    <p>${t('thankYou', { businessName: data.businessName })}</p>

    <div class="details">
      <h3 style="margin-top: 0;">${t('detailsTitle')}</h3>
      ${buildDetailsTable(data, tl, tc, locale)}
    </div>

    ${confirmButtonHtml}
    ${hintHtml}

    <p>${tc('contactUs')}</p>

    ${data.manageUrl ? `
    <div style="text-align: center; margin: 20px 0; padding-top: 15px; border-top: 1px solid #e5e7eb;">
      <a href="${data.manageUrl}" style="display: inline-block; background: #6b7280; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-size: 14px;">
        ${tc('manageBooking')}
      </a>
      <p style="font-size: 12px; color: #9ca3af; margin-top: 8px;">${tc('manageBookingSubtext')}</p>
    </div>
    ` : ''}

    <p>${tc('regards')}<br><strong>${data.businessName}</strong></p>
  </div>
  <div class="footer">
    <p>${tc('bookingNumber', { token: data.confirmationToken })}</p>
    <p>${tc('poweredBy')}</p>
  </div>
</body>
</html>
`

  const timeRange = timeWithUhr(`${formatTime(data.startsAt, undefined, locale)} - ${formatTime(data.endsAt, undefined, locale)}`, tc)
  const text = `
${headerTitle}

${tc('greeting', { name: data.customerName })}

${t('thankYou', { businessName: data.businessName })}

${t('textDetailsTitle')}
---------------
${tl('service')} ${data.serviceName}
${tl('date')} ${dateStr}
${tl('time')} ${timeRange}
${data.staffName ? `${tl('staff')} ${data.staffName}\n` : ''}${data.price ? `${tl('price')} ${formatPrice(data.price, data.currency, locale)}\n` : ''}${data.notes ? `${tl('notes')} ${data.notes}\n` : ''}
${tc('bookingNumber', { token: data.confirmationToken })}
${confirmButtonText}
${hintText}
${data.manageUrl ? `\n${tc('manageBooking')} (${tc('manageBookingSubtext')}): ${data.manageUrl}\n` : ''}
${tc('regards')}
${data.businessName}
`

  return { subject, html, text }
}

export async function bookingNotificationEmail(data: BookingEmailData & { customerPhone?: string }, locale: Locale = 'de'): Promise<{ subject: string; html: string; text: string }> {
  const tc = await getEmailTranslations(locale, 'emails.common')
  const tl = await getEmailTranslations(locale, 'emails.labels')
  const t = await getEmailTranslations(locale, 'emails.notification')

  const dateStr = formatDate(data.startsAt, undefined, locale)
  const subject = t('subject', { service: data.serviceName, date: dateStr })

  const statusLabel = data.bookingStatus === 'unconfirmed'
    ? t('statusWaitingCustomer')
    : data.bookingStatus === 'pending'
      ? t('statusWaitingApproval')
      : t('statusAutoConfirmed')

  const timeRange = timeWithUhr(`${formatTime(data.startsAt, undefined, locale)} - ${formatTime(data.endsAt, undefined, locale)}`, tc)

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>${baseStyles}</style>
</head>
<body>
  <div class="header" style="background: #10b981;">
    <h1>${t('title')}</h1>
  </div>
  <div class="content">
    <p>${t('intro')}</p>

    <div class="details">
      <h3 style="margin-top: 0;">${t('customerInfo')}</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280; width: 140px;">${tl('name')}</td>
          <td style="padding: 8px 0; font-weight: 600;">${data.customerName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">${tl('email')}</td>
          <td style="padding: 8px 0;"><a href="mailto:${data.customerEmail}">${data.customerEmail}</a></td>
        </tr>
        ${data.customerPhone ? `
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">${tl('phone')}</td>
          <td style="padding: 8px 0;"><a href="tel:${data.customerPhone}">${data.customerPhone}</a></td>
        </tr>
        ` : ''}
      </table>
    </div>

    <div class="details">
      <h3 style="margin-top: 0;">${t('appointmentDetails')}</h3>
      ${buildDetailsTable(data, tl, tc, locale)}
    </div>

    <div class="highlight">
      <strong>${t('statusLabel')}</strong> ${statusLabel}
    </div>

    <p style="text-align: center;">
      ${data.bookingStatus === 'pending' ? t('reviewRequest') : ''}
    </p>
  </div>
  <div class="footer">
    <p>${tc('bookingNumber', { token: data.confirmationToken })}</p>
  </div>
</body>
</html>
`

  const text = `
${t('title')}

${t('intro')}

${t('textCustomerInfo')}
-------------------
${tl('name')} ${data.customerName}
${tl('email')} ${data.customerEmail}
${data.customerPhone ? `${tl('phone')} ${data.customerPhone}\n` : ''}
${t('textAppointmentDetails')}
-------------
${tl('service')} ${data.serviceName}
${tl('date')} ${dateStr}
${tl('time')} ${timeRange}
${data.staffName ? `${tl('staff')} ${data.staffName}\n` : ''}${data.price ? `${tl('price')} ${formatPrice(data.price, data.currency, locale)}\n` : ''}${data.notes ? `${tl('notes')} ${data.notes}\n` : ''}
${tc('bookingNumber', { token: data.confirmationToken })}

${t('statusLabel')} ${statusLabel}
`

  return { subject, html, text }
}

export async function bookingCancellationEmail(data: BookingEmailData & { reason?: string }, locale: Locale = 'de'): Promise<{ subject: string; html: string; text: string }> {
  const tc = await getEmailTranslations(locale, 'emails.common')
  const tl = await getEmailTranslations(locale, 'emails.labels')
  const t = await getEmailTranslations(locale, 'emails.cancellation')

  const dateStr = formatDate(data.startsAt, undefined, locale)
  const subject = t('subject', { service: data.serviceName, date: dateStr })
  const timeRange = timeWithUhr(`${formatTime(data.startsAt, undefined, locale)} - ${formatTime(data.endsAt, undefined, locale)}`, tc)

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>${baseStyles}</style>
</head>
<body>
  <div class="header" style="background: #ef4444;">
    <h1>${t('title')}</h1>
  </div>
  <div class="content">
    <p>${tc('greeting', { name: data.customerName })}</p>
    <p>${t('body', { businessName: data.businessName })}</p>

    <div class="details">
      <h3 style="margin-top: 0;">${t('detailsTitle')}</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280; width: 140px;">${tl('service')}</td>
          <td style="padding: 8px 0;">${data.serviceName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">${tl('date')}</td>
          <td style="padding: 8px 0;">${dateStr}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">${tl('time')}</td>
          <td style="padding: 8px 0;">${timeRange}</td>
        </tr>
        ${data.reason ? `
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">${tl('reason')}</td>
          <td style="padding: 8px 0;">${data.reason}</td>
        </tr>
        ` : ''}
      </table>
    </div>

    <p>${t('rebookHint')}</p>

    <p>${tc('regards')}<br><strong>${data.businessName}</strong></p>
  </div>
  <div class="footer">
    <p>${tc('bookingNumber', { token: data.confirmationToken })}</p>
    <p>${tc('poweredBy')}</p>
  </div>
</body>
</html>
`

  const text = `
${t('title')}

${tc('greeting', { name: data.customerName })}

${t('body', { businessName: data.businessName })}

${t('textTitle')}
------------------
${tl('service')} ${data.serviceName}
${tl('date')} ${dateStr}
${tl('time')} ${timeRange}
${data.reason ? `${tl('reason')} ${data.reason}\n` : ''}
${tc('bookingNumber', { token: data.confirmationToken })}

${t('rebookHint')}

${tc('regards')}
${data.businessName}
`

  return { subject, html, text }
}

interface BookingRescheduledEmailData {
  customerName: string
  customerEmail: string
  serviceName: string
  staffName?: string
  businessName: string
  oldStartsAt: Date
  oldEndsAt: Date
  newStartsAt: Date
  newEndsAt: Date
  confirmationToken: string
  manageUrl?: string
}

export async function bookingRescheduledEmail(data: BookingRescheduledEmailData, locale: Locale = 'de'): Promise<{ subject: string; html: string; text: string }> {
  const tc = await getEmailTranslations(locale, 'emails.common')
  const tl = await getEmailTranslations(locale, 'emails.labels')
  const t = await getEmailTranslations(locale, 'emails.rescheduled')

  const newDateStr = formatDate(data.newStartsAt, undefined, locale)
  const subject = t('subject', { service: data.serviceName, date: newDateStr })

  const oldTimeRange = timeWithUhr(`${formatTime(data.oldStartsAt, undefined, locale)} - ${formatTime(data.oldEndsAt, undefined, locale)}`, tc)
  const newTimeRange = timeWithUhr(`${formatTime(data.newStartsAt, undefined, locale)} - ${formatTime(data.newEndsAt, undefined, locale)}`, tc)

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>${baseStyles}</style>
</head>
<body>
  <div class="header" style="background: #3B82F6;">
    <h1>${t('title')}</h1>
  </div>
  <div class="content">
    <p>${tc('greeting', { name: data.customerName })}</p>
    <p>${t('body', { businessName: data.businessName })}</p>

    <div class="details">
      <h3 style="margin-top: 0;">${t('oldAppointment')}</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280; width: 140px;">${tl('date')}</td>
          <td style="padding: 8px 0; text-decoration: line-through; color: #9ca3af;">${formatDate(data.oldStartsAt, undefined, locale)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">${tl('time')}</td>
          <td style="padding: 8px 0; text-decoration: line-through; color: #9ca3af;">${oldTimeRange}</td>
        </tr>
      </table>
    </div>

    <div class="details" style="border: 2px solid #3B82F6;">
      <h3 style="margin-top: 0; color: #3B82F6;">${t('newAppointment')}</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280; width: 140px;">${tl('service')}</td>
          <td style="padding: 8px 0; font-weight: 600;">${data.serviceName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">${tl('date')}</td>
          <td style="padding: 8px 0; font-weight: 600;">${newDateStr}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">${tl('time')}</td>
          <td style="padding: 8px 0; font-weight: 600;">${newTimeRange}</td>
        </tr>
        ${data.staffName ? `
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">${tl('staff')}</td>
          <td style="padding: 8px 0; font-weight: 600;">${data.staffName}</td>
        </tr>
        ` : ''}
      </table>
    </div>

    <div class="highlight" style="background: #dbeafe; border-left-color: #3B82F6;">
      <strong>${t('hintLabel')}</strong> ${t('hint')}
    </div>

    ${data.manageUrl ? `
    <div style="text-align: center; margin: 20px 0; padding-top: 15px; border-top: 1px solid #e5e7eb;">
      <a href="${data.manageUrl}" style="display: inline-block; background: #6b7280; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-size: 14px;">
        ${tc('manageBooking')}
      </a>
      <p style="font-size: 12px; color: #9ca3af; margin-top: 8px;">${t('manageSubtext')}</p>
    </div>
    ` : ''}

    <p>${tc('regards')}<br><strong>${data.businessName}</strong></p>
  </div>
  <div class="footer">
    <p>${tc('bookingNumber', { token: data.confirmationToken })}</p>
    <p>${tc('poweredBy')}</p>
  </div>
</body>
</html>
`

  const text = `
${t('title')}

${tc('greeting', { name: data.customerName })}

${t('body', { businessName: data.businessName })}

${t('textOldTitle')}
------------------------
${tl('date')} ${formatDate(data.oldStartsAt, undefined, locale)}
${tl('time')} ${oldTimeRange}

${t('textNewTitle')}
------------
${tl('service')} ${data.serviceName}
${tl('date')} ${newDateStr}
${tl('time')} ${newTimeRange}
${data.staffName ? `${tl('staff')} ${data.staffName}\n` : ''}
${tc('bookingNumber', { token: data.confirmationToken })}

${t('hint')}
${data.manageUrl ? `\n${tc('manageBooking')} (${t('manageSubtext')}): ${data.manageUrl}\n` : ''}
${tc('regards')}
${data.businessName}
`

  return { subject, html, text }
}

export async function bookingConfirmedEmail(data: BookingEmailData, locale: Locale = 'de'): Promise<{ subject: string; html: string; text: string }> {
  const tc = await getEmailTranslations(locale, 'emails.common')
  const tl = await getEmailTranslations(locale, 'emails.labels')
  const t = await getEmailTranslations(locale, 'emails.confirmed')

  const dateStr = formatDate(data.startsAt, undefined, locale)
  const subject = t('subject', { service: data.serviceName, date: dateStr })
  const timeRange = timeWithUhr(`${formatTime(data.startsAt, undefined, locale)} - ${formatTime(data.endsAt, undefined, locale)}`, tc)

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>${baseStyles}</style>
</head>
<body>
  <div class="header" style="background: #10b981;">
    <h1>${t('title')}</h1>
  </div>
  <div class="content">
    <p>${tc('greeting', { name: data.customerName })}</p>
    <p>${t('body', { businessName: data.businessName })}</p>

    <div class="details">
      <h3 style="margin-top: 0;">${t('detailsTitle')}</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280; width: 140px;">${tl('service')}</td>
          <td style="padding: 8px 0; font-weight: 600;">${data.serviceName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">${tl('date')}</td>
          <td style="padding: 8px 0; font-weight: 600;">${dateStr}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">${tl('time')}</td>
          <td style="padding: 8px 0; font-weight: 600;">${timeRange}</td>
        </tr>
        ${data.staffName ? `
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">${tl('staff')}</td>
          <td style="padding: 8px 0; font-weight: 600;">${data.staffName}</td>
        </tr>
        ` : ''}
        ${data.price ? `
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">${tl('price')}</td>
          <td style="padding: 8px 0; font-weight: 600;">${formatPrice(data.price, data.currency, locale)}</td>
        </tr>
        ` : ''}
      </table>
    </div>

    <div class="highlight" style="background: #d1fae5; border-left-color: #10b981;">
      <strong>${t('hintLabel')}</strong> ${t('hint')}
    </div>

    <p>${tc('contactUs')}</p>

    ${data.manageUrl ? `
    <div style="text-align: center; margin: 20px 0; padding-top: 15px; border-top: 1px solid #e5e7eb;">
      <a href="${data.manageUrl}" style="display: inline-block; background: #6b7280; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-size: 14px;">
        ${tc('manageBooking')}
      </a>
      <p style="font-size: 12px; color: #9ca3af; margin-top: 8px;">${tc('manageBookingSubtext')}</p>
    </div>
    ` : ''}

    <p>${tc('regards')}<br><strong>${data.businessName}</strong></p>
  </div>
  <div class="footer">
    <p>${tc('bookingNumber', { token: data.confirmationToken })}</p>
    <p>${tc('poweredBy')}</p>
  </div>
</body>
</html>
`

  const text = `
${t('title')}

${tc('greeting', { name: data.customerName })}

${t('body', { businessName: data.businessName })}

${t('textTitle')}
------------
${tl('service')} ${data.serviceName}
${tl('date')} ${dateStr}
${tl('time')} ${timeRange}
${data.staffName ? `${tl('staff')} ${data.staffName}\n` : ''}${data.price ? `${tl('price')} ${formatPrice(data.price, data.currency, locale)}\n` : ''}
${tc('bookingNumber', { token: data.confirmationToken })}

${t('hint')}
${data.manageUrl ? `\n${tc('manageBooking')} (${tc('manageBookingSubtext')}): ${data.manageUrl}\n` : ''}
${tc('regards')}
${data.businessName}
`

  return { subject, html, text }
}

export async function bookingReminderEmail(data: BookingEmailData, locale: Locale = 'de'): Promise<{ subject: string; html: string; text: string }> {
  const tc = await getEmailTranslations(locale, 'emails.common')
  const tl = await getEmailTranslations(locale, 'emails.labels')
  const t = await getEmailTranslations(locale, 'emails.reminder')

  const dateStr = formatDate(data.startsAt, undefined, locale)
  const timeStr = formatTime(data.startsAt, undefined, locale)
  const subject = t('subject', { service: data.serviceName, time: timeStr })
  const timeRange = timeWithUhr(`${timeStr} - ${formatTime(data.endsAt, undefined, locale)}`, tc)

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>${baseStyles}</style>
</head>
<body>
  <div class="header" style="background: #f59e0b;">
    <h1>${t('title')}</h1>
  </div>
  <div class="content">
    <p>${tc('greeting', { name: data.customerName })}</p>
    <p>${t('body', { businessName: data.businessName })}</p>

    <div class="details">
      <h3 style="margin-top: 0;">${t('detailsTitle')}</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280; width: 140px;">${tl('service')}</td>
          <td style="padding: 8px 0; font-weight: 600;">${data.serviceName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">${tl('date')}</td>
          <td style="padding: 8px 0; font-weight: 600;">${dateStr}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">${tl('time')}</td>
          <td style="padding: 8px 0; font-weight: 600;">${timeRange}</td>
        </tr>
        ${data.staffName ? `
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">${tl('staff')}</td>
          <td style="padding: 8px 0; font-weight: 600;">${data.staffName}</td>
        </tr>
        ` : ''}
      </table>
    </div>

    <div class="highlight">
      <strong>${t('cancelHintLabel')}</strong> ${t('cancelHint')}
    </div>

    ${data.manageUrl ? `
    <div style="text-align: center; margin: 20px 0;">
      <a href="${data.manageUrl}" style="display: inline-block; background: #6b7280; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-size: 14px;">
        ${tc('manageBooking')}
      </a>
      <p style="font-size: 12px; color: #9ca3af; margin-top: 8px;">${tc('manageBookingSubtext')}</p>
    </div>
    ` : ''}

    <p>${t('lookingForward')}</p>

    <p>${tc('regards')}<br><strong>${data.businessName}</strong></p>
  </div>
  <div class="footer">
    <p>${tc('bookingNumber', { token: data.confirmationToken })}</p>
    <p>${tc('poweredBy')}</p>
  </div>
</body>
</html>
`

  const text = `
${t('title')}

${tc('greeting', { name: data.customerName })}

${t('body', { businessName: data.businessName })}

${t('textTitle')}
----------
${tl('service')} ${data.serviceName}
${tl('date')} ${dateStr}
${tl('time')} ${timeRange}
${data.staffName ? `${tl('staff')} ${data.staffName}\n` : ''}
${tc('bookingNumber', { token: data.confirmationToken })}

${t('cancelHint')}
${data.manageUrl ? `\n${tc('manageBooking')} (${tc('manageBookingSubtext')}): ${data.manageUrl}\n` : ''}
${t('lookingForward')}

${tc('regards')}
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

export async function liveChatRequestEmail(data: LiveChatRequestEmailData, locale: Locale = 'de'): Promise<{ subject: string; html: string; text: string }> {
  const tc = await getEmailTranslations(locale, 'emails.common')
  const tl = await getEmailTranslations(locale, 'emails.labels')
  const t = await getEmailTranslations(locale, 'emails.liveChat')

  const subject = t('subject', { businessName: data.businessName })

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>${baseStyles}</style></head>
<body>
  <div class="header" style="background: #f59e0b;">
    <h1>${t('title')}</h1>
  </div>
  <div class="content">
    <p>${t('body')}</p>
    <div class="details">
      <table style="width: 100%; border-collapse: collapse;">
        ${data.customerName ? `
        <tr>
          <td style="padding: 8px 0; color: #6b7280; width: 140px;">${tl('customer')}</td>
          <td style="padding: 8px 0; font-weight: 600;">${data.customerName}</td>
        </tr>` : ''}
        <tr>
          <td style="padding: 8px 0; color: #6b7280; width: 140px;">${tl('message')}</td>
          <td style="padding: 8px 0;">${data.firstMessage}</td>
        </tr>
      </table>
    </div>
    <div style="text-align: center; margin: 20px 0;">
      <a href="${data.dashboardUrl}" class="button" style="display: inline-block; background: #f59e0b; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600;">
        ${t('goToChat')}
      </a>
    </div>
    <p>${tc('regards')}<br><strong>Hebelki</strong></p>
  </div>
  <div class="footer"><p>${tc('autoSent')}</p></div>
</body>
</html>`

  const text = `${t('subject', { businessName: data.businessName })}

${t('body')}
${data.customerName ? `${tl('customer')} ${data.customerName}\n` : ''}${tl('message')} ${data.firstMessage}

${t('goToChat')}: ${data.dashboardUrl}
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

export async function chatEscalatedEmail(data: ChatEscalatedEmailData, locale: Locale = 'de'): Promise<{ subject: string; html: string; text: string }> {
  const tc = await getEmailTranslations(locale, 'emails.common')
  const tl = await getEmailTranslations(locale, 'emails.labels')
  const t = await getEmailTranslations(locale, 'emails.escalated')

  const subject = t('subject', { businessName: data.businessName })

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>${baseStyles}</style></head>
<body>
  <div class="header" style="background: #ef4444;">
    <h1>${t('title')}</h1>
  </div>
  <div class="content">
    <p>${t('body')}</p>
    <div class="details">
      <h3 style="margin-top: 0;">${tl('customer')}</h3>
      <table style="width: 100%; border-collapse: collapse;">
        ${data.customerName ? `
        <tr>
          <td style="padding: 8px 0; color: #6b7280; width: 140px;">${tl('name')}</td>
          <td style="padding: 8px 0; font-weight: 600;">${data.customerName}</td>
        </tr>` : ''}
        ${data.customerEmail ? `
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">${tl('email')}</td>
          <td style="padding: 8px 0;"><a href="mailto:${data.customerEmail}">${data.customerEmail}</a></td>
        </tr>` : ''}
        ${data.customerPhone ? `
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">${tl('phone')}</td>
          <td style="padding: 8px 0;"><a href="tel:${data.customerPhone}">${data.customerPhone}</a></td>
        </tr>` : ''}
      </table>
    </div>
    <div class="details">
      <h3 style="margin-top: 0;">${t('conversationSummary')}</h3>
      <p style="white-space: pre-wrap;">${data.conversationSummary}</p>
    </div>
    <div style="text-align: center; margin: 20px 0;">
      <a href="${data.dashboardUrl}" class="button" style="display: inline-block; background: #ef4444; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600;">
        ${t('viewConversation')}
      </a>
    </div>
    <p>${t('contactCustomer')}</p>
    <p>${tc('regards')}<br><strong>Hebelki</strong></p>
  </div>
  <div class="footer"><p>${tc('autoSent')}</p></div>
</body>
</html>`

  const text = `${t('subject', { businessName: data.businessName })}

${t('body')}

${data.customerName ? `${tl('name')} ${data.customerName}\n` : ''}${data.customerEmail ? `${tl('email')} ${data.customerEmail}\n` : ''}${data.customerPhone ? `${tl('phone')} ${data.customerPhone}\n` : ''}
${t('conversationSummary')}:
${data.conversationSummary}

${t('viewConversation')}: ${data.dashboardUrl}

${t('contactCustomer')}
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

export async function invoiceSentEmail(data: InvoiceSentEmailData, locale: Locale = 'de'): Promise<{ subject: string; html: string; text: string }> {
  const tc = await getEmailTranslations(locale, 'emails.common')
  const tl = await getEmailTranslations(locale, 'emails.labels')
  const t = await getEmailTranslations(locale, 'emails.invoice')

  const subject = t('subject', { number: data.invoiceNumber, businessName: data.businessName })

  const greeting = data.customerName
    ? tc('greetingWithName', { name: data.customerName })
    : tc('greetingGeneric')

  const html = `
<!DOCTYPE html>
<html>
<head><style>${baseStyles}</style></head>
<body>
  <div class="header">
    <h1>${data.businessName}</h1>
    <p>${t('title', { number: data.invoiceNumber })}</p>
  </div>
  <div class="content">
    <p>${greeting}</p>
    <p>${t('body', { number: data.invoiceNumber, total: data.total })}</p>
    <div class="details">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-weight: 600; color: #6b7280;">${tl('invoiceNumber')}</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;">${data.invoiceNumber}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-weight: 600; color: #6b7280;">${tl('amount')}</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;">${data.total}</td>
        </tr>
        ${data.dueDate ? `
        <tr>
          <td style="padding: 8px 0; font-weight: 600; color: #6b7280;">${tl('dueDate')}</td>
          <td style="padding: 8px 0;">${data.dueDate}</td>
        </tr>` : ''}
      </table>
    </div>
    <p>
      <a href="${data.pdfDownloadUrl}" class="button">${t('downloadPdf')}</a>
    </p>
    <p style="font-size: 12px; color: #6b7280;">${t('linkExpiry')}</p>
    <p>${t('paymentNote')}</p>
    <p>${tc('regards')}<br><strong>${data.businessName}</strong></p>
  </div>
  <div class="footer">
    <p>${tc('autoSent')}</p>
  </div>
</body>
</html>`

  const text = `${subject}

${greeting}

${t('body', { number: data.invoiceNumber, total: data.total })}

PDF: ${data.pdfDownloadUrl}
(${t('linkExpiry')})

${t('paymentNote')}

${tc('regards')}
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

export async function deletionRequestEmail(data: DeletionRequestEmailData, locale: Locale = 'de'): Promise<{ subject: string; html: string; text: string }> {
  const tc = await getEmailTranslations(locale, 'emails.common')
  const t = await getEmailTranslations(locale, 'emails.deletion')

  const subject = t('subject', { businessName: data.businessName })

  const expiryDate = data.expiresAt.toLocaleDateString(getDateLocale(locale), {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const greeting = data.customerName
    ? tc('greeting', { name: data.customerName })
    : tc('greetingGeneric')

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>${baseStyles}</style>
</head>
<body>
  <div class="header" style="background: #ef4444;">
    <h1>${t('title')}</h1>
  </div>
  <div class="content">
    <p>${greeting}</p>
    <p>${t('body', { businessName: data.businessName })}</p>

    <div class="highlight" style="background: #fef3c7; border-left-color: #f59e0b;">
      <strong>${t('ignoreHintLabel')}</strong> ${t('ignoreHint')}
    </div>

    <div class="details">
      <h3 style="margin-top: 0;">${t('whatDeleted')}</h3>
      <ul style="color: #374151; padding-left: 20px;">
        <li>${t('deletePersonalData')}</li>
        <li>${t('deleteBookings')}</li>
        <li>${t('deleteChats')}</li>
        <li>${t('deleteInvoices')}</li>
      </ul>
      <p style="color: #6b7280; font-size: 14px;">${t('irreversible')}</p>
    </div>

    <p><strong>${t('beforeDelete')}</strong> ${t('downloadHint')}</p>
    <div style="text-align: center; margin: 15px 0;">
      <a href="${data.exportUrl}" class="button" style="display: inline-block; background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
        ${t('downloadData')}
      </a>
    </div>

    <p><strong>${t('confirmDeletion')}</strong></p>
    <div style="text-align: center; margin: 15px 0;">
      <a href="${data.confirmUrl}" class="button" style="display: inline-block; background: #ef4444; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
        ${t('deleteButton')}
      </a>
    </div>

    <p style="color: #6b7280; font-size: 14px; text-align: center;">
      ${t('linkExpiry', { date: expiryDate })}
    </p>

    <p>${tc('regards')}<br><strong>${data.businessName}</strong></p>
  </div>
  <div class="footer">
    <p>${tc('autoSent')}</p>
    <p>${tc('poweredBy')}</p>
  </div>
</body>
</html>`

  const text = `${t('title')} - ${data.businessName}

${greeting}

${t('body', { businessName: data.businessName })}

${t('ignoreHintLabel')} ${t('ignoreHint')}

${t('whatDeleted')}
- ${t('deletePersonalData')}
- ${t('deleteBookings')}
- ${t('deleteChats')}
- ${t('deleteInvoices')}

${t('irreversible')}

${t('downloadData')}: ${data.exportUrl}

${t('confirmDeletion')} ${data.confirmUrl}

${t('linkExpiry', { date: expiryDate })}

${tc('regards')}
${data.businessName}
`

  return { subject, html, text }
}
