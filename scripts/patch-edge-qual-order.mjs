import fs from "fs";

const indexPath = "supabase/functions/import-liverc-results/index.ts";
let s = fs.readFileSync(indexPath, "utf8");

if (!s.includes("qualifyingOrder")) {
  s = s.replace(
    "const body = await req.json();",
    "const body = await req.json();\n    const qualifyingOrder = body?.qualifyingOrder || \"top_5_average\";"
  );
  s = s.replace(
    `    for (const item of childUrls) {
      if (seen.has(item.url)) continue;
      seen.add(item.url);
      unique.push(item);
      if (unique.length >= 80) break;
    }`,
    `    for (const item of childUrls) {
      let fetchUrl = item.url;
      if (item.kind === "qualifying") {
        try {
          const u = new URL(item.url);
          u.searchParams.set("o", qualifyingOrder);
          fetchUrl = u.toString();
        } catch {
          // keep original url
        }
      }
      if (seen.has(fetchUrl)) continue;
      seen.add(fetchUrl);
      unique.push({ ...item, url: fetchUrl });
      if (unique.length >= 80) break;
    }`
  );
  fs.writeFileSync(indexPath, s);
  console.log("patched index.ts");
} else {
  console.log("already patched");
}
