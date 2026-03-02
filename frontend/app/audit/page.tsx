"use client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { AuditTimeline } from "@/components/audit/audit-timeline"

export default function AuditPage() {
  return (
    <DashboardLayout>
      <AuditTimeline />
    </DashboardLayout>
  )
}
