"use client"

import type React from "react"

import { useState } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"

interface RuleFormProps {
  onSubmit: (rule: RuleFormData) => void
  onCancel: () => void
  initialData?: RuleFormData
}

export interface RuleFormData {
  name: string
  description: string
  condition: string
  action: string
  priority: number
}

export function RuleForm({ onSubmit, onCancel, initialData }: RuleFormProps) {
  const [formData, setFormData] = useState<RuleFormData>(
    initialData || {
      name: "",
      description: "",
      condition: "",
      action: "facturable",
      priority: 1,
    },
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <Card className="p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">{initialData ? "Modifier la règle" : "Créer une nouvelle règle"}</h2>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium mb-2">Nom de la règle</label>
          <Input
            placeholder="Ex: Montant minimum"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium mb-2">Description</label>
          <textarea
            placeholder="Décrivez ce que fait cette règle..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            rows={3}
            required
          />
        </div>

        {/* Condition */}
        <div>
          <label className="block text-sm font-medium mb-2">Condition</label>
          <Input
            placeholder="Ex: montant > 1000"
            value={formData.condition}
            onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
            required
          />
          <p className="text-xs text-muted-foreground mt-1">Entrez la condition à évaluer</p>
        </div>

        {/* Action */}
        <div>
          <label className="block text-sm font-medium mb-2">Action</label>
          <select
            value={formData.action}
            onChange={(e) => setFormData({ ...formData, action: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="facturable">Marquer comme Facturable</option>
            <option value="non-facturable">Marquer comme Non-facturable</option>
            <option value="conditionnel">Marquer comme Conditionnel</option>
            <option value="alert">Créer une alerte</option>
            <option value="review">Demander une révision</option>
          </select>
        </div>

        {/* Priority */}
        <div>
          <label className="block text-sm font-medium mb-2">Priorité</label>
          <Input
            type="number"
            min="1"
            max="100"
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: Number.parseInt(e.target.value) })}
            required
          />
          <p className="text-xs text-muted-foreground mt-1">
            Les règles avec une priorité plus élevée sont exécutées en premier
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-4">
          <Button type="submit" className="flex-1">
            {initialData ? "Mettre à jour" : "Créer la règle"}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1 bg-transparent">
            Annuler
          </Button>
        </div>
      </form>
    </Card>
  )
}
