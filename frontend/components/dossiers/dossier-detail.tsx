"use client"

import { useEffect, useState } from "react"
import { useStore, type Dossier } from "@/lib/store"
import { dossierApi, logApi } from "@/lib/api"
import type { LogEntry } from "@/lib/store"
import { ArrowLeft, Edit2, X } from "lucide-react"
import Link from "next/link"

interface DossierDetailProps {
  dossierId: string
}

export function DossierDetail({ dossierId }: DossierDetailProps) {
  const { isReadOnly } = useStore()
  const [dossier, setDossier] = useState<Dossier | null>(null)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dossierRes, logsRes] = await Promise.all([dossierApi.getById(dossierId), logApi.getByDossier(dossierId)])
        setDossier(dossierRes.data)
        setLogs(logsRes.data)
      } catch (error) {
        console.error("Erreur lors du chargement:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [dossierId])

  if (loading) {
    return <div className="text-center py-12">Chargement...</div>
  }

  if (!dossier) {
    return <div className="text-center py-12">Dossier non trouvé</div>
  }

  const getStatutBadge = (statut: string) => {
    switch (statut) {
      case "FACTURABLE":
        return "badge-facturable"
      case "NON_FACTURABLE":
        return "badge-non-facturable"
      case "CONDITIONNEL":
        return "badge-conditionnel"
      default:
        return ""
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dossiers" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft size={20} className="text-gray-600" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dossier {dossier.numero}</h1>
            <p className="text-gray-600 mt-1">Détails et historique</p>
          </div>
        </div>
        {!isReadOnly && (
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={`flex items-center gap-2 ${isEditing ? "btn-secondary" : "btn-primary"}`}
          >
            {isEditing ? (
              <>
                <X size={20} />
                Annuler
              </>
            ) : (
              <>
                <Edit2 size={20} />
                Modifier
              </>
            )}
          </button>
        )}
      </div>

      {/* Main Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-semibold text-gray-600">Numéro</label>
              <p className="text-lg font-medium text-gray-900 mt-1">{dossier.numero}</p>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-600">Source</label>
              <p className="text-lg font-medium text-gray-900 mt-1">{dossier.source}</p>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-600">Agence</label>
              <p className="text-lg font-medium text-gray-900 mt-1">{dossier.agence}</p>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-600">Technicien</label>
              <p className="text-lg font-medium text-gray-900 mt-1">{dossier.technicien}</p>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-600">Montant</label>
              <p className="text-lg font-medium text-gray-900 mt-1">{dossier.montant.toFixed(2)} €</p>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-600">Statut</label>
              <div className="mt-1">
                <span className={getStatutBadge(dossier.statut)}>{dossier.statut}</span>
              </div>
            </div>
          </div>

          {dossier.notes && (
            <div>
              <label className="text-sm font-semibold text-gray-600">Notes</label>
              <p className="text-gray-700 mt-2">{dossier.notes}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">Informations</h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-gray-600">Créé le</p>
                <p className="font-medium text-gray-900">
                  {new Date(dossier.dateCreation).toLocaleDateString("fr-FR")}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Modifié le</p>
                <p className="font-medium text-gray-900">
                  {new Date(dossier.dateModification).toLocaleDateString("fr-FR")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Règles Appliquées */}
      <div className="card">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Règles Appliquées</h2>
        <div className="space-y-2">
          {dossier.reglesAppliquees.length > 0 ? (
            dossier.reglesAppliquees.map((regle, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <span className="text-gray-700">{regle}</span>
              </div>
            ))
          ) : (
            <p className="text-gray-600">Aucune règle appliquée</p>
          )}
        </div>
      </div>

      {/* Logs */}
      <div className="card">
        <h2 className="text-lg font-bold text-gray-900 mb-6">Historique</h2>
        <div className="space-y-4">
          {logs.map((log) => (
            <div key={log.id} className="flex gap-4 pb-4 border-b border-gray-200 last:border-b-0">
              <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-gray-900">{log.action}</p>
                  <span className="text-sm text-gray-500">{new Date(log.timestamp).toLocaleString("fr-FR")}</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{log.details}</p>
                <p className="text-xs text-gray-500 mt-1">Par {log.utilisateur}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
