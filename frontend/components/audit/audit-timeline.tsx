"use client"

import { useEffect, useState } from "react"
import { useStore, type LogEntry } from "@/lib/store"
import { logApi } from "@/lib/api"
import { Calendar, User, FileText } from "lucide-react"

export function AuditTimeline() {
  const { logs } = useStore()
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([])
  const [actionFilter, setActionFilter] = useState<string>("ALL")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response = await logApi.getAll()
        setFilteredLogs(response.data)
      } catch (error) {
        console.error("Erreur lors du chargement des logs:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchLogs()
  }, [])

  useEffect(() => {
    let filtered = filteredLogs

    if (actionFilter !== "ALL") {
      filtered = filtered.filter((log) => log.action === actionFilter)
    }

    setFilteredLogs(filtered)
  }, [actionFilter])

  if (loading) {
    return <div className="text-center py-12">Chargement de l'audit...</div>
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case "CREATE":
        return "bg-green-100 text-green-800"
      case "UPDATE":
        return "bg-blue-100 text-blue-800"
      case "DELETE":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Audit & Logs</h1>
        <p className="text-gray-600 mt-2">Historique complet des modifications</p>
      </div>

      {/* Filters */}
      <div className="card">
        <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="input-field">
          <option value="ALL">Toutes les actions</option>
          <option value="CREATE">Créations</option>
          <option value="UPDATE">Modifications</option>
          <option value="DELETE">Suppressions</option>
        </select>
      </div>

      {/* Timeline */}
      <div className="card">
        <div className="space-y-6">
          {filteredLogs.map((log, idx) => (
            <div key={log.id} className="flex gap-6">
              {/* Timeline Line */}
              <div className="flex flex-col items-center">
                <div className="w-4 h-4 bg-primary rounded-full border-4 border-white"></div>
                {idx !== filteredLogs.length - 1 && <div className="w-1 h-16 bg-gray-200 mt-2"></div>}
              </div>

              {/* Content */}
              <div className="flex-1 pb-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getActionColor(log.action)}`}
                      >
                        {log.action}
                      </span>
                      <p className="font-semibold text-gray-900">{log.details}</p>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <User size={16} />
                        {log.utilisateur}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar size={16} />
                        {new Date(log.timestamp).toLocaleString("fr-FR")}
                      </span>
                      {log.dossierId && (
                        <span className="flex items-center gap-1">
                          <FileText size={16} />
                          Dossier {log.dossierId}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
