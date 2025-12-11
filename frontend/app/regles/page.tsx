"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { RulesTable } from "@/components/rules-table"
import { RuleForm, type RuleFormData } from "@/components/rule-form"

interface Rule extends RuleFormData {
  id: string
  isActive: boolean
  createdAt: string
}

// Mock data
const mockRules: Rule[] = [
  {
    id: "1",
    name: "Montant minimum",
    description: "Les dossiers avec un montant inférieur à 1000 EUR sont marqués comme non-facturables",
    condition: "montant < 1000",
    action: "non-facturable",
    priority: 10,
    isActive: true,
    createdAt: "2024-01-10",
  },
  {
    id: "2",
    name: "Informations complètes",
    description: "Les dossiers sans informations de contact sont marqués comme conditionnels",
    condition: "contact == null OR email == null",
    action: "conditionnel",
    priority: 8,
    isActive: true,
    createdAt: "2024-01-12",
  },
  {
    id: "3",
    name: "Délai de traitement",
    description: "Les dossiers non traités après 7 jours génèrent une alerte",
    condition: "days_since_creation > 7",
    action: "alert",
    priority: 5,
    isActive: true,
    createdAt: "2024-01-15",
  },
  {
    id: "4",
    name: "Montant élevé",
    description: "Les dossiers avec un montant supérieur à 50000 EUR demandent une révision",
    condition: "montant > 50000",
    action: "review",
    priority: 9,
    isActive: false,
    createdAt: "2024-01-18",
  },
]

export default function ReglesPage() {
  const [rules, setRules] = useState<Rule[]>(mockRules)
  const [showForm, setShowForm] = useState(false)
  const [editingRule, setEditingRule] = useState<Rule | null>(null)

  const handleAddRule = (formData: RuleFormData) => {
    if (editingRule) {
      setRules(rules.map((r) => (r.id === editingRule.id ? { ...r, ...formData } : r)))
      setEditingRule(null)
    } else {
      const newRule: Rule = {
        id: Date.now().toString(),
        ...formData,
        isActive: true,
        createdAt: new Date().toISOString().split("T")[0],
      }
      setRules([...rules, newRule])
    }
    setShowForm(false)
  }

  const handleEditRule = (rule: Rule) => {
    setEditingRule(rule)
    setShowForm(true)
  }

  const handleDeleteRule = (id: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer cette règle ?")) {
      setRules(rules.filter((r) => r.id !== id))
    }
  }

  const handleToggleRule = (id: string, isActive: boolean) => {
    setRules(rules.map((r) => (r.id === id ? { ...r, isActive } : r)))
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingRule(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Règles de facturation</h1>
          <p className="text-muted-foreground mt-2">Gérez les règles automatiques de classification des dossiers</p>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Nouvelle règle
          </Button>
        )}
      </div>

      {/* Form */}
      {showForm && <RuleForm onSubmit={handleAddRule} onCancel={handleCancel} initialData={editingRule || undefined} />}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Total des règles</p>
          <p className="text-2xl font-bold mt-1">{rules.length}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Règles actives</p>
          <p className="text-2xl font-bold mt-1 text-green-600">{rules.filter((r) => r.isActive).length}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Règles inactives</p>
          <p className="text-2xl font-bold mt-1 text-gray-600">{rules.filter((r) => !r.isActive).length}</p>
        </div>
      </div>

      {/* Table */}
      <RulesTable rules={rules} onEdit={handleEditRule} onDelete={handleDeleteRule} onToggle={handleToggleRule} />
    </div>
  )
}
