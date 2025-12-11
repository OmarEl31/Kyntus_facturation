"use client"

import { useState } from "react"
import { Plus, Edit2, Trash2, MapPin, Users } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface Agency {
  id: string
  nom: string
  code: string
  ville: string
  responsable: string
  nombreTechniciens: number
  nombreDossiers: number
}

export function AgenciesTab() {
  const [agencies, setAgencies] = useState<Agency[]>([
    {
      id: "1",
      nom: "Agence Paris",
      code: "PAR",
      ville: "Paris",
      responsable: "Jean Dupont",
      nombreTechniciens: 12,
      nombreDossiers: 245,
    },
    {
      id: "2",
      nom: "Agence Lyon",
      code: "LYO",
      ville: "Lyon",
      responsable: "Marie Martin",
      nombreTechniciens: 8,
      nombreDossiers: 156,
    },
    {
      id: "3",
      nom: "Agence Marseille",
      code: "MAR",
      ville: "Marseille",
      responsable: "Pierre Bernard",
      nombreTechniciens: 6,
      nombreDossiers: 89,
    },
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Gestion des Agences</h2>
          <p className="text-sm text-muted-foreground mt-1">Gérez les agences et leurs responsables</p>
        </div>
        <Button className="gap-2 bg-accent hover:bg-accent-dark">
          <Plus className="w-4 h-4" />
          Nouvelle Agence
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total des agences</p>
          <p className="text-2xl font-bold mt-1">{agencies.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Techniciens total</p>
          <p className="text-2xl font-bold mt-1">{agencies.reduce((sum, a) => sum + a.nombreTechniciens, 0)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Dossiers total</p>
          <p className="text-2xl font-bold mt-1">{agencies.reduce((sum, a) => sum + a.nombreDossiers, 0)}</p>
        </Card>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted border-b border-border">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-semibold">Nom</th>
                <th className="text-left py-3 px-4 text-sm font-semibold">Code</th>
                <th className="text-left py-3 px-4 text-sm font-semibold">Ville</th>
                <th className="text-left py-3 px-4 text-sm font-semibold">Responsable</th>
                <th className="text-left py-3 px-4 text-sm font-semibold">Techniciens</th>
                <th className="text-left py-3 px-4 text-sm font-semibold">Dossiers</th>
                <th className="text-center py-3 px-4 text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {agencies.map((agency) => (
                <tr key={agency.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                  <td className="py-3 px-4 font-medium">{agency.nom}</td>
                  <td className="py-3 px-4 text-sm">
                    <Badge variant="outline">{agency.code}</Badge>
                  </td>
                  <td className="py-3 px-4 text-sm flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    {agency.ville}
                  </td>
                  <td className="py-3 px-4 text-sm">{agency.responsable}</td>
                  <td className="py-3 px-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      {agency.nombreTechniciens}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm font-medium text-accent">{agency.nombreDossiers}</td>
                  <td className="py-3 px-4 flex gap-2 justify-center">
                    <Button variant="ghost" size="sm">
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
