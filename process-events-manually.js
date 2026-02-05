const { Pool } = require('@neondatabase/serverless');
const nodemailer = require('nodemailer');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const sql = pool.query.bind(pool);

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
  debug: false,
});

async function processFailedEvents() {
  console.log('Fetching failed events...\n');
  console.log('SMTP Host:', process.env.SMTP_HOST);
  console.log('');

  const events = await sql(`
    SELECT id, event_type, payload, attempts
    FROM event_outbox
    WHERE processed_at IS NULL
    AND attempts < max_attempts
    ORDER BY created_at ASC
    LIMIT 10
  `);

  console.log(`Found ${events.rows.length} events to retry\n`);

  for (const event of events.rows) {
    console.log(`Processing event ${event.id} (attempt ${event.attempts + 1})`);
    console.log(`Type: ${event.event_type}`);

    try {
      const payload = event.payload;

      // Send customer confirmation email
      console.log(`  → Sending to ${payload.customerEmail}...`);
      await transporter.sendMail({
        from: process.env.SMTP_FROM,
        to: payload.customerEmail,
        subject: 'Buchungsbestätigung - Hebelki',
        html: `<p>Hallo ${payload.customerName},</p><p>Ihre Buchung wurde erfolgreich erstellt.</p>`,
        text: `Hallo ${payload.customerName}, Ihre Buchung wurde erfolgreich erstellt.`,
      });
      console.log('  ✅ Customer email sent');

      // Send business notification if email exists
      if (payload.businessEmail) {
        console.log(`  → Sending to ${payload.businessEmail}...`);
        await transporter.sendMail({
          from: process.env.SMTP_FROM,
          to: payload.businessEmail,
          subject: 'Neue Buchung - Hebelki',
          html: `<p>Neue Buchung von ${payload.customerName}</p>`,
          text: `Neue Buchung von ${payload.customerName}`,
        });
        console.log('  ✅ Business email sent');
      }

      // Mark as processed
      await sql(`
        UPDATE event_outbox
        SET processed_at = NOW(), attempts = attempts + 1, last_error = NULL
        WHERE id = '${event.id}'
      `);

      console.log(`  ✅ Event marked as processed\n`);

    } catch (error) {
      console.error(`  ❌ Failed:`, error.message);
      const escapedError = error.message.replace(/'/g, "''").substring(0, 500);
      await sql(`
        UPDATE event_outbox
        SET attempts = attempts + 1, last_error = '${escapedError}'
        WHERE id = '${event.id}'
      `);
      console.log('');
    }
  }

  await pool.end();
  console.log('Done!');
}

processFailedEvents().catch(console.error);
