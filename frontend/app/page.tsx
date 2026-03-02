// frontend/app/page.tsx
import DossiersList from "@/components/dossiers/dossiers-list";

export const metadata = {
  title: "Croisement Praxedo ↔ PIDI",
};

export default function HomePage() {
  return (
    <main className="p-4 space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">Croisement Praxedo ↔ PIDI</h1>
        <p className="text-gray-600">
          Liste issue de <span className="font-mono">canonique.v_croisement</span> (clé{" "}
          <span className="font-mono">ot_key</span>, <span className="font-mono">nd_global</span>,
          <span className="font-mono"> statut_pidi</span> و{" "}
          <span className="font-mono">statut_croisement</span>).
        </p>
      </header>
      <DossiersList />
      <p className="text-xs text-gray-500">Source directe : <span className="font-mono">canonique.v_croisement</span>.</p>
    </main>
  );
}
