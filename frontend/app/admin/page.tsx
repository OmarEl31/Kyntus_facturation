"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAdmin, getToken } from "@/lib/auth";
import { AdminPanel } from "@/components/admin/admin-panel";

export default function AdminPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = getToken();

    if (!token) {
      router.replace("/");
      return;
    }

    if (!isAdmin()) {
      router.replace("/");
      return;
    }

    setReady(true);
  }, [router]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center text-orange-600 text-lg">
        Chargement...
      </div>
    );
  }

  return (
    <div className="p-6">
      <AdminPanel />
    </div>
  );
}