#!/usr/bin/env node
/**
 * Check what tables exist in the D1 database
 */

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Connect to local D1 database
const dbPath = join(__dirname, '.wrangler/state/v3/d1/miniflare-D1DatabaseObject/f272169f61c5ab0eef210fc95e193d10f70878fbd97e423d5cbd3a2362c11d3c.sqlite');
const db = new Database(dbPath);

console.log('🔍 Checking database tables...\n');

// Get all tables
const tables = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' 
    ORDER BY name
`).all();

console.log('📋 Tables found:');
tables.forEach(table => {
    console.log(`  - ${table.name}`);
    
    // Get row count for each table
    try {
        const count = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get();
        console.log(`    Rows: ${count.count}`);
        
        // Get table schema
        const columns = db.prepare(`PRAGMA table_info(${table.name})`).all();
        console.log(`    Columns: ${columns.map(c => c.name).join(', ')}`);
    } catch (e) {
        console.log(`    Error reading table: ${e.message}`);
    }
    console.log('');
});

// Check for _cf_KV table (D1's internal KV storage)
const kvTable = tables.find(t => t.name === '_cf_KV');
if (kvTable) {
    console.log('\n📦 KV Storage entries:');
    const kvEntries = db.prepare('SELECT key FROM _cf_KV LIMIT 10').all();
    kvEntries.forEach(entry => {
        console.log(`  - ${entry.key}`);
    });
}

db.close();
console.log('\n✅ Database check complete!');