function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function championshipStandingsToCsv(championship, tables) {
  const lines = [
    csvEscape(championship?.name || "Championship"),
    csvEscape(championship?.season ? `Season ${championship.season}` : ""),
    "",
    ["Class", "Position", "Driver", "Points"].map(csvEscape).join(","),
  ];
  (tables || []).forEach((table) => {
    (table.standings || []).forEach((row) => {
      lines.push(
        [table.className, row.rank, row.driverName, row.total].map(csvEscape).join(",")
      );
    });
    lines.push("");
  });
  return lines.join("\n");
}

export function downloadChampionshipCsv(championship, tables, filename) {
  const csv = championshipStandingsToCsv(championship, tables);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download =
    filename ||
    `${(championship?.name || "championship").replace(/[^\w.-]+/g, "_")}_standings.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function printChampionshipStandings() {
  window.print();
}
