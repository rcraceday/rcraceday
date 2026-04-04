// src/app/pages/public/Membership.jsx
import { Link } from "react-router-dom";
import { IdentificationIcon } from "@heroicons/react/24/solid";
import { useOutletContext } from "react-router-dom";
import { useMembership } from "@/app/providers/MembershipProvider";

export default function Membership() {
  const { club } = useOutletContext();
  const { membership, loadingMembership } = useMembership();

  if (!club) {
    return (
      <div className="min-h-screen w-full bg-background text-text-base flex items-center justify-center">
        <p className="text-text-muted text-sm">Loading club…</p>
      </div>
    );
  }

  const brand = club.theme?.hero?.backgroundColor || "#00438A";
  const clubSlug = club.slug;

  // ------------------------------------------------------------
  // MEMBERSHIP LOGIC
  // ------------------------------------------------------------
  const now = new Date();
  const endDate = membership?.end_date ? new Date(membership.end_date) : null;

  const isMember = membership !== null;

  const isActive =
    isMember &&
    (!endDate || endDate >= now);

  const isExpired =
    isMember &&
    endDate &&
    endDate < now;

  const prettyType = membership?.membership_type
    ? membership.membership_type.charAt(0).toUpperCase() +
      membership.membership_type.slice(1)
    : null;

  return (
    <div className="min-h-screen w-full bg-background text-text-base">

      {/* PAGE HEADER — EXACT MATCH TO EDIT DRIVER */}
      <section className="w-full border-b border-surfaceBorder bg-surface">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-2">
          <IdentificationIcon className="h-5 w-5" style={{ color: brand }} />
          <h1 className="text-xl font-semibold tracking-tight">Membership</h1>
        </div>
      </section>

      {/* MAIN CONTENT */}
      <main className="max-w-3xl mx-auto px-4 py-10">

        {/* CARD — BLUE BORDER + SHADOW + ROUNDED */}
        <div
          className="rounded-xl shadow-sm overflow-hidden"
          style={{
            border: `2px solid ${brand}`,
            background: "white",
          }}
        >

          {/* CARD HEADER BAR (BLUE) */}
          <div
            className="px-5 py-3"
            style={{
              background: brand,
              color: "white",
            }}
          >
            <h2 className="text-base font-semibold">Membership Details</h2>
          </div>

          {/* CARD BODY */}
          <div className="p-5 space-y-8">

            {/* STATUS */}
            <section className="space-y-2">
              {loadingMembership && (
                <p className="text-text-muted text-sm">Loading membership…</p>
              )}

              {!loadingMembership && !isMember && (
                <>
                  <p className="font-medium text-text-base">
                    You’re not currently a member.
                  </p>
                  <p className="text-sm text-text-muted">
                    Support the club and unlock full access to events, nominations, and member benefits.
                  </p>
                </>
              )}

              {!loadingMembership && isMember && isActive && (
                <>
                  <p className="font-medium text-emerald-700">
                    You’re an active member — thank you for supporting the club.
                  </p>
                  <p className="text-sm text-text-muted">
                    <strong>Membership type:</strong> {prettyType} •{" "}
                    <strong>Valid until:</strong>{" "}
                    {endDate ? endDate.toLocaleDateString() : "No expiry"}
                  </p>
                </>
              )}

              {!loadingMembership && isMember && isExpired && (
                <>
                  <p className="font-medium text-amber-700">
                    Your membership has expired.
                  </p>
                  <p className="text-sm text-text-muted">
                    <strong>Last membership type:</strong> {prettyType} •{" "}
                    <strong>Expired on:</strong>{" "}
                    {endDate?.toLocaleDateString()}
                  </p>
                </>
              )}
            </section>

            {/* BENEFITS */}
            {(!isMember || isExpired) && (
              <section className="space-y-2">
                <h3 className="text-sm font-semibold tracking-wide text-text-muted uppercase">
                  Member benefits
                </h3>

                <ul className="list-disc ml-5 text-sm text-text-muted space-y-1">
                  <li>50% off race fees</li>
                  <li>Insurance coverage</li>
                  <li>Junior members race free</li>
                  <li>Access to RCRA sanctioned events</li>
                  <li>Helps increase the club’s profile for council and government investment</li>
                  <li>Voting rights at AGM</li>
                </ul>
              </section>
            )}

            {/* PRICING */}
            <section className="space-y-2">
              <h3 className="text-sm font-semibold tracking-wide text-text-muted uppercase">
                Membership options
              </h3>

              <div className="text-sm text-text-muted space-y-4">
                <div>
                  <h4 className="font-semibold text-text-base mb-1">
                    Full Year (Jan – Dec)
                  </h4>
                  <p>Single: $80 • Family: $110 • Junior: $40</p>
                </div>

                <div>
                  <h4 className="font-semibold text-text-base mb-1">
                    Half Year (Jan – Jun / Jul – Dec)
                  </h4>
                  <p>Single: $50 • Family: $70</p>
                </div>

                <div className="text-xs space-y-1">
                  <p>* A family includes 1–2 parents/guardians and their children under 16.</p>
                  <p>** Junior members must be aged 16 or under at the time of application.</p>
                </div>
              </div>
            </section>

            {/* CTAS */}
            <section className="space-y-3">

              {/* Non-member */}
              {!loadingMembership && !isMember && (
                <Link
                  to={`/${clubSlug}/membership/join`}
                  className="block text-center py-3 rounded-md font-semibold"
                  style={{ background: brand, color: "white" }}
                >
                  Join Membership
                </Link>
              )}

              {/* Active member — NO RENEW BUTTON */}
              {!loadingMembership && isMember && isActive && (
                <>
                  {membership.membership_type !== "family" && (
                    <Link
                      to={`/${clubSlug}/membership/upgrade`}
                      className="block text-center py-3 rounded-md font-semibold bg-gray-100 text-gray-900"
                    >
                      Upgrade to Family Membership
                    </Link>
                  )}
                </>
              )}

              {/* Expired member */}
              {!loadingMembership && isMember && isExpired && (
                <>
                  <Link
                    to={`/${clubSlug}/membership/renew`}
                    className="block text-center py-3 rounded-md font-semibold"
                    style={{ background: brand, color: "white" }}
                  >
                    Renew Membership
                  </Link>

                  <Link
                    to={`/${clubSlug}/membership/join`}
                    className="block text-center py-3 rounded-md font-semibold bg-gray-100 text-gray-900"
                  >
                    Start a New Membership
                  </Link>
                </>
              )}
            </section>

          </div>
        </div>
      </main>
    </div>
  );
}
