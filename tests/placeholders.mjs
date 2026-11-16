import fs from "node:fs";
import path from "node:path";
export const filler =
  /\[placeholder|placeholder:|\bTODO\b|\bTBD\b|\blorem\b|example\.com|coming soon/i;
function scan(p) {
  if (fs.statSync(p).isDirectory()) {
    for (const f of fs.readdirSync(p)) scan(path.join(p, f));
  } else if (/\.(?:[cm]?[jt]sx?|html|css|svg|json|txt)$/i.test(p)) {
    const hit = fs.readFileSync(p, "utf8").match(filler);
    if (hit) throw Error(p + " contains " + hit[0]);
  }
}
for (const p of ["src", "index.html", "dist"]) if (fs.existsSync(p)) scan(p);
console.log("Placeholder scan passed. No exceptions.");
