'use client';

import React, { useState, useEffect } from 'react';
import { LayoutDashboard, FileText, Settings, BarChart3, LogOut, Menu, DownloadCloud, User } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';

interface MenuItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
}

export default function Sidebar() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');
  
  const pathname = usePathname();
  const router = useRouter();

  // NOUVEAU: Njebdoh l'email dyal l'user mn l'token
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        // N-decodiw l'payload dyal JWT
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        
        const payload = JSON.parse(jsonPayload);
        if (payload && payload.sub) {
          setUserEmail(payload.sub);
        }
      } catch (e) {
        console.error("Erreur de décodage du token", e);
      }
    }
  }, []);

  // N-gaddou smya sghira (li 9bel l'arobase)
  const userName = userEmail ? userEmail.split('@')[0] : 'Utilisateur';

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

  // NOUVEAU: Logic dyal Déconnexion
  const handleLogout = () => {
    localStorage.removeItem('token'); // N-mes7ou l'token
    window.location.href = '/'; // N-refreshiw w n-rej3ouh l'AuthGuard (ghay-logih bera)
  };

  const open = isExpanded || isPinned;

  return (
    <aside
      className={`bg-white border-r border-gray-200 transition-all duration-300 ease-in-out flex flex-col relative shadow-lg h-screen flex-shrink-0 z-40 ${
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

      {/* NOUVEAU: Profil dyal l'user w bouton Déconnexion */}
      <div className="p-3 border-t border-gray-200 flex-shrink-0">
        <div className={`mb-3 flex items-center gap-3 transition-all duration-300 overflow-hidden ${open ? 'px-2' : 'px-0 justify-center'}`}>
          <div className="w-9 h-9 rounded-full bg-orange-100 border border-orange-200 flex items-center justify-center text-[#ff8c42] font-bold flex-shrink-0 shadow-sm">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className={`flex flex-col transition-all duration-300 overflow-hidden ${open ? 'opacity-100 w-auto' : 'opacity-0 w-0'}`}>
            <span className="text-sm font-bold text-gray-800 truncate capitalize">{userName}</span>
            <span className="text-xs text-gray-500 truncate" title={userEmail}>{userEmail}</span>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-red-600 hover:bg-red-50 hover:text-red-700 transition-all duration-200 group relative ${open ? 'justify-start' : 'justify-center'}`}
          title={!open ? "Déconnexion" : undefined}
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