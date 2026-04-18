import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeRoot } from "@/components/theme-root"

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Medly",
  description: "Plataforma de IA para hospitales — panel clínico y seguimiento del paciente.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${inter.className} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <ThemeRoot>{children}</ThemeRoot>
      </body>
    </html>
  );
}
