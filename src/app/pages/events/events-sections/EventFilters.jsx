import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";

export default function EventFilters({
  query,
  setQuery,
  trackFilter,
  setTrackFilter,
  typeFilter,
  setTypeFilter,
  yearFilter,
  setYearFilter,
  sortOrder,
  setSortOrder,
  showPastEvents,
  setShowPastEvents,
  clearFilters,
  years,
  brand,
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

      <Input
        label="Search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <Select
        label="Track"
        value={trackFilter}
        onChange={(e) => setTrackFilter(e.target.value)}
      >
        <option value="all">All Tracks</option>
        <option value="dirt">Dirt</option>
        <option value="sic">SIC</option>
      </Select>

      <Select
        label="Type"
        value={typeFilter}
        onChange={(e) => setTypeFilter(e.target.value)}
      >
        <option value="all">All Types</option>
        <option value="racing">Racing</option>
        <option value="practice">Practice</option>
        <option value="club_meet">Club Meet</option>
        <option value="championship_round">Championship Round</option>
        <option value="state_titles">State Titles</option>
        <option value="national_titles">National Titles</option>
      </Select>

      <Select
        label="Year"
        value={yearFilter}
        onChange={(e) => setYearFilter(e.target.value)}
      >
        <option value="all">All Years</option>
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </Select>

      <Select
        label="Sort"
        value={sortOrder}
        onChange={(e) => setSortOrder(e.target.value)}
      >
        <option value="asc">Date ↑</option>
        <option value="desc">Date ↓</option>
      </Select>

      {/* SHOW PAST EVENTS CHECKBOX */}
      <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <input
          type="checkbox"
          checked={showPastEvents}
          onChange={(e) => setShowPastEvents(e.target.checked)}
        />
        <span style={{ fontSize: "14px" }}>Show Past Events</span>
      </label>

      {/* CLEAR BUTTON — REAL SECONDARY BUTTON */}
      <Button
        variant="secondary"
        onClick={clearFilters}
        style={{
          border: `2px solid ${brand}`,
          color: brand,
          background: "white",
          width: "100%",
        }}
      >
        Clear
      </Button>
    </div>
  );
}
