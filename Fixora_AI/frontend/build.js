const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

console.log("==> Vercel Universal Build Hook Started (Fixora_AI/frontend)");
console.log("==> __dirname:", __dirname);
console.log("==> process.cwd():", process.cwd());

execSync("npm install && npm run build", { cwd: __dirname, stdio: "inherit" });

const distSource = path.join(__dirname, "dist");
if (fs.existsSync(distSource)) {
  const destinations = [
    path.join(process.cwd(), "dist"),
    path.resolve(__dirname, "..", "dist"),
    path.resolve(__dirname, "..", "..", "dist")
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
