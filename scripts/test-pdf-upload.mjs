/**
 * Test script for PDF upload flow
 * Run with: node scripts/test-pdf-upload.mjs
 */

import { neon } from '@neondatabase/serverless'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { randomUUID } from 'crypto'
import { readFileSync } from 'fs'

// Config
const DATABASE_URL = 'postgresql://neondb_owner:npg_z8XmKskxLW0p@ep-dry-sound-ah0xr4m5-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require'
const R2_ACCOUNT_ID = 'f030fb372ca4f4e5e05ef70f92b6ca67'
const R2_ACCESS_KEY_ID = 'b70adce5bf7e7a1dbe26bf22ece4ffca'
const R2_SECRET_ACCESS_KEY = '405460e9a893ad78dc4f3804429fa304c82e928a0e8175811846dedd91809899'
const R2_BUCKET_NAME = 'hebelki'

const BUSINESS_ID = '22258e92-cdef-4cc3-91a9-02035ed56e28'
const PDF_PATH = '/tmp/test-document.pdf'

const sql = neon(DATABASE_URL)

const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.eu.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
})

async function main() {
  console.log('='.repeat(60))
  console.log('PDF Upload Test')
  console.log('='.repeat(60))
  console.log(`Business ID: ${BUSINESS_ID}`)
  console.log(`PDF Path: ${PDF_PATH}`)
  console.log('')

  try {
    // Read PDF file
    const pdfBuffer = readFileSync(PDF_PATH)
    console.log(`PDF size: ${pdfBuffer.length} bytes`)
    console.log('')

    // Step 1: Create document record
    console.log('[1/5] Creating document record...')
    const docId = randomUUID()
    await sql`
      INSERT INTO documents (id, business_id, title, original_filename, status, uploaded_by)
      VALUES (${docId}, ${BUSINESS_ID}, 'Sample PDF Document', 'sample.pdf', 'active', 'test-script')
    `
    console.log(`     Document ID: ${docId}`)

    // Step 2: Create document version
    console.log('[2/5] Creating document version...')
    const versionId = randomUUID()
    const r2Key = `tenant/${BUSINESS_ID}/documents/${docId}/v1/raw.pdf`
    await sql`
      INSERT INTO document_versions (id, document_id, version, r2_key, mime_type, file_size)
      VALUES (${versionId}, ${docId}, 1, ${r2Key}, 'application/pdf', ${pdfBuffer.length})
    `
    console.log(`     Version ID: ${versionId}`)
    console.log(`     R2 Key: ${r2Key}`)

    // Step 3: Upload to R2
    console.log('[3/5] Uploading PDF to R2...')

    const uploadCommand = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: r2Key,
      Body: pdfBuffer,
      ContentType: 'application/pdf',
    })

    await r2Client.send(uploadCommand)
    console.log(`     Uploaded ${pdfBuffer.length} bytes`)

    // Step 4: Create ingestion job
    console.log('[4/5] Creating ingestion job...')
    const jobId = randomUUID()
    await sql`
      INSERT INTO ingestion_jobs (id, document_version_id, business_id, status, metrics)
      VALUES (${jobId}, ${versionId}, ${BUSINESS_ID}, 'uploaded', '{"test": true}'::jsonb)
    `
    console.log(`     Job ID: ${jobId}`)

    // Step 5: Monitor job
    console.log('[5/5] Monitoring job status...')
    console.log('     (Worker should pick this up within 3 seconds)')
    console.log('')

    let attempts = 0
    const maxAttempts = 60  // 60 * 2 = 120 seconds max

    while (attempts < maxAttempts) {
      const [job] = await sql`
        SELECT status, attempts, last_error, metrics, completed_at
        FROM ingestion_jobs
        WHERE id = ${jobId}
      `

      const statusEmoji = {
        'uploaded': '⏳',
        'parsing': '📄',
        'chunking': '✂️',
        'embedding': '🧠',
        'done': '✅',
        'failed': '❌',
        'retry_ready': '🔄',
      }[job.status] || '❓'

      console.log(`     ${statusEmoji} Status: ${job.status} (${attempts + 1}/${maxAttempts})`)

      if (job.status === 'done') {
        console.log('')
        console.log('✅ SUCCESS! Document processed.')
        console.log(`   Metrics: ${JSON.stringify(job.metrics)}`)

        // Check chunks created
        const chunks = await sql`
          SELECT COUNT(*) as count FROM document_chunks WHERE document_version_id = ${versionId}
        `
        console.log(`   Chunks created: ${chunks[0].count}`)

        // Check embeddings created
        const embeddings = await sql`
          SELECT COUNT(*) as count FROM chunk_embeddings
          WHERE chunk_id IN (SELECT id FROM document_chunks WHERE document_version_id = ${versionId})
        `
        console.log(`   Embeddings created: ${embeddings[0].count}`)

        // Check pages extracted
        const pages = await sql`
          SELECT COUNT(*) as count FROM document_pages WHERE document_version_id = ${versionId}
        `
        console.log(`   Pages extracted: ${pages[0].count}`)

        break
      } else if (job.status === 'failed') {
        console.log('')
        console.log('❌ FAILED!')
        console.log(`   Error: ${job.last_error}`)
        break
      }

      await new Promise(r => setTimeout(r, 2000))
      attempts++
    }

    if (attempts >= maxAttempts) {
      console.log('')
      console.log('⏰ Timeout waiting for job completion')

      // Get final status
      const [job] = await sql`
        SELECT status, last_error FROM ingestion_jobs WHERE id = ${jobId}
      `
      console.log(`   Final status: ${job.status}`)
      if (job.last_error) console.log(`   Last error: ${job.last_error}`)
    }

  } catch (error) {
    console.error('Error:', error)
  }

  console.log('')
  console.log('='.repeat(60))
}

main()
