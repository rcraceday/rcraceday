// src/components/DriverList.jsx

export default function DriverList({ membership, drivers }) {
  const items = [];

  const primaryIsDriver = drivers.some(
    (d) =>
      d.first_name === membership.primary_first_name &&
      d.last_name === membership.primary_last_name
  );

  if (membership.membership_type === "family" || primaryIsDriver) {
    items.push({
      id: "primary",
      first_name: membership.primary_first_name,
      last_name: membership.primary_last_name,
      is_junior: false,
    });
  }

  drivers.forEach((d) => items.push(d));

  if (items.length === 0) {
    return <p className="text-sm text-text-muted">No drivers added yet.</p>;
  }

  return (
    <ul className="space-y-0.5">
      {items.map((d) => (
        <li key={d.id || "primary"} className="text-sm text-text-base">
          {d.first_name} {d.last_name}
          {d.is_junior && <span className="text-text-muted"> (Junior)</span>}
        </li>
      ))}
    </ul>
  );
}
