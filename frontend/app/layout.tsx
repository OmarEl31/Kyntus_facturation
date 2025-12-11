import type { Metadata } from "next";
import { Inter, Roboto_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/toast-provider";
import Sidebar from "@/components/sidebar";

const inter = Inter({ 
  subsets: ["latin"], 
  variable: "--font-inter",
  display: 'swap',
});

const robotoMono = Roboto_Mono({ 
  subsets: ["latin"], 
  variable: "--font-roboto",
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Kyntus Facturation",
  description: "Plateforme interne de gestion et d'automatisation de la facturation Orange / Kyntus",
  generator: "v0.app",
  viewport: "width=device-width, initial-scale=1",
  themeColor: "#1e3a5f",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${robotoMono.variable} font-sans antialiased bg-background text-foreground selection:bg-[color:var(--kyntus-accent-light)] selection:text-[color:var(--kyntus-primary-dark)]`}
      >
        {/* Layout principal avec sidebar */}
        <div className="flex h-screen overflow-hidden">
          {/* Sidebar collapsible */}
          <Sidebar />
          
          {/* Zone de contenu principale */}
          <main className="flex-1 overflow-auto bg-gray-50">
            <div className="h-full">
              {children}
            </div>
          </main>
        </div>

        {/* Toasts / notifications */}
        <ToastProvider />
      </body>
    </html>
  );
}