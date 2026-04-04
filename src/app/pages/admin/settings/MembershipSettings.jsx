// src/app/pages/admin/settings/MembershipSettings.jsx

import { useClub } from "@/app/providers/ClubProvider";
import { UserGroupIcon } from "@heroicons/react/24/solid";

export default function MembershipSettings() {
  return <div>Membership Settings</div>;
  const { club } = useClub();
  const brand = club?.theme?.hero?.backgroundColor || "#0A66C2";

  return (
    <div className="min-h-screen w-full bg-background text-text-base">

      {/* HEADER */}
      <section className="w-full border-b border-surfaceBorder bg-surface">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-2">
          <UserGroupIcon className="h-5 w-5" style={{ color: brand }} />
          <h1 className="text-xl font-semibold tracking-tight">Membership Settings</h1>
        </div>
      </section>

      {/* MAIN */}
      <main className="max-w-4xl mx-auto px-4 py-10">
        <p className="text-text-muted">
          Configure membership rules, pricing, renewals, and requirements.
        </p>
      </main>
    </div>
  );
}
