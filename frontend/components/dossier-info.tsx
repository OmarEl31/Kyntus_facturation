import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface DossierInfoProps {
  dossier: {
    numero: string
    client: string
    montant: number
    statut: string
    dateCreation: string
    dateModification: string
    description?: string
    contact?: string
    email?: string
    telephone?: string
  }
}

export function DossierInfo({ dossier }: DossierInfoProps) {
  const statusConfig: Record<string, { label: string; color: string }> = {
    facturable: { label: "Facturable", color: "bg-green-100 text-green-800" },
    "non-facturable": { label: "Non-facturable", color: "bg-red-100 text-red-800" },
    conditionnel: { label: "Conditionnel", color: "bg-yellow-100 text-yellow-800" },
  }

  const statusInfo = statusConfig[dossier.statut] || { label: "Inconnu", color: "bg-gray-100 text-gray-800" }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Main Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Informations principales</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Numéro de dossier</p>
            <p className="font-semibold">{dossier.numero}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Client</p>
            <p className="font-semibold">{dossier.client}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Montant</p>
            <p className="font-semibold text-lg">
              {dossier.montant.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Statut</p>
            <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Contact Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Informations de contact</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Contact</p>
            <p className="font-semibold">{dossier.contact || "Non spécifié"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Email</p>
            <p className="font-semibold">{dossier.email || "Non spécifié"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Téléphone</p>
            <p className="font-semibold">{dossier.telephone || "Non spécifié"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Créé le</p>
            <p className="font-semibold">{new Date(dossier.dateCreation).toLocaleDateString("fr-FR")}</p>
          </div>
        </CardContent>
      </Card>

      {/* Description */}
      {dossier.description && (
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-foreground">{dossier.description}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
