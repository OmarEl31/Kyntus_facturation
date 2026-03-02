"use client"

import { BarChart3, FileText, CheckCircle, AlertCircle } from "lucide-react"
import { KPICard } from "@/components/kpi-card"
import { RevenueChart } from "@/components/revenue-chart"
import { StatusDistribution } from "@/components/status-distribution"
import { RecentActivity } from "@/components/recent-activity"

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-2">Bienvenue sur votre tableau de bord de facturation</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total dossiers"
          value="1,234"
          icon={FileText}
          trend={{ value: 12, isPositive: true }}
          color="primary"
        />
        <KPICard
          title="Facturable"
          value="556"
          icon={CheckCircle}
          trend={{ value: 8, isPositive: true }}
          color="success"
        />
        <KPICard
          title="Non-facturable"
          value="370"
          icon={AlertCircle}
          trend={{ value: 3, isPositive: false }}
          color="error"
        />
        <KPICard
          title="En attente"
          value="308"
          icon={BarChart3}
          trend={{ value: 5, isPositive: true }}
          color="warning"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RevenueChart />
        </div>
        <div>
          <StatusDistribution />
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <RecentActivity />
      </div>
    </div>
  )
}
