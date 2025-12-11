"use client"

import { useEffect, useState } from "react"
import { useStore, type Regle } from "@/lib/store"
import { regleApi } from "@/lib/api"
import { Plus, Edit2, Trash2 } from "lucide-react"

export function ReglesFacturation() {
  const { regles, setRegles, isReadOnly } = useStore()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [newRegle, setNewRegle] = useState<Partial<Regle>>({
    nom: "",
    description: "",
    condition: "",
    action: "",
    actif: true,
    priorite: 0,
  })

  useEffect(() => {
    const fetchRegles = async () => {
      try {
        const response = await regleApi.getAll()
        setRegles(response.data)
      } catch (error) {
        console.error("Erreur lors du chargement des règles:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchRegles()
  }, [setRegles])

  const handleAddRegle = async () => {
    if (!newRegle.nom || !newRegle.condition) {
      alert("Veuillez remplir les champs obligatoires")
      return
    }

    try {
      const response = await regleApi.create(newRegle)
      setRegles([...regles, response.data])
      setNewRegle({
        nom: "",
        description: "",
        condition: "",
        action: "",
        actif: true,
        priorite: 0,
      })
    } catch (error) {
      console.error("Erreur lors de la création:", error)
    }
  }

  const handleDeleteRegle = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette règle ?")) return

    try {
      await regleApi.delete(id)
      setRegles(regles.filter((r) => r.id !== id))
    } catch (error) {
      console.error("Erreur lors de la suppression:", error)
    }
  }

  if (loading) {
    return <div className="text-center py-12">Chargement des règles...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Règles de Facturation</h1>
        <p className="text-gray-600 mt-2">Gestion des règles de facturation</p>
      </div>

      {/* New Regle Form */}
      {!isReadOnly && (
        <div className="card space-y-4">
          <h2 className="text-lg font-bold text-gray-900">Ajouter une Règle</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Nom de la règle"
              value={newRegle.nom || ""}
              onChange={(e) => setNewRegle({ ...newRegle, nom: e.target.value })}
              className="input-field"
            />
            <input
              type="text"
              placeholder="Description"
              value={newRegle.description || ""}
              onChange={(e) => setNewRegle({ ...newRegle, description: e.target.value })}
              className="input-field"
            />
            <input
              type="text"
              placeholder="Condition"
              value={newRegle.condition || ""}
              onChange={(e) => setNewRegle({ ...newRegle, condition: e.target.value })}
              className="input-field"
            />
            <input
              type="text"
              placeholder="Action"
              value={newRegle.action || ""}
              onChange={(e) => setNewRegle({ ...newRegle, action: e.target.value })}
              className="input-field"
            />
            <input
              type="number"
              placeholder="Priorité"
              value={newRegle.priorite || 0}
              onChange={(e) => setNewRegle({ ...newRegle, priorite: Number.parseInt(e.target.value) })}
              className="input-field"
            />
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={newRegle.actif || false}
                onChange={(e) => setNewRegle({ ...newRegle, actif: e.target.checked })}
                className="w-4 h-4"
              />
              <span className="text-gray-700">Actif</span>
            </label>
          </div>
          <button onClick={handleAddRegle} className="btn-primary flex items-center gap-2">
            <Plus size={20} />
            Ajouter la Règle
          </button>
        </div>
      )}

      {/* Regles Table */}
      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">Nom</th>
              <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">Description</th>
              <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">Condition</th>
              <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">Priorité</th>
              <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">Statut</th>
              <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {regles.map((regle) => (
              <tr key={regle.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="py-4 px-6 font-medium text-gray-900">{regle.nom}</td>
                <td className="py-4 px-6 text-sm text-gray-600">{regle.description}</td>
                <td className="py-4 px-6 text-sm text-gray-600">{regle.condition}</td>
                <td className="py-4 px-6 text-sm text-gray-600">{regle.priorite}</td>
                <td className="py-4 px-6">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      regle.actif ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {regle.actif ? "Actif" : "Inactif"}
                  </span>
                </td>
                <td className="py-4 px-6 flex gap-2">
                  {!isReadOnly && (
                    <>
                      <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <Edit2 size={16} className="text-gray-600" />
                      </button>
                      <button
                        onClick={() => handleDeleteRegle(regle.id)}
                        className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} className="text-red-600" />
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
