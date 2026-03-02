"use client"

import { useStore } from "@/lib/store"
import { Menu, Bell } from "lucide-react"

interface HeaderProps {
  onMenuClick: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const { userRole, isReadOnly } = useStore()

  return (
    <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <button onClick={onMenuClick} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <Menu size={20} className="text-gray-600" />
        </button>
        <h1 className="text-2xl font-bold text-primary">Kyntus Facturation</h1>
      </div>

      <div className="flex items-center gap-6">
        {isReadOnly && (
          <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
            Mode Lecture Seule
          </span>
        )}

        <div className="flex items-center gap-4">
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative">
            <Bell size={20} className="text-gray-600" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-accent rounded-full"></span>
          </button>

          <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">Admin User</p>
              <p className="text-xs text-gray-500">{userRole === "admin" ? "Administrateur" : "Utilisateur"}</p>
            </div>
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold">
              A
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
