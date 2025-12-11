"use client"

import { useState } from "react"
import { Plus, Edit2, Trash2, Mail, Phone } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface Technician {
  id: string
  nom: string
  prenom: string
  agence: string
  email: string
  telephone: string
  nombreDossiers: number
  statut: "actif" | "inactif"
}

export function TechniciansTab() {
  const [technicians, setTechnicians] = useState<Technician[]>([
    {
      id: "1",
      nom: "Dupont",
      prenom: "Jean",
      agence: "Paris",
      email: "jean.dupont@kyntus.fr",
      telephone: "06 12 34 56 78",
      nombreDossiers: 45,
      statut: "actif",
    },
    {
      id: "2",
      nom: "Martin",
      prenom: "Marie",
      agence: "Lyon",
      email: "marie.martin@kyntus.fr",
      telephone: "06 87 65 43 21",
      nombreDossiers: 38,
      statut: "actif",
    },
    {
      id: "3",
      nom: "Bernard",
      prenom: "Pierre",
      agence: "Marseille",
      email: "pierre.bernard@kyntus.fr",
      telephone: "06 45 67 89 01",
      nombreDossiers: 22,
      statut: "actif",
    },
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Gestion des Techniciens</h2>
          <p className="text-sm text-muted-foreground mt-1">Gérez les techniciens et leurs affectations</p>
        </div>
        <Button className="gap-2 bg-accent hover:bg-accent-dark">
          <Plus className="w-4 h-4" />
          Nouveau Technicien
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total des techniciens</p>
          <p className="text-2xl font-bold mt-1">{technicians.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Techniciens actifs</p>
          <p className="text-2xl font-bold mt-1 text-green-600">
            {technicians.filter((t) => t.statut === "actif").length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Dossiers assignés</p>
          <p className="text-2xl font-bold mt-1">{technicians.reduce((sum, t) => sum + t.nombreDossiers, 0)}</p>
        </Card>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted border-b border-border">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-semibold">Nom</th>
                <th className="text-left py-3 px-4 text-sm font-semibold">Agence</th>
                <th className="text-left py-3 px-4 text-sm font-semibold">Email</th>
                <th className="text-left py-3 px-4 text-sm font-semibold">Téléphone</th>
                <th className="text-left py-3 px-4 text-sm font-semibold">Dossiers</th>
                <th className="text-left py-3 px-4 text-sm font-semibold">Statut</th>
                <th className="text-center py-3 px-4 text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {technicians.map((tech) => (
                <tr key={tech.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                  <td className="py-3 px-4 font-medium">
                    {tech.prenom} {tech.nom}
                  </td>
                  <td className="py-3 px-4 text-sm">
                    <Badge variant="outline">{tech.agence}</Badge>
                  </td>
                  <td className="py-3 px-4 text-sm flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    {tech.email}
                  </td>
                  <td className="py-3 px-4 text-sm flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    {tech.telephone}
                  </td>
                  <td className="py-3 px-4 text-sm font-medium text-accent">{tech.nombreDossiers}</td>
                  <td className="py-3 px-4 text-sm">
                    <Badge
                      className={tech.statut === "actif" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}
                    >
                      {tech.statut === "actif" ? "Actif" : "Inactif"}
                    </Badge>
                  </td>
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
