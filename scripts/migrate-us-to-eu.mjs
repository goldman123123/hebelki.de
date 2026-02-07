#!/usr/bin/env node

/**
 * Migration script: US Database → EU Database
 *
 * This script copies all data from the US Neon database (ep-dry-sound-ah0xr4m5)
 * to the new EU Neon database (ep-mute-hill-aginxbpb).
 *
 * Run with: node scripts/migrate-us-to-eu.mjs
 */

import pg from 'pg';
const { Pool } = pg;

// Source (US) database
const SOURCE_URL = 'postgresql://neondb_owner:npg_z8XmKskxLW0p@ep-dry-sound-ah0xr4m5-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require';

// Target (EU) database
const TARGET_URL = 'postgresql://neondb_owner:npg_o0yek5APcVHU@ep-mute-hill-aginxbpb-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require';

// Tables to migrate in order (respects FK dependencies)
const TABLES = [
  // Core tables (no FK dependencies)
  'businesses',

  // First-level dependencies (FK to businesses)
  'business_members',
  'customers',
  'staff',
  'services',
  'event_outbox',
  'availability_templates',
  'availability_overrides',
  'documents',
  'scraped_pages',
  'invoice_sequences',
  'chatbot_knowledge', // Needs businesses (source_document_id is nullable, handle later)
  'chatbot_conversations',
  'ingestion_jobs', // Needs businesses (document_version_id is nullable)
  'support_tickets',

  // Second-level dependencies
  'staff_services',           // FK to staff, services
  'availability_slots',       // FK to availability_templates
  'booking_holds',            // FK to businesses, services, staff, customers
  'document_versions',        // FK to documents

  // Third-level dependencies
  'bookings',                 // FK to businesses, services, staff, customers, booking_holds
  'waitlist',                 // FK to businesses, services, staff, customers
  'document_pages',           // FK to document_versions
  'document_chunks',          // FK to document_versions, businesses

  // Fourth-level dependencies
  'booking_actions',          // FK to bookings
  'chatbot_messages',         // FK to chatbot_conversations
  'ticket_comments',          // FK to support_tickets
  'invoices',                 // FK to businesses, customers, bookings
  'chunk_embeddings',         // FK to document_chunks, businesses
];

async function migrateTable(sourcePool, targetPool, tableName) {
  const client = await targetPool.connect();

  try {
    // Get row count from source
    const countResult = await sourcePool.query(`SELECT COUNT(*) FROM "${tableName}"`);
    const sourceCount = parseInt(countResult.rows[0].count, 10);

    if (sourceCount === 0) {
      console.log(`  ⏭️  ${tableName}: 0 rows (skipping)`);
      return { table: tableName, source: 0, target: 0, status: 'skipped' };
    }

    // Fetch all rows from source
    const sourceData = await sourcePool.query(`SELECT * FROM "${tableName}"`);
    const rows = sourceData.rows;

    if (rows.length === 0) {
      console.log(`  ⏭️  ${tableName}: 0 rows (skipping)`);
      return { table: tableName, source: 0, target: 0, status: 'skipped' };
    }

    // Get column names from first row
    const columns = Object.keys(rows[0]);
    const columnList = columns.map(c => `"${c}"`).join(', ');

    // Build parameterized insert
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
    const insertQuery = `INSERT INTO "${tableName}" (${columnList}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;

    // Insert rows
    await client.query('BEGIN');

    let inserted = 0;
    for (const row of rows) {
      const values = columns.map(col => row[col]);
      try {
        const result = await client.query(insertQuery, values);
        if (result.rowCount > 0) inserted++;
      } catch (err) {
        // Log but continue on constraint violations
        if (err.code === '23505') { // unique_violation
          // Skip duplicates silently
        } else if (err.code === '23503') { // foreign_key_violation
          console.log(`    ⚠️  FK violation in ${tableName}: ${err.detail}`);
        } else {
          throw err;
        }
      }
    }

    await client.query('COMMIT');

    // Verify target count
    const targetCountResult = await targetPool.query(`SELECT COUNT(*) FROM "${tableName}"`);
    const targetCount = parseInt(targetCountResult.rows[0].count, 10);

    const status = targetCount >= sourceCount ? '✅' : '⚠️';
    console.log(`  ${status} ${tableName}: ${sourceCount} → ${targetCount} rows`);

    return { table: tableName, source: sourceCount, target: targetCount, status: 'migrated' };

  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`  ❌ ${tableName}: Error - ${err.message}`);
    return { table: tableName, source: 0, target: 0, status: 'error', error: err.message };
  } finally {
    client.release();
  }
}

async function main() {
  console.log('🚀 Hebelki Database Migration: US → EU\n');
  console.log('Source: ep-dry-sound-ah0xr4m5 (us-east-1)');
  console.log('Target: ep-mute-hill-aginxbpb (eu-central-1)\n');

  const sourcePool = new Pool({ connectionString: SOURCE_URL });
  const targetPool = new Pool({ connectionString: TARGET_URL });

  try {
    // Test connections
    console.log('Testing connections...');
    await sourcePool.query('SELECT 1');
    console.log('  ✅ Source database connected');
    await targetPool.query('SELECT 1');
    console.log('  ✅ Target database connected\n');

    console.log('Migrating tables...\n');

    const results = [];
    for (const table of TABLES) {
      const result = await migrateTable(sourcePool, targetPool, table);
      results.push(result);
    }

    // Summary
    console.log('\n📊 Migration Summary:\n');
    console.log('Table                          Source    Target    Status');
    console.log('─'.repeat(60));

    let totalSource = 0;
    let totalTarget = 0;

    for (const r of results) {
      const tablePadded = r.table.padEnd(30);
      const sourcePadded = String(r.source).padStart(6);
      const targetPadded = String(r.target).padStart(8);
      const status = r.status === 'migrated' ? '✅' : r.status === 'skipped' ? '⏭️' : '❌';
      console.log(`${tablePadded} ${sourcePadded} ${targetPadded}    ${status}`);
      totalSource += r.source;
      totalTarget += r.target;
    }

    console.log('─'.repeat(60));
    console.log(`${'TOTAL'.padEnd(30)} ${String(totalSource).padStart(6)} ${String(totalTarget).padStart(8)}`);

    console.log('\n✅ Migration complete!');
    console.log('\nNext steps:');
    console.log('1. Update .env.local with EU database URL');
    console.log('2. Restart dev server');
    console.log('3. Verify dashboard loads correctly');

  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    await sourcePool.end();
    await targetPool.end();
  }
}

main();
