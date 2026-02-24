// frontend/hooks/useDossiers.ts

import { useState, useEffect, useCallback } from 'react';
import { listDossiers, DossiersFilters, DossierFacturable } from '../services/dossiersApi';
import { normalizeDossier, extractPalierFromEvenements } from '../utils/stringUtils';

interface UseDossiersReturn {
  dossiers: DossierFacturable[];
  loading: boolean;
  error: string | null;
  refetch: (filters?: DossiersFilters) => Promise<void>;
  filters: DossiersFilters;
  setFilters: (filters: DossiersFilters) => void;
}

export function useDossiers(initialFilters: DossiersFilters = {}): UseDossiersReturn {
  const [dossiers, setDossiers] = useState<DossierFacturable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<DossiersFilters>(initialFilters);

  const fetchDossiers = useCallback(async (filtersToUse: DossiersFilters = filters) => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await listDossiers(filtersToUse);
      
      // Normaliser tous les dossiers
      const normalizedDossiers = data.map(dossier => {
        const normalized = normalizeDossier(dossier);
        
        // S'assurer que le palier est extrait si disponible
        if (!normalized.palier && normalized.evenements) {
          const extractedPalier = extractPalierFromEvenements(normalized.evenements);
          if (extractedPalier) {
            normalized.palier = extractedPalier;
          }
        }
        
        return normalized;
      });
      
      setDossiers(normalizedDossiers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      console.error('Erreur lors du chargement des dossiers:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchDossiers();
  }, [fetchDossiers]);

  const refetch = useCallback(async (newFilters?: DossiersFilters) => {
    if (newFilters) {
      setFilters(newFilters);
      await fetchDossiers(newFilters);
    } else {
      await fetchDossiers();
    }
  }, [fetchDossiers]);

  return {
    dossiers,
    loading,
    error,
    refetch,
    filters,
    setFilters,
  };
}