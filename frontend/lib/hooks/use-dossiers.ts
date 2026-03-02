import { useDossiersStore } from "@/lib/stores/dossiers-store"
import { useNotificationStore } from "@/lib/stores/notification-store"

export function useDossiers() {
  const store = useDossiersStore()
  const addNotification = useNotificationStore((state) => state.addNotification)

  const handleFetchDossiers = async (filters?: any) => {
    try {
      await store.fetchDossiers(filters)
      addNotification({
        type: "success",
        message: "Dossiers chargés avec succès",
      })
    } catch (error: any) {
      addNotification({
        type: "error",
        message: error.message || "Erreur lors du chargement",
      })
    }
  }

  const handleCreateDossier = async (dossier: any) => {
    try {
      await store.createDossier(dossier)
      addNotification({
        type: "success",
        message: "Dossier créé avec succès",
      })
    } catch (error: any) {
      addNotification({
        type: "error",
        message: error.message || "Erreur lors de la création",
      })
    }
  }

  const handleUpdateDossier = async (id: string, updates: any) => {
    try {
      await store.updateDossier(id, updates)
      addNotification({
        type: "success",
        message: "Dossier mis à jour avec succès",
      })
    } catch (error: any) {
      addNotification({
        type: "error",
        message: error.message || "Erreur lors de la mise à jour",
      })
    }
  }

  const handleDeleteDossier = async (id: string) => {
    try {
      await store.deleteDossier(id)
      addNotification({
        type: "success",
        message: "Dossier supprimé avec succès",
      })
    } catch (error: any) {
      addNotification({
        type: "error",
        message: error.message || "Erreur lors de la suppression",
      })
    }
  }

  return {
    ...store,
    fetchDossiers: handleFetchDossiers,
    createDossier: handleCreateDossier,
    updateDossier: handleUpdateDossier,
    deleteDossier: handleDeleteDossier,
  }
}
