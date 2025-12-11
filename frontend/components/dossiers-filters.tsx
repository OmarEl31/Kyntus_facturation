"use client"

import { useState } from "react"
import { Search, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"

interface FiltersProps {
  onFilterChange: (filters: FilterState) => void
}

export interface FilterState {
  search: string
  praxedoNumber: string
  pidiNumber: string
  status: string
  dateFrom: string
  dateTo: string
}

export function DossiersFilters({ onFilterChange }: FiltersProps) {
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    praxedoNumber: "",
    pidiNumber: "",
    status: "all",
    dateFrom: "",
    dateTo: "",
  })

  const handleChange = (key: keyof FilterState, value: string) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    onFilterChange(newFilters)
  }

  const handleReset = () => {
    const resetFilters: FilterState = {
      search: "",
      praxedoNumber: "",
      pidiNumber: "",
      status: "all",
      dateFrom: "",
      dateTo: "",
    }
    setFilters(resetFilters)
    onFilterChange(resetFilters)
  }

  return (
    <Card className="p-6 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-5 h-5" />
        <h2 className="text-lg font-semibold">Filtres</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        {/* General Search */}
        <div>
          <label className="block text-sm font-medium mb-2">Recherche générale</label>
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="ID ou nom..."
              value={filters.search}
              onChange={(e) => handleChange("search", e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">N° Praxedo</label>
          <Input
            placeholder="PRX-..."
            value={filters.praxedoNumber}
            onChange={(e) => handleChange("praxedoNumber", e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">N° PIDI</label>
          <Input
            placeholder="PID-..."
            value={filters.pidiNumber}
            onChange={(e) => handleChange("pidiNumber", e.target.value)}
          />
        </div>

        {/* Status Filter */}
        <div>
          <label className="block text-sm font-medium mb-2">Statut</label>
          <select
            value={filters.status}
            onChange={(e) => handleChange("status", e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">Tous</option>
            <option value="facturable">Facturable</option>
            <option value="non-facturable">Non-facturable</option>
            <option value="conditionnel">Conditionnel</option>
          </select>
        </div>

        {/* Date From */}
        <div>
          <label className="block text-sm font-medium mb-2">Du</label>
          <Input type="date" value={filters.dateFrom} onChange={(e) => handleChange("dateFrom", e.target.value)} />
        </div>

        {/* Date To */}
        <div>
          <label className="block text-sm font-medium mb-2">Au</label>
          <Input type="date" value={filters.dateTo} onChange={(e) => handleChange("dateTo", e.target.value)} />
        </div>

        {/* Reset Button */}
        <div className="flex items-end">
          <Button variant="outline" onClick={handleReset} className="w-full bg-transparent">
            Réinitialiser
          </Button>
        </div>
      </div>
    </Card>
  )
}
