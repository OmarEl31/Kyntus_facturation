import { useReglesStore } from "@/lib/stores/regles-store"
import { useNotificationStore } from "@/lib/stores/notification-store"

export function useRegles() {
  const store = useReglesStore()
  const addNotification = useNotificationStore((state) => state.addNotification)

  const handleFetchRegles = async () => {
    try {
      await store.fetchRegles()
    } catch (error: any) {
      addNotification({
        type: "error",
        message: error.message || "Erreur",
      })
    }
  }

  const handleCreateRegle = async (regle: any) => {
    try {
      await store.createRegle(regle)
      addNotification({
        type: "success",
        message: "Règle créée avec succès",
      })
    } catch (error: any) {
      addNotification({
        type: "error",
        message: error.message || "Erreur",
      })
    }
  }

  const handleUpdateRegle = async (id: string, updates: any) => {
    try {
      await store.updateRegle(id, updates)
      addNotification({
        type: "success",
        message: "Règle mise à jour",
      })
    } catch (error: any) {
      addNotification({
        type: "error",
        message: error.message || "Erreur",
      })
    }
  }

  const handleDeleteRegle = async (id: string) => {
    try {
      await store.deleteRegle(id)
      addNotification({
        type: "success",
        message: "Règle supprimée",
      })
    } catch (error: any) {
      addNotification({
        type: "error",
        message: error.message || "Erreur",
      })
    }
  }

  const handleToggleRegle = async (id: string) => {
    try {
      await store.toggleRegle(id)
      addNotification({
        type: "success",
        message: "Règle mise à jour",
      })
    } catch (error: any) {
      addNotification({
        type: "error",
        message: error.message || "Erreur",
      })
    }
  }

  return {
    ...store,
    fetchRegles: handleFetchRegles,
    createRegle: handleCreateRegle,
    updateRegle: handleUpdateRegle,
    deleteRegle: handleDeleteRegle,
    toggleRegle: handleToggleRegle,
  }
}
