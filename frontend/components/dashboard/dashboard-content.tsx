import React from 'react';
import { FileText, CheckCircle2, XCircle, Clock, TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import KpiCard from './kpi-card';
import RecentDossiers from './recent-dossiers';
import StatutChart from './statut-chart';
import TrendChart from './trend-chart';

export default function DashboardPage() {
  // Stats principales
  const stats = [
    {
      title: 'Total dossiers',
      value: '1,234',
      change: '+12%',
      changeType: 'positive' as const,
      icon: FileText,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      description: 'vs mois dernier',
    },
    {
      title: 'Facturable',
      value: '556',
      change: '+8%',
      changeType: 'positive' as const,
      icon: CheckCircle2,
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      description: 'vs mois dernier',
    },
    {
      title: 'Non-facturable',
      value: '370',
      change: '3%',
      changeType: 'negative' as const,
      icon: XCircle,
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      description: 'vs mois dernier',
    },
    {
      title: 'En attente',
      value: '308',
      change: '+5%',
      changeType: 'positive' as const,
      icon: Clock,
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600',
      description: 'vs mois dernier',
    },
  ];

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div className="mb-8 fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
            <p className="text-gray-600">Bienvenue sur votre tableau de bord de facturation</p>
          </div>
          
          {/* Date du jour */}
          <div className="text-right">
            <p className="text-sm text-gray-600">Dernière mise à jour</p>
            <p className="text-lg font-semibold text-gray-900">
              {new Date().toLocaleDateString('fr-FR', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid - Utilise les classes du CSS amélioré */}
      <div className="stats-container stagger-children mb-8">
        {stats.map((stat, index) => (
          <KpiCard key={index} {...stat} />
        ))}
      </div>

      {/* Charts Section */}
      <div className="charts-container mb-8">
        {/* Statut Chart */}
        <div className="chart-card slide-in-right">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Distribution des statuts</h2>
              <p className="text-sm text-gray-600 mt-1">Répartition actuelle des dossiers</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
              <TrendingUp className="w-4 h-4" />
              <span>+12% ce mois</span>
            </div>
          </div>
          <StatutChart />
        </div>

        {/* Trend Chart */}
        <div className="chart-card slide-in-right" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Évolution mensuelle</h2>
              <p className="text-sm text-gray-600 mt-1">Tendance des 6 derniers mois</p>
            </div>
            <select className="select-field text-sm py-1.5 px-3">
              <option>6 derniers mois</option>
              <option>3 derniers mois</option>
              <option>12 derniers mois</option>
            </select>
          </div>
          <TrendChart />
        </div>
      </div>

      {/* Recent Activity */}
      <div className="fade-in" style={{ animationDelay: '0.2s' }}>
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Dossiers récents</h2>
              <p className="text-sm text-gray-600 mt-1">Les derniers dossiers traités</p>
            </div>
            <button className="btn btn-secondary text-sm">
              Voir tout
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
          <RecentDossiers />
        </div>
      </div>

      {/* Quick Stats Banner */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 fade-in" style={{ animationDelay: '0.3s' }}>
        <div className="card-glass">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Taux de validation</p>
              <p className="text-2xl font-bold text-gray-900">87.5%</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <ArrowUpRight className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm text-green-600 font-medium">
            <TrendingUp className="w-4 h-4" />
            <span>+3.2% ce mois</span>
          </div>
        </div>

        <div className="card-glass">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Délai moyen</p>
              <p className="text-2xl font-bold text-gray-900">2.3 jours</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm text-green-600 font-medium">
            <ArrowDownRight className="w-4 h-4" />
            <span>-0.5 jours</span>
          </div>
        </div>

        <div className="card-glass">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Montant total</p>
              <p className="text-2xl font-bold text-gray-900">486,750 €</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm text-green-600 font-medium">
            <TrendingUp className="w-4 h-4" />
            <span>+15.8% ce mois</span>
          </div>
        </div>
      </div>
    </div>
  );
}