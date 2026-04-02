"use client";

import "./globals.css";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { MainLayout } from "../components/main-layout";

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  const pathname = usePathname();

  const noLayoutRoutes = ["/auth", "/login"];
  const shouldHideLayout = noLayoutRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  return (
    <html lang="fr">
      <body>
        {shouldHideLayout ? children : <MainLayout>{children}</MainLayout>}
      </body>
    </html>
  );
}