import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve('backend/.env') });

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl || !dbUrl.startsWith('postgres')) {
  console.log(`
ℹ️  Supabase Connection Setup:
---------------------------------------------------------------
To connect your Supabase database:
1. Open your Supabase Dashboard -> Project Settings -> Database.
2. Copy the "URI" connection string (Session pooler or Direct).
3. Set DATABASE_URL in backend/.env:
   DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"
4. Re-run: node scripts/setup-supabase.js
---------------------------------------------------------------
`);
  process.exit(0);
}

console.log('🔌 Connecting to Supabase PostgreSQL database...');

const client = new pg.Client({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  try {
    await client.connect();
    console.log('✅ Successfully connected to Supabase PostgreSQL!');

    const schemaPath = path.resolve('schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');

    console.log('📄 Executing schema.sql DDL on Supabase...');
    await client.query(sql);

    console.log('🔍 Verifying created tables...');
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('tenants', 'admins', 'students', 'attendance', 'tenant_settings')
      ORDER BY table_name;
    `);

    console.log('✅ Tables present in Supabase:');
    res.rows.forEach((r) => console.log(`   - ${r.table_name}`));
    console.log('\n🎉 Supabase database is completely provisioned and ready!');
  } catch (err) {
    console.error('❌ Supabase setup error:', err.message);
  } finally {
    await client.end();
  }
}

run();
