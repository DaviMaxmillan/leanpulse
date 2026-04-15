import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import * as bcrypt from 'bcrypt';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableCors({ origin: '*' });

  // Servir arquivos de upload como static assets (cloud-ready: configurável via UPLOAD_PATH)
  const uploadPath = process.env.UPLOAD_PATH || join(process.cwd(), 'uploads');
  if (!existsSync(uploadPath)) mkdirSync(uploadPath, { recursive: true });
  app.useStaticAssets(uploadPath, { prefix: '/uploads' });

  // Seed Super Admin
  const prisma = app.get(PrismaService);
  const admin = await prisma.user.findFirst({ where: { role: 'SUPERADMIN' } });
  if (!admin) {
    const defaultPassword = await bcrypt.hash('admin123', 10);
    await prisma.user.create({
      data: {
        name: 'Super Administrador',
        email: 'admin',
        password: defaultPassword,
        role: 'SUPERADMIN',
      },
    });
    console.log('Super Administrador criado. Credenciais -> Login: admin / Senha: admin123');
  }

  const os = require('os');
  const networkInterfaces = os.networkInterfaces();
  const addresses: string[] = [];
  for (const k in networkInterfaces) {
    for (const k2 in networkInterfaces[k]) {
      const address = networkInterfaces[k][k2];
      if (address.family === 'IPv4' && !address.internal) {
        addresses.push(address.address);
      }
    }
  }

  await app.listen(process.env.PORT ?? 3001, '0.0.0.0');
  const port = process.env.PORT ?? 3001;
  console.log(`\n✅ Backend LeanPulse rodando na porta: ${port}`);
  addresses.forEach(ip => {
    console.log(`📡 Acesso via rede local: http://${ip}:${port}`);
  });
  console.log("");
}
bootstrap();

