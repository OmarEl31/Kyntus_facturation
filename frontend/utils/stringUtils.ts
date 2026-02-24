// frontend/utils/stringUtils.ts

/**
 * Nettoie une chaîne en remplaçant les NBSP (\u00A0) par des espaces normaux
 * et supprime les espaces superflus
 */
export function normalizeString(s: string | null | undefined): string {
  if (!s) return '';
  return String(s)
    .replace(/\u00a0/g, ' ')  // Remplacer NBSP par espace normal
    .replace(/\s+/g, ' ')      // Remplacer multiples espaces par un seul
    .trim();
}

/**
 * Extrait le palier des événements avec gestion des NBSP
 */
export function extractPalierFromEvenements(evenements: string | null | undefined): string | null {
  if (!evenements) return null;
  
  const normalized = normalizeString(evenements);
  if (!normalized) return null;
  
  // Chercher le palier dans différents formats
  const patterns = [
    /palier[:\s]+([^\n\r#]+)/i,
    /#palier\s*=\s*([^#]+)/i,
    /paller[:\s]+([^\n\r#]+)/i,  // Au cas où il y a une faute d'orthographe
  ];
  
  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  return null;
}

/**
 * Extrait le commentaire technique du compte-rendu avec gestion des NBSP
 */
export function extractCommentaireTechnique(compteRendu: string | null | undefined): string | null {
  if (!compteRendu) return null;
  
  const normalized = normalizeString(compteRendu);
  if (!normalized) return null;
  
  // Chercher plusieurs formats possibles
  const patterns = [
    /#commentairereleve\s*=\s*(.+?)(?=#|$)/i,
    /commentairereleve[:\s]+(.+?)(?=#|$)/i,
    /#commentaire\s*=\s*(.+?)(?=#|$)/i,
    /commentaire\s*technique[:\s]+(.+?)(?=#|$)/i,
    /Bloc-note:\s*(.+?)(?:\n|$)/i,
  ];
  
  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match && match[1]) {
      const comment = match[1].trim();
      if (comment) return comment;
    }
  }
  
  // Si pas trouvé avec les patterns, chercher après le dernier #
  const lastHashIndex = normalized.lastIndexOf('#');
  if (lastHashIndex !== -1 && lastHashIndex < normalized.length - 1) {
    const afterLastHash = normalized.substring(lastHashIndex + 1).trim();
    if (afterLastHash && afterLastHash.length < 200) {
      return afterLastHash;
    }
  }
  
  return null;
}

/**
 * Détecte si le commentaire indique un changement d'article
 */
export function detecteChangementArticle(commentaire: string | null | undefined): boolean {
  if (!commentaire) return false;
  
  const normalized = commentaire.toLowerCase();
  const patterns = [
    /change(?:ment)?\s+d['']?article/,
    /remplacement/,
    /article\s+change/,
    /modif(?:ication)?\s+article/,
    /article\s+modifié/,
    /nouvel?\s+article/,
  ];
  
  return patterns.some(pattern => pattern.test(normalized));
}

/**
 * Nettoie les codes articles PIDI
 */
export function nettoyerCodesPidi(listeArticles: string | null | undefined): string[] {
  if (!listeArticles) return [];
  
  const normalized = normalizeString(listeArticles).toUpperCase();
  const matches = normalized.match(/\b[A-Z]{2,}[A-Z0-9]{0,12}\b/g) ?? [];
  
  return Array.from(
    new Set(
      matches
        .map(x => x.trim())
        .filter(Boolean)
        .filter(x => x !== "PIDI" && x !== "BRUT")
    )
  );
}

/**
 * Formate une date en français
 */
export function formatDateFr(date: string | null | undefined): string {
  if (!date) return "—";
  if (/^\d{2}\/\d{2}\/\d{4}/.test(date)) return date;

  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;

  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Parse une liste séparée par des séparateurs variés
 */
export function parseListe(v: string | null | undefined): string[] {
  if (!v) return [];
  return String(v)
    .split(/[\r\n,;|]+/g)
    .map(x => x.trim())
    .filter(Boolean);
}