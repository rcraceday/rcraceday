// src/app/pages/admin/settings/ClubSettings.jsx

import { useParams, useNavigate } from "react-router-dom";
import { useClub } from "@/app/providers/ClubProvider";

import Button from "@/components/ui/Button";

import {
  Cog6ToothIcon,
  InformationCircleIcon,
  UserGroupIcon,
  CalendarDaysIcon,
  WrenchScrewdriverIcon,
  AdjustmentsHorizontalIcon,
  RectangleGroupIcon,
} from "@heroicons/react/24/solid";

export default function ClubSettings() {
  return <div>Club Settings</div>;
  const { clubSlug } = useParams();
  const navigate = useNavigate();
  const { club } = useClub();

  const brand = club?.theme?.hero?.backgroundColor || "#0A66C2";

  return (
    <div className="min-h-screen w-full bg-background text-text-base">

      {/* HEADER */}
      <section className="w-full border-b border-surfaceBorder bg-surface">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-2">
          <Cog6ToothIcon className="h-5 w-5" style={{ color: brand }} />
          <h1 className="text-xl font-semibold tracking-tight">Club Settings</h1>
        </div>
      </section>

      {/* MAIN */}
      <main className="max-w-4xl mx-auto px-4 py-10 space-y-12">

        <section className="grid grid-cols-1 sm:grid-cols-2 gap-6">

          <Button
            className="!rounded-lg !py-4 flex items-center gap-3 text-left"
            style={{ background: brand }}
            onClick={() => navigate(`/${clubSlug}/app/admin/settings/info`)}
          >
            <InformationCircleIcon className="w-6 h-6 text-white" />
            <span className="text-white font-medium">Club Information</span>
          </Button>

          <Button
            className="!rounded-lg !py-4 flex items-center gap-3 text-left"
            style={{ background: brand }}
            onClick={() => navigate(`/${clubSlug}/app/admin/settings/membership`)}
          >
            <UserGroupIcon className="w-6 h-6 text-white" />
            <span className="text-white font-medium">Membership Settings</span>
          </Button>

          <Button
            className="!rounded-lg !py-4 flex items-center gap-3 text-left"
            style={{ background: brand }}
            onClick={() => navigate(`/${clubSlug}/app/admin/settings/events`)}
          >
            <CalendarDaysIcon className="w-6 h-6 text-white" />
            <span className="text-white font-medium">Event Defaults</span>
          </Button>

          <Button
            className="!rounded-lg !py-4 flex items-center gap-3 text-left"
            style={{ background: brand }}
            onClick={() => navigate(`/${clubSlug}/app/admin/settings/drivers`)}
          >
            <WrenchScrewdriverIcon className="w-6 h-6 text-white" />
            <span className="text-white font-medium">Driver Settings</span>
          </Button>

          <Button
            className="!rounded-lg !py-4 flex items-center gap-3 text-left"
            style={{ background: brand }}
            onClick={() => navigate(`/${clubSlug}/app/admin/settings/system`)}
          >
            <AdjustmentsHorizontalIcon className="w-6 h-6 text-white" />
            <span className="text-white font-medium">System Settings</span>
          </Button>

          {/* ⭐ Classes */}
          <Button
            className="!rounded-lg !py-4 flex items-center gap-3 text-left"
            style={{ background: brand }}
            onClick={() => navigate(`/${clubSlug}/app/admin/settings/classes`)}
          >
            <RectangleGroupIcon className="w-6 h-6 text-white" />
            <span className="text-white font-medium">Classes</span>
          </Button>

        </section>

      </main>
    </div>
  );
}
