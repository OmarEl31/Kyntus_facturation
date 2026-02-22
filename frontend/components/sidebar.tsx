'use client';

import React, { useState } from 'react';
import { LayoutDashboard, FileText, Settings, BarChart3, LogOut, Menu, DownloadCloud } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';

interface MenuItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
}

export default function Sidebar() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const menuItems: MenuItem[] = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
    { icon: FileText, label: 'Dossiers', href: '/dossiers' },
    { icon: Settings, label: 'Règles de facturation', href: '/regles' },
    { icon: BarChart3, label: 'Audit', href: '/audit' },
    { icon: DownloadCloud, label: 'Scraper Praxedo', href: '/scraper' },
  ];

  const handleNavigation = (href: string) => {
    router.push(href);
  };

  const handleLogout = () => {
    router.push('/login');
  };

  const open = isExpanded || isPinned;

  return (
    <aside
      className={`bg-white border-r border-gray-200 transition-all duration-300 ease-in-out flex flex-col relative shadow-lg h-screen flex-shrink-0 ${
        open ? 'w-72' : 'w-20'
      }`}
      onMouseEnter={() => !isPinned && setIsExpanded(true)}
      onMouseLeave={() => !isPinned && setIsExpanded(false)}
    >
      <div className="p-4 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#1e3a5f] to-[#2d5a8c] flex items-center justify-center flex-shrink-0 shadow-md">
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M2 17L12 22L22 17" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M2 12L12 17L22 12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            <div className={`transition-all duration-300 overflow-hidden ${open ? 'opacity-100 w-auto' : 'opacity-0 w-0'}`}>
              <h1 className="text-xl font-bold text-[#1e3a5f] whitespace-nowrap">Kyntus</h1>
              <p className="text-sm text-gray-600 whitespace-nowrap">Facturation</p>
            </div>
          </div>

          {open && (
            <button
              onClick={() => setIsPinned(!isPinned)}
              className={`p-1.5 rounded-lg transition-all duration-200 hover:bg-gray-100 ${
                isPinned ? 'text-[#ff8c42]' : 'text-gray-400'
              }`}
              type="button"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className={`mt-3 transition-all duration-300 overflow-hidden ${open ? 'opacity-100 max-h-10' : 'opacity-0 max-h-0'}`}>
          <div className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-orange-100 to-orange-50 border border-orange-200">
            <p className="text-sm font-medium text-[#ff8c42] whitespace-nowrap">Partenaire Orange</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {menuItems.map((item, index) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <button
              key={index}
              onClick={() => handleNavigation(item.href)}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 group relative ${
                isActive
                  ? 'bg-gradient-to-r from-[#1e3a5f] to-[#2d5a8c] text-white shadow-md'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              title={!open ? item.label : undefined}
              type="button"
            >
              <Icon
                className={`w-5 h-5 flex-shrink-0 transition-colors ${
                  isActive ? 'text-white' : 'text-gray-600 group-hover:text-[#1e3a5f]'
                }`}
              />
              <span className={`font-medium whitespace-nowrap transition-all duration-300 overflow-hidden ${open ? 'opacity-100 w-auto' : 'opacity-0 w-0'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="p-3 border-t border-gray-200 flex-shrink-0">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-all duration-200 group relative"
          type="button"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          <span className={`font-medium whitespace-nowrap transition-all duration-300 overflow-hidden ${open ? 'opacity-100 w-auto' : 'opacity-0 w-0'}`}>
            Déconnexion
          </span>
        </button>
      </div>
    </aside>
  );
}