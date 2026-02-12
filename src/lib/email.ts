import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 465,
  secure: true, // SSL/TLS on port 465
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    // Namecheap shared hosting uses a wildcard cert for *.web-hosting.com,
    // not a cert for mail.hebelki.de — so we must match their actual cert
    servername: 'web-hosting.com',
  },
})

interface SendEmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

export async function sendEmail(options: SendEmailOptions) {
  console.log('[Email] Sending email...')
  console.log('[Email] SMTP configured:', !!process.env.SMTP_HOST && !!process.env.SMTP_USER)

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    console.warn('[Email] Email not configured - skipping email send')
    return null
  }

  try {
    const result = await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      ...options,
    })
    console.log('[Email] Email sent successfully, messageId:', result.messageId)
    return result
  } catch (error) {
    console.error('[Email] Failed to send email:', error)
    throw error
  }
}

/**
 * Send a custom email to a customer (used by admin chatbot tools)
 */
interface SendCustomEmailOptions {
  to: string
  subject: string
  body: string
  customerName?: string
  businessName?: string
  attachments?: Array<{ filename: string; content: Buffer; contentType: string }>
}

export async function sendCustomEmail(options: SendCustomEmailOptions) {
  const { to, subject, body, customerName, businessName } = options

  console.log('[Email] Sending custom email...')

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    console.warn('[Email] Email not configured - skipping email send')
    return null
  }

  // Format body as HTML with proper line breaks
  const htmlBody = body
    .replace(/\n/g, '<br>')
    .replace(/\r/g, '')

  const greeting = customerName ? `Hallo ${customerName},` : 'Hallo,'
  const signature = businessName ? `Mit freundlichen Grüßen,<br>${businessName}` : 'Mit freundlichen Grüßen'

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <p>${greeting}</p>
      <div style="margin: 20px 0;">
        ${htmlBody}
      </div>
      <p>${signature}</p>
    </div>
  `

  const text = `${customerName ? `Hallo ${customerName},` : 'Hallo,'}\n\n${body}\n\n${businessName ? `Mit freundlichen Grüßen,\n${businessName}` : 'Mit freundlichen Grüßen'}`

  try {
    const result = await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      html,
      text,
      attachments: options.attachments?.map(a => ({
        filename: a.filename,
        content: a.content,
        contentType: a.contentType,
      })),
    })
    console.log('[Email] Custom email sent successfully, messageId:', result.messageId)
    return result
  } catch (error) {
    console.error('[Email] Failed to send custom email:', error)
    throw error
  }
}
