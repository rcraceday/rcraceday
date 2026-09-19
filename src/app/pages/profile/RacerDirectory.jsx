import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/supabaseClient";

import Card from "@/components/ui/Card";
import PageTitle from "@/components/ui/PageTitle";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";

import useProfile from "@app/hooks/useProfile";
import { COUNTRIES } from "@/data/countries";

export default function RacerDirectory() {
  const { clubSlug } = useParams();
  const navigate = useNavigate();
  const { membership } = useProfile();

  const [loading, setLoading] = useState(true);
  const [drivers, setDrivers] = useState([]);
  const [search, setSearch] = useState("");

  const isMember = Boolean(membership);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("drivers")
        .select(`
          id,
          membership_id,
          first_name,
          last_name,
          is_junior,
          driver_profiles (
            nickname,
            team_name,
            country_code,
            avatar_url,
            manufacturer,
            visible_in_directory
          )
        `);

      if (error) {
        setDrivers([]);
        setLoading(false);
        return;
      }

      const visibleDrivers = data.filter((d) => {
        const p = d.driver_profiles?.[0];
        if (!p) return false;

        // Visible to everyone
        if (p.visible_in_directory) return true;

        // Hidden but visible to owner
        if (membership && d.membership_id === membership.id) return true;

        return false;
      });

      // Sort alphabetically
      visibleDrivers.sort((a, b) => {
        const nameA = `${a.first_name} ${a.last_name}`.toLowerCase();
        const nameB = `${b.first_name} ${b.last_name}`.toLowerCase();
        return nameA.localeCompare(nameB);
      });

      setDrivers(visibleDrivers);
      setLoading(false);
    };

    load();
  }, [membership]);

  // Non-members cannot view directory
  if (!loading && !isMember) {
    return (
      <div className="p-4 max-w-xl mx-auto">
        <Card className="p-6 text-center space-y-4">
          <h2 className="text-xl font-semibold">Members Only</h2>
          <p className="text-gray-600">
            The Racer Directory is only available to club members.
          </p>
          <Button onClick={() => navigate(`/${clubSlug}/profile/drivers`)}>
            Back to My Drivers
          </Button>
        </Card>
      </div>
    );
  }

  if (loading) return <div className="p-4">Loading racers…</div>;

  const filtered = drivers.filter((d) => {
    const p = d.driver_profiles?.[0];
    const fullName = `${d.first_name} ${d.last_name}`.toLowerCase();
    const nick = p?.nickname?.toLowerCase() || "";
    return (
      fullName.includes(search.toLowerCase()) ||
      nick.includes(search.toLowerCase())
    );
  });

  return (
    <div className="min-h-screen w-full bg-background text-text-base">
      <PageTitle title="Racer Directory" />

      <main className="p-4 max-w-5xl mx-auto space-y-6">

      {/* Search */}
      <input
        type="text"
        placeholder="Search racers…"
        className="w-full border rounded-md p-2 text-sm"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((d) => {
          const p = d.driver_profiles?.[0];
          const country = COUNTRIES.find((c) => c.code === p?.country_code);

          return (
            <Card
              key={d.id}
              className="p-4 cursor-pointer hover:shadow-md transition"
              onClick={() =>
                navigate(`/${clubSlug}/profile/drivers/${d.id}`)
              }
            >
              <div className="flex flex-col items-center text-center space-y-3">

                {/* Avatar */}
                <img
                  src={p.avatar_url || "/default-avatar.png"}
                  alt="Avatar"
                  className="w-20 h-20 rounded-full object-cover border"
                />

                {/* Name */}
                <div>
                  <h2 className="text-lg font-semibold">
                    {d.first_name} {d.last_name}
                  </h2>

                  {p.nickname && (
                    <p className="text-gray-600 text-sm">“{p.nickname}”</p>
                  )}

                  {country && (
                    <p className="text-gray-500 text-xs">
                      {country.flag} {country.name}
                    </p>
                  )}
                </div>

                {/* Team / Manufacturer */}
                <div className="text-xs text-gray-600 space-y-1">
                  {p.team_name && (
                    <p>
                      <span className="font-semibold">Team:</span>{" "}
                      {p.team_name}
                    </p>
                  )}

                  {p.manufacturer && (
                    <p>
                      <span className="font-semibold">Manufacturer:</span>{" "}
                      {p.manufacturer}
                    </p>
                  )}
                </div>

                {/* Junior Badge */}
                {d.is_junior && (
                  <Badge variant="blue">Junior</Badge>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-gray-600 py-10">
          No racers found.
        </p>
      )}
      </main>
    </div>
  );
}
