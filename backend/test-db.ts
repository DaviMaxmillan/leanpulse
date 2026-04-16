const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const classes = await prisma.class.findMany();
  console.log('Classes no DB:', classes);
  const rooms = await prisma.room.findMany();
  console.log('Rooms no DB:', rooms);
  const exams = await prisma.exam.findMany();
  console.log('Exams no DB:', exams);
}

main().catch(console.error).finally(() => prisma.$disconnect());
