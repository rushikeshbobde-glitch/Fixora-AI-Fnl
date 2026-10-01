import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("==> Vercel Universal Build Hook Started (Fixora_AI/frontend)");
console.log("==> __dirname:", __dirname);
console.log("==> process.cwd():", process.cwd());

try {
  execSync("npm install", { cwd: __dirname, stdio: "inherit" });
} catch (e) {
  console.warn("npm install warning:", e.message);
}

execSync("npx vite build", { cwd: __dirname, stdio: "inherit" });

const distSource = path.join(__dirname, "dist");
if (fs.existsSync(distSource)) {
  const destinations = [
    path.join(process.cwd(), "dist"),
    path.resolve(__dirname, "..", "dist"),
    path.resolve(__dirname, "..", "..", "dist"),
    path.resolve(process.cwd(), "..", "dist")
  ];

  for (const dest of destinations) {
    try {
      if (distSource !== dest) {
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.cpSync(distSource, dest, { recursive: true });
        console.log("==> Synced dist to:", dest);
      }
    } catch (e) {}
  }
}

console.log("==> Frontend Build successfully finished!");
