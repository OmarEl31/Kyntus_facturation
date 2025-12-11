'use client';

import React from 'react';
import { FileText, ExternalLink } from 'lucide-react';

interface Dossier {
  numero: string;
  client: string;
  montant: string;
  statut: 'facturable' | 'non-facturable' | 'attente';
  date: string;
}

const dossiers: Dossier[] = [
  {
    numero: '#2024-001',
    client: 'Entreprise A',
    montant: '5,000.00 €',
    statut: 'facturable',
    date: 'Il y a 5 minutes',
  },
  {
    numero: '#2024-002',
    client: 'Entreprise B',
    montant: '12,500.00 €',
    statut: 'facturable',
    date: 'Il y a 1 heure',
  },
  {
    numero: '#2024-003',
    client: 'Entreprise C',
    montant: '3,200.00 €',
    statut: 'attente',
    date: 'Il y a 2 heures',
  },
  {
    numero: '#2024-004',
    client: 'Entreprise D',
    montant: '8,900.00 €',
    statut: 'non-facturable',
    date: 'Il y a 3 heures',
  },
  {
    numero: '#2024-005',
    client: 'Entreprise E',
    montant: '15,000.00 €',
    statut: 'facturable',
    date: 'Il y a 5 heures',
  },
];

const getStatutBadge = (statut: Dossier['statut']) => {
  switch (statut) {
    case 'facturable':
      return 'badge-facturable';
    case 'non-facturable':
      return 'badge-non-facturable';
    case 'attente':
      return 'badge-attente';
  }
};

const getStatutLabel = (statut: Dossier['statut']) => {
  switch (statut) {
    case 'facturable':
      return 'Facturable';
    case 'non-facturable':
      return 'Non-facturable';
    case 'attente':
      return 'En attente';
  }
};

export default function RecentDossiers() {
  return (
    <div className="overflow-x-auto custom-scrollbar">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Numéro</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Client</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Montant</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Statut</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Date</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700"></th>
          </tr>
        </thead>
        <tbody>
          {dossiers.map((dossier, index) => (
            <tr 
              key={index} 
              className="table-row-hover border-b border-gray-100 last:border-0"
            >
              <td className="py-4 px-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-blue-600" />
                  </div>
                  <span className="font-medium text-gray-900">{dossier.numero}</span>
                </div>
              </td>
              <td className="py-4 px-4">
                <span className="text-gray-700">{dossier.client}</span>
              </td>
              <td className="py-4 px-4">
                <span className="font-semibold text-gray-900">{dossier.montant}</span>
              </td>
              <td className="py-4 px-4">
                <span className={`badge ${getStatutBadge(dossier.statut)}`}>
                  {getStatutLabel(dossier.statut)}
                </span>
              </td>
              <td className="py-4 px-4">
                <span className="text-sm text-gray-600">{dossier.date}</span>
              </td>
              <td className="py-4 px-4">
                <button 
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Voir le dossier"
                >
                  <ExternalLink className="w-4 h-4 text-gray-600" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}