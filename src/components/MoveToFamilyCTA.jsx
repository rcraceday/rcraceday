// src/app/components/MoveToFamilyCTA.jsx

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

export default function MoveToFamilyCTA({ brand, onMove }) {
  return (
    <Card
      className="p-6 space-y-4 w-full"
      style={{ border: `2px solid ${brand}` }}
    >
      <h2 className="text-lg font-semibold">Upgrade to Family Membership</h2>

      <p className="text-sm text-text-muted">
        Upgrade your membership to include parents/guardians and junior drivers.
      </p>

      <div className="pt-2 flex justify-center">
        <Button
          variant="primary"
          className="!w-auto !px-6 !py-1.5 !text-sm !rounded-md"
          onClick={onMove}
        >
          Move to Family
        </Button>
      </div>
    </Card>
  );
}
