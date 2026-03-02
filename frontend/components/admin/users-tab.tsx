"use client"

import { useState } from "react"
import { Plus, Edit2, Trash2, Shield } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface AdminUser {
  id: string
  nom: string
  email: string
  role: "admin" | "user" | "viewer"
  statut: "actif" | "inactif"
  dateCreation: string
  derniereConnexion: string
}

export function UsersTab() {
  const [users, setUsers] = useState<AdminUser[]>([
    {
      id: "1",
      nom: "Admin User",
      email: "admin@kyntus.fr",
      role: "admin",
      statut: "actif",
      dateCreation: "2024-01-01",
      derniereConnexion: "2024-01-20 14:30",
    },
    {
      id: "2",
      nom: "User Standard",
      email: "user@kyntus.fr",
      role: "user",
      statut: "actif",
      dateCreation: "2024-01-05",
      derniereConnexion: "2024-01-20 13:15",
    },
    {
      id: "3",
      nom: "Viewer User",
      email: "viewer@kyntus.fr",
      role: "viewer",
      statut: "actif",
      dateCreation: "2024-01-10",
      derniereConnexion: "2024-01-19 10:45",
    },
  ])

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-purple-100 text-purple-800"
      case "user":
        return "bg-blue-100 text-blue-800"
      case "viewer":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "admin":
        return "Administrateur"
      case "user":
        return "Utilisateur"
      case "viewer":
        return "Lecteur"
      default:
        return role
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Gestion des Utilisateurs</h2>
          <p className="text-sm text-muted-foreground mt-1">Gérez les utilisateurs et leurs permissions</p>
        </div>
        <Button className="gap-2 bg-accent hover:bg-accent-dark">
          <Plus className="w-4 h-4" />
          Nouvel Utilisateur
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total des utilisateurs</p>
          <p className="text-2xl font-bold mt-1">{users.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Administrateurs</p>
          <p className="text-2xl font-bold mt-1 text-purple-600">{users.filter((u) => u.role === "admin").length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Utilisateurs actifs</p>
          <p className="text-2xl font-bold mt-1 text-green-600">{users.filter((u) => u.statut === "actif").length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Utilisateurs inactifs</p>
          <p className="text-2xl font-bold mt-1 text-gray-600">{users.filter((u) => u.statut === "inactif").length}</p>
        </Card>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted border-b border-border">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-semibold">Nom</th>
                <th className="text-left py-3 px-4 text-sm font-semibold">Email</th>
                <th className="text-left py-3 px-4 text-sm font-semibold">Rôle</th>
                <th className="text-left py-3 px-4 text-sm font-semibold">Statut</th>
                <th className="text-left py-3 px-4 text-sm font-semibold">Créé le</th>
                <th className="text-left py-3 px-4 text-sm font-semibold">Dernière connexion</th>
                <th className="text-center py-3 px-4 text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                  <td className="py-3 px-4 font-medium flex items-center gap-2">
                    {user.role === "admin" ? (
                      <Shield className="w-4 h-4 text-purple-600" />
                    ) : (
                      <Plus className="w-4 h-4 text-blue-600" />
                    )}
                    {user.nom}
                  </td>
                  <td className="py-3 px-4 text-sm">{user.email}</td>
                  <td className="py-3 px-4 text-sm">
                    <Badge className={getRoleColor(user.role)}>{getRoleLabel(user.role)}</Badge>
                  </td>
                  <td className="py-3 px-4 text-sm">
                    <Badge
                      className={user.statut === "actif" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}
                    >
                      {user.statut === "actif" ? "Actif" : "Inactif"}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-sm text-muted-foreground">{user.dateCreation}</td>
                  <td className="py-3 px-4 text-sm text-muted-foreground">{user.derniereConnexion}</td>
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
