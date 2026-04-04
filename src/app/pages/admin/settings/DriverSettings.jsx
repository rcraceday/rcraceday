// src/app/pages/admin/settings/DriverSettings.jsx

import { useClub } from "@/app/providers/ClubProvider";
import { WrenchScrewdriverIcon } from "@heroicons/react/24/solid";

export default function DriverSettings() {
  return <div>Driver Settings</div>;
  const { club } = useClub();
  const brand = club?.theme?.hero?.backgroundColor || "#0A66C2";

  return (
    <div className="min-h-screen w-full bg-background text-text-base">

      {/* HEADER */}
      <section className="w-full border-b border-surfaceBorder bg-surface">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-2">
          <WrenchScrewdriverIcon className="h-5 w-5" style={{ color: brand }} />
          <h1 className="text-xl font-semibold tracking-tight">Driver Settings</h1>
        </div>
      </section>

      {/* MAIN */}
      <main className="max-w-4xl mx-auto px-4 py-10">
        <p className="text-text-muted">
          Configure driver rules, license requirements, and related settings.
        </p>
      </main>
    </div>
  );
}
