import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Controlo de Ponto | ANL Metalúrgica Lda",
  description: "Sistema de controlo de ponto da ANL Metalúrgica Lda",
  applicationName: "ANL Controlo de Ponto",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-PT">
      <body>{children}</body>
    </html>
  );
}
