import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "LeanPulse — Ambiente Acadêmico - Seguro e Anti-Fraude",
  description: "Plataforma Acadêmica de Avaliações, Atividades, Monitoramento e Muito Mais em Tempo Real.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${montserrat.className} h-full`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
