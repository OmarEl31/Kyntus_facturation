"use client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { AdminPanel } from "@/components/admin/admin-panel"

export default function AdminPage() {
  return (
    <DashboardLayout>
      <AdminPanel />
    </DashboardLayout>
  )
}
