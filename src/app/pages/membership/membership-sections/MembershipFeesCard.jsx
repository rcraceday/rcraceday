// src/app/pages/membership/membership-sections/MembershipFeesCard.jsx

import Card from "@/components/ui/Card";

export default function MembershipFeesCard({ brand }) {
  return (
    <Card
      noPadding
      className="w-full rounded-xl shadow-sm overflow-hidden !p-0"
      style={{ border: `2px solid ${brand}`, background: "white" }}
    >
      {/* BLUE HEADER */}
      <div
        className="px-5 py-3"
        style={{ background: brand, color: "white" }}
      >
        <h2 className="text-base font-semibold tracking-tight">
          Membership Fees
        </h2>
      </div>

      {/* BODY */}
      <div className="p-6 text-sm space-y-2">

        {/* FULL YEAR */}
        <p className="font-semibold">FULL YEAR MEMBERSHIP (Jan–Dec)</p>
        <p>Single — $80</p>
        <p>Family* — $110</p>
        <p>Junior** — $40</p>

        {/* HALF YEAR */}
        <p className="font-semibold pt-3">
          HALF YEAR MEMBERSHIP (Jan–Jun / Jul–Dec)
        </p>
        <p>Single — $50</p>
        <p>Family* — $70</p>

        {/* FOOTNOTES */}
        <p className="text-xs text-text-muted pt-3">
          * A family includes 1–2 parents (or guardians) and their children under 16.
        </p>
        <p className="text-xs text-text-muted">
          ** A junior member must be aged 16 and under at the time of application.
        </p>

        <p className="text-xs text-text-muted pt-3">
          Memberships are renewable each year January 1st, or in July for 6‑month memberships.
        </p>
      </div>
    </Card>
  );
}
