"use client"

import type React from "react"

import { useState } from "react"

interface Tab {
  id: string
  label: string
  content: React.ReactNode
}

interface DossierTabsProps {
  tabs: Tab[]
}

export function DossierTabs({ tabs }: DossierTabsProps) {
  const [activeTab, setActiveTab] = useState(tabs[0]?.id || "")

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>{tabs.find((tab) => tab.id === activeTab)?.content}</div>
    </div>
  )
}
