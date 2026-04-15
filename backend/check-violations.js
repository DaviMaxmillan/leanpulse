const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const v = await p.violation.findFirst({
    orderBy: { timestamp: 'desc' },
    select: { id: true, type: true, screenshot: true, timestamp: true }
  });
  if (!v) { console.log('No violations found in DB'); return; }
  console.log('Most recent violation:');
  console.log('  type:', v.type);
  console.log('  timestamp:', v.timestamp);
  console.log('  screenshot is null:', v.screenshot === null);
  console.log('  screenshot length (chars):', v.screenshot?.length ?? 0);
  if (v.screenshot) {
    console.log('  screenshot starts with:', v.screenshot.substring(0, 50));
  }
  await p.$disconnect();
}

main().catch(e => { console.error(e); p.$disconnect(); });
