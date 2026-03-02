"use client"

import { useState } from "react"
import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface AuditLog {
  id: string
  timestamp: string
  user: string
  action: string
  entity: string
  entityId: string
  changes: {
    field: string
    oldValue: string
    newValue: string
  }[]
  status: "success" | "error" | "warning"
}

const mockAuditLogs: AuditLog[] = [
  {
    id: "1",
    timestamp: "2024-01-20 14:30:45",
    user: "Jean Dupont",
    action: "Validation",
    entity: "Dossier",
    entityId: "DOS-2024-001",
    changes: [
      { field: "status", oldValue: "CONDITIONNEL", newValue: "FACTURABLE" },
      { field: "validated_by", oldValue: "null", newValue: "Jean Dupont" },
    ],
    status: "success",
  },
  {
    id: "2",
    timestamp: "2024-01-20 13:15:22",
    user: "Marie Martin",
    action: "Modification",
    entity: "Règle",
    entityId: "RULE-005",
    changes: [
      { field: "priority", oldValue: "5", newValue: "8" },
      { field: "condition", oldValue: "montant > 50000", newValue: "montant > 75000" },
    ],
    status: "success",
  },
  {
    id: "3",
    timestamp: "2024-01-20 11:45:10",
    user: "Pierre Bernard",
    action: "Rejet",
    entity: "Dossier",
    entityId: "DOS-2024-002",
    changes: [
      { field: "status", oldValue: "FACTURABLE", newValue: "NON_FACTURABLE" },
      { field: "rejection_reason", oldValue: "null", newValue: "Données incomplètes" },
    ],
    status: "warning",
  },
  {
    id: "4",
    timestamp: "2024-01-20 10:20:33",
    user: "Admin System",
    action: "Création",
    entity: "Utilisateur",
    entityId: "USER-156",
    changes: [
      { field: "email", oldValue: "null", newValue: "sophie.durand@kyntus.fr" },
      { field: "role", oldValue: "null", newValue: "Technicien" },
    ],
    status: "success",
  },
  {
    id: "5",
    timestamp: "2024-01-20 09:05:15",
    user: "Luc Moreau",
    action: "Erreur",
    entity: "Dossier",
    entityId: "DOS-2024-003",
    changes: [
      { field: "sync_status", oldValue: "PENDING", newValue: "FAILED" },
      { field: "error_message", oldValue: "null", newValue: "Timeout lors de la synchronisation" },
    ],
    status: "error",
  },
]

export function AuditTimeline() {
  const [logs, setLogs] = useState<AuditLog[]>(mockAuditLogs)
  const [filterAction, setFilterAction] = useState<string>("")
  const [filterEntity, setFilterEntity] = useState<string>("")

  const filteredLogs = logs.filter((log) => {
    if (filterAction && log.action !== filterAction) return false
    if (filterEntity && log.entity !== filterEntity) return false
    return true
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "bg-green-100 text-green-800"
      case "error":
        return "bg-red-100 text-red-800"
      case "warning":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return "✓"
      case "error":
        return "✕"
      case "warning":
        return "!"
      default:
        return "•"
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Audit et Logs</h1>
          <p className="text-muted-foreground mt-2">Historique complet des modifications et actions</p>
        </div>
        <Button className="gap-2">
          <Download className="w-4 h-4" />
          Exporter
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total des logs</p>
          <p className="text-2xl font-bold mt-1">{logs.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Succès</p>
          <p className="text-2xl font-bold mt-1 text-green-600">{logs.filter((l) => l.status === "success").length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Avertissements</p>
          <p className="text-2xl font-bold mt-1 text-yellow-600">{logs.filter((l) => l.status === "warning").length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Erreurs</p>
          <p className="text-2xl font-bold mt-1 text-red-600">{logs.filter((l) => l.status === "error").length}</p>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex gap-4 mb-6">
          <div className="flex-1">
            <label className="text-sm font-medium">Filtrer par action</label>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="w-full mt-2 px-3 py-2 border border-border rounded-lg"
            >
              <option value="">Toutes les actions</option>
              <option value="Validation">Validation</option>
              <option value="Modification">Modification</option>
              <option value="Rejet">Rejet</option>
              <option value="Création">Création</option>
              <option value="Erreur">Erreur</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="text-sm font-medium">Filtrer par entité</label>
            <select
              value={filterEntity}
              onChange={(e) => setFilterEntity(e.target.value)}
              className="w-full mt-2 px-3 py-2 border border-border rounded-lg"
            >
              <option value="">Toutes les entités</option>
              <option value="Dossier">Dossier</option>
              <option value="Règle">Règle</option>
              <option value="Utilisateur">Utilisateur</option>
            </select>
          </div>
        </div>

        <div className="space-y-4">
          {filteredLogs.map((log, index) => (
            <div key={log.id} className="flex gap-4 pb-4 border-b border-border last:border-b-0">
              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${getStatusColor(log.status)}`}
                >
                  {getStatusIcon(log.status)}
                </div>
                {index < filteredLogs.length - 1 && <div className="w-0.5 h-12 bg-border mt-2" />}
              </div>

              <div className="flex-1 pt-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-semibold">{log.action}</span>
                  <Badge variant="outline">{log.entity}</Badge>
                  <Badge className="bg-blue-100 text-blue-800">{log.entityId}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  Par <span className="font-medium">{log.user}</span> le{" "}
                  <span className="font-medium">{log.timestamp}</span>
                </p>

                {log.changes.length > 0 && (
                  <div className="bg-muted p-3 rounded-lg text-sm space-y-1">
                    {log.changes.map((change, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="font-medium text-muted-foreground">{change.field}:</span>
                        <span className="line-through text-red-600">{change.oldValue}</span>
                        <span className="text-green-600">→ {change.newValue}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
