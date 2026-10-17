import type { Metadata, Viewport } from "next";
import { Fredoka } from "next/font/google";
import "./globals.css";

const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Concurso de Fantasias 🎭",
  description: "Cadastre sua fantasia e vote na melhor da festa!",
};

export const viewport: Viewport = {
  themeColor: "#3b0764",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${fredoka.variable} antialiased`}>
      <body>{children}</body>
    </html>
  );
}
