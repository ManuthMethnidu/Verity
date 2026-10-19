import { PrismaClient } from '@prisma/client';

function getEffectiveDatabaseUrl() {
  const url = process.env.DATABASE_URL;

  // If URL is missing, or targets the IPv6-only direct host (db.eogvihhldczkjrrzhmls.supabase.co),
  // automatically route through the IPv4 Supabase Connection Pooler on port 6543!
  if (!url || url.includes('db.eogvihhldczkjrrzhmls.supabase.co')) {
    return 'postgresql://postgres.eogvihhldczkjrrzhmls:Mana0%4047855@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true';
  }

  return url;
}

const dbUrl = getEffectiveDatabaseUrl();

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: dbUrl,
    },
  },
});
