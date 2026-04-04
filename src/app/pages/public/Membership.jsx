// src/app/pages/public/Membership.jsx
import { useOutletContext, Link } from "react-router-dom";
import ClubHero from "@/components/ui/ClubHero";

export default function Membership() {
  const { club } = useOutletContext();

  // â­ Prevent 400 errors â€” wait for club to load
  if (!club) {
    return (
      <div className="min-h-screen w-full bg-background text-text-base flex items-center justify-center">
        <p className="text-text-muted text-sm">Loading clubâ€¦</p>
      </div>
    );
  }

  const clubSlug = club.slug;

  // MembershipProvider (correct source of truth)
  const { membership, loadingMembership } = useMembership();

  const now = new Date();
  const endDate =
    membership?.endDateObj ??
    (membership?.end_date ? new Date(membership.end_date) : null);

  // â­ NEW LOGIC â€” membership exists = member
  const isMember = !!membership;

  const isActive =
    isMember &&
    endDate &&
    endDate >= now;

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

      {/* FULL-WIDTH HERO */}
      <ClubHero variant="medium" showLogo={true} />

      {/* MAIN */}
      <main className="max-w-6xl mx-auto px-4 pt-10 pb-16 space-y-12">

        {/* STATUS */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold tracking-[0.18em] uppercase text-text-muted">
            Membership status
          </h2>

          <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-2">
            {loadingMembership && (
              <p className="text-text-muted text-sm">Loading membershipâ€¦</p>
            )}

            {!loadingMembership && !isMember && (
              <>
                <p className="font-medium text-text-base">
                  Youâ€™re not currently a member.
                </p>
                <p className="text-sm text-text-muted">
                  Support the club and unlock full access to events, nominations, and member benefits.
                </p>
              </>
            )}

            {!loadingMembership && isMember && isActive && (
              <>
                <p className="font-medium text-emerald-700">
                  Youâ€™re an active member â€” thank you for supporting the club.
                </p>
                <p className="text-sm text-text-muted">
                  <strong>Membership type:</strong> {prettyType} â€¢{" "}
                  <strong>Valid until:</strong>{" "}
                  {endDate?.toLocaleDateString()}
                </p>
              </>
            )}

            {!loadingMembership && isMember && isExpired && (
              <>
                <p className="font-medium text-amber-700">
                  Your membership has expired.
                </p>
                <p className="text-sm text-text-muted">
                  <strong>Last membership type:</strong> {prettyType} â€¢{" "}
                  <strong>Expired on:</strong>{" "}
                  {endDate?.toLocaleDateString()}
                </p>
              </>
            )}
          </div>
        </section>

        {/* BENEFITS */}
        {(!isMember || isExpired) && (
          <section className="space-y-4">
            <h2 className="text-sm font-semibold tracking-[0.18em] uppercase text-text-muted">
              Member benefits
            </h2>

            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <ul className="list-disc ml-5 text-sm text-text-muted space-y-1">
                <li>50% off race fees</li>
                <li>Insurance coverage</li>
                <li>Junior members race free</li>
                <li>Access to RCRA sanctioned events</li>
                <li>Helps increase the clubâ€™s profile for council and government investment</li>
                <li>Voting rights at AGM</li>
              </ul>
            </div>
          </section>
        )}

        {/* PRICING */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold tracking-[0.18em] uppercase text-text-muted">
            Membership options
          </h2>

          <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4 text-sm text-text-muted">
            <div>
              <h3 className="font-semibold text-text-base mb-1">
                Full Year (Jan â€“ Dec)
              </h3>
              <p>Single: $80 â€¢ Family: $110 â€¢ Junior: $40</p>
            </div>

            <div>
              <h3 className="font-semibold text-text-base mb-1">
                Half Year (Jan â€“ Jun / Jul â€“ Dec)
              </h3>
              <p>Single: $50 â€¢ Family: $70</p>
            </div>

            <div className="text-xs space-y-1">
              <p>* A family includes 1â€“2 parents/guardians and their children under 16.</p>
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
              style={{ background: "#00438A", color: "white" }}
            >
              Join Membership
            </Link>
          )}

          {/* Active member */}
          {!loadingMembership && isMember && isActive && (
            <>
              <Link
                to={`/${clubSlug}/membership/renew`}
                className="block text-center py-3 rounded-md font-semibold"
                style={{ background: "#00438A", color: "white" }}
              >
                Renew Membership
              </Link>

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
                style={{ background: "#00438A", color: "white" }}
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
      </main>
    </div>
  );
}

function StepDot() {
  return null;
}