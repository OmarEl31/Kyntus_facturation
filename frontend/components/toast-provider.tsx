"use client"

import { useNotificationStore } from "@/lib/stores/notification-store"
import { useEffect } from "react"

export function ToastProvider() {
  const notifications = useNotificationStore((state) => state.notifications)
  const removeNotification = useNotificationStore((state) => state.removeNotification)

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
      {notifications.map((notification) => (
        <Toast key={notification.id} notification={notification} onClose={() => removeNotification(notification.id)} />
      ))}
    </div>
  )
}

function Toast({
  notification,
  onClose,
}: {
  notification: any
  onClose: () => void
}) {
  useEffect(() => {
    if (notification.duration !== 0) {
      const timer = setTimeout(onClose, notification.duration || 3000)
      return () => clearTimeout(timer)
    }
  }, [notification.duration, onClose])

  const bgColor = {
    success: "bg-green-500",
    error: "bg-red-500",
    warning: "bg-yellow-500",
    info: "bg-blue-500",
  }[notification.type]

  return (
    <div className={`${bgColor} text-white px-4 py-3 rounded-lg shadow-lg fade-in flex items-center justify-between`}>
      <span>{notification.message}</span>
      <button onClick={onClose} className="ml-4 text-white hover:opacity-80 transition-opacity">
        ✕
      </button>
    </div>
  )
}
