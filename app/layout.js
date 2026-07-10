import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Pedidos de Comidas",
  description: "Gestión de pedidos de empanadas y arepas por encargo",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
          <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <Link href="/" className="text-lg font-bold text-orange-600">
              🫓 Pedidos
            </Link>
            <div className="flex gap-2 text-sm font-medium">
              <Link
                href="/"
                className="rounded-lg px-3 py-2 text-slate-600 hover:bg-orange-50"
              >
                Dashboard
              </Link>
              <Link
                href="/nuevo"
                className="rounded-lg bg-orange-600 px-3 py-2 text-white hover:bg-orange-700"
              >
                + Nuevo pedido
              </Link>
            </div>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
          {children}
        </main>
      </body>
    </html>
  );
}
