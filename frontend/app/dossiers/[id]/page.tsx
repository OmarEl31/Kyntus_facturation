"use client"

import { useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Edit, CheckCircle, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { DossierTabs } from "@/components/dossier-tabs"
import { DossierInfo } from "@/components/dossier-info"
import { DossierRules } from "@/components/dossier-rules"
import { DossierLogs } from "@/components/dossier-logs"

// Mock data
const mockDossier = {
  numero: "#2024-001",
  client: "Entreprise A",
  montant: 5000,
  statut: "facturable",
  dateCreation: "2024-01-15",
  dateModification: "2024-01-20",
  description: "Dossier de facturation pour les services rendus en janvier 2024",
  contact: "Jean Dupont",
  email: "jean.dupont@entreprisea.com",
  telephone: "+33 1 23 45 67 89",
}

const mockRules = [
  {
    id: "1",
    name: "Montant minimum",
    description: "Le montant doit être supérieur à 1000 EUR",
    status: "passed" as const,
    details: "Montant: 5000 EUR ✓",
  },
  {
    id: "2",
    name: "Informations client complètes",
    description: "Tous les champs client doivent être remplis",
    status: "passed" as const,
    details: "Contact, email et téléphone présents ✓",
  },
  {
    id: "3",
    name: "Délai de traitement",
    description: "Le dossier doit être traité dans les 5 jours",
    status: "warning" as const,
    details: "5 jours écoulés - À vérifier",
  },
  {
    id: "4",
    name: "Validation comptable",
    description: "Dossier validé par le département comptable",
    status: "passed" as const,
    details: "Validé par Marie Martin le 20/01/2024",
  },
]

const mockLogs = [
  {
    id: "1",
    action: "Statut changé en Facturable",
    user: "Marie Martin",
    timestamp: "2024-01-20T14:30:00",
    details: "Dossier approuvé après vérification comptable",
    type: "success" as const,
  },
  {
    id: "2",
    action: "Dossier créé",
    user: "Jean Dupont",
    timestamp: "2024-01-15T09:15:00",
    details: "Dossier initial créé dans le système",
    type: "info" as const,
  },
  {
    id: "3",
    action: "Révision demandée",
    user: "Pierre Bernard",
    timestamp: "2024-01-18T11:45:00",
    details: "Informations client incomplètes - Révision nécessaire",
    type: "warning" as const,
  },
]

export default function DossierDetailPage() {
  const params = useParams()
  const id = params.id

  const tabs = [
    {
      id: "info",
      label: "Informations",
      content: <DossierInfo dossier={mockDossier} />,
    },
    {
      id: "rules",
      label: "Règles appliquées",
      content: <DossierRules rules={mockRules} />,
    },
    {
      id: "logs",
      label: "Historique",
      content: <DossierLogs logs={mockLogs} />,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dossiers">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{mockDossier.numero}</h1>
            <p className="text-muted-foreground mt-1">{mockDossier.client}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2 bg-transparent">
            <Edit className="w-4 h-4" />
            Modifier
          </Button>
          <Button className="gap-2 bg-green-600 hover:bg-green-700">
            <CheckCircle className="w-4 h-4" />
            Valider
          </Button>
          <Button variant="destructive" className="gap-2">
            <XCircle className="w-4 h-4" />
            Rejeter
          </Button>
        </div>
      </div>

      {/* Status Card */}
      <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Statut actuel</p>
            <p className="text-2xl font-bold text-green-600">Facturable</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Montant</p>
            <p className="text-2xl font-bold">
              {mockDossier.montant.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
            </p>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <DossierTabs tabs={tabs} />
    </div>
  )
}
