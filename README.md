# 🎓 LeanPulse — Sistema de Gestão Escolar

Plataforma web para professores gerenciarem turmas, atividades, chamadas e planos de aula.

## 🛠️ Tecnologias

- **Frontend:** Next.js 14, TypeScript, Tailwind CSS
- **Backend:** NestJS, Prisma ORM, TypeScript
- **Banco de Dados:** PostgreSQL (Supabase)
- **IA:** Google Gemini

## 🚀 Rodando localmente

### Backend

```bash
cd backend
npm install
# Configure o .env (veja .env.example)
npx prisma db push
npm run start:dev
```

### Frontend

```bash
cd frontend
npm install
# Configure o .env.local (veja .env.example)
npm run dev
```

## ☁️ Deploy

- **Frontend:** Vercel
- **Backend:** Render.com
- **Database:** Supabase (PostgreSQL)
