"use client"

import { Edit, Trash2, ToggleLeft, ToggleRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface Rule {
  id: string
  name: string
  description: string
  condition: string
  action: string
  priority: number
  isActive: boolean
  createdAt: string
}

interface RulesTableProps {
  rules: Rule[]
  onEdit: (rule: Rule) => void
  onDelete: (id: string) => void
  onToggle: (id: string, isActive: boolean) => void
}

export function RulesTable({ rules, onEdit, onDelete, onToggle }: RulesTableProps) {
  if (rules.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">Aucune règle créée. Commencez par en ajouter une.</p>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted border-b border-border">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold">Nom</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Description</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Condition</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Action</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Priorité</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Statut</th>
              <th className="px-6 py-3 text-center text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((rule) => (
              <tr key={rule.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                <td className="px-6 py-4 text-sm font-medium">{rule.name}</td>
                <td className="px-6 py-4 text-sm text-muted-foreground">{rule.description}</td>
                <td className="px-6 py-4 text-sm">
                  <code className="bg-muted px-2 py-1 rounded text-xs">{rule.condition}</code>
                </td>
                <td className="px-6 py-4 text-sm">
                  <Badge variant="outline">{rule.action}</Badge>
                </td>
                <td className="px-6 py-4 text-sm">
                  <Badge className="bg-blue-100 text-blue-800">{rule.priority}</Badge>
                </td>
                <td className="px-6 py-4 text-sm">
                  <Badge className={rule.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                    {rule.isActive ? "Actif" : "Inactif"}
                  </Badge>
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onToggle(rule.id, !rule.isActive)}
                      title={rule.isActive ? "Désactiver" : "Activer"}
                    >
                      {rule.isActive ? (
                        <ToggleRight className="w-4 h-4 text-green-600" />
                      ) : (
                        <ToggleLeft className="w-4 h-4 text-gray-400" />
                      )}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => onEdit(rule)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => onDelete(rule.id)}>
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
