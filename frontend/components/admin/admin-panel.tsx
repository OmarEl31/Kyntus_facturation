"use client"

import { UsersTab } from "./users-tab"

export function AdminPanel() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Administration</h1>
        <p className="text-gray-600 mt-2">
          Gestion des utilisateurs
        </p>
      </div>

      <div className="card">
        <UsersTab />
      </div>
    </div>
  )
}