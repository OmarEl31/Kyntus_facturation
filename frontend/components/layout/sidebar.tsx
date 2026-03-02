"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useStore } from "@/lib/store"
import { LayoutDashboard, FileText, Settings, BarChart3, Users, LogOut } from "lucide-react"

interface SidebarProps {
  isOpen: boolean
}

export function Sidebar({ isOpen }: SidebarProps) {
  const pathname = usePathname()
  const { userRole } = useStore()

  const menuItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dossiers", label: "Dossiers", icon: FileText },
    { href: "/regles", label: "Règles", icon: Settings },
    { href: "/audit", label: "Audit", icon: BarChart3 },
    ...(userRole === "admin" ? [{ href: "/admin", label: "Administration", icon: Users }] : []),
  ]

  const isActive = (href: string) => pathname === href

  return (
    <aside
      className={`${isOpen ? "w-64" : "w-20"} transition-all duration-300 flex flex-col border-r`}
      style={{
        backgroundColor: "var(--kyntus-primary)",
        color: "white",
        borderColor: "var(--kyntus-primary-dark)",
      }}
    >
      {/* Logo */}
      <div className="p-6 border-b" style={{ borderColor: "var(--kyntus-primary-dark)" }}>
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center font-bold"
            style={{
              backgroundColor: "var(--kyntus-accent)",
              color: "var(--kyntus-primary)",
            }}
          >
            K
          </div>
          {isOpen && <span className="font-bold text-lg">Kyntus</span>}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors"
              style={{
                backgroundColor: active ? "var(--kyntus-primary-light)" : "transparent",
                color: active ? "white" : "var(--kyntus-accent-light)",
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.backgroundColor = "var(--kyntus-primary-dark)"
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.backgroundColor = "transparent"
                }
              }}
            >
              <Icon size={20} />
              {isOpen && <span className="text-sm font-medium">{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t" style={{ borderColor: "var(--kyntus-primary-dark)" }}>
        <button
          className="flex items-center gap-3 px-4 py-3 rounded-lg w-full transition-colors"
          style={{
            color: "var(--kyntus-accent-light)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "var(--kyntus-primary-dark)"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent"
          }}
        >
          <LogOut size={20} />
          {isOpen && <span className="text-sm font-medium">Déconnexion</span>}
        </button>
      </div>
    </aside>
  )
}
