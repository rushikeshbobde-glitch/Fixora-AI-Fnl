const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

console.log("==> Vercel Universal Build Hook Started (Fixora_AI)");
console.log("==> __dirname:", __dirname);
console.log("==> process.cwd():", process.cwd());

function findFrontendDir(startDir) {
  let curr = path.resolve(startDir);
  for (let i = 0; i < 6; i++) {
    const candidates = [
      path.join(curr, "Fixora_AI", "frontend"),
      path.join(curr, "frontend"),
      path.join(curr, "Fixora_AI_Problem12_PostgreSQL_Complete", "Fixora_AI", "frontend"),
      curr
    ];

    for (const cand of candidates) {
      if (fs.existsSync(path.join(cand, "package.json"))) {
        try {
          const pkg = JSON.parse(fs.readFileSync(path.join(cand, "package.json"), "utf8"));
          if (pkg.name && (pkg.name.includes("frontend") || pkg.dependencies?.vite || pkg.devDependencies?.vite)) {
            return cand;
          }
        } catch (e) {}
      }
    }
    const parent = path.dirname(curr);
    if (parent === curr) break;
    curr = parent;
  }
  return null;
}

const frontendDir = findFrontendDir(__dirname) || findFrontendDir(process.cwd());
if (!frontendDir) {
  console.error("ERROR: Could not locate frontend directory with vite package.json!");
  process.exit(1);
}

console.log("==> Found Frontend Directory:", frontendDir);
execSync("npm install && npm run build", { cwd: frontendDir, stdio: "inherit" });

const distSource = path.join(frontendDir, "dist");
if (fs.existsSync(distSource)) {
  console.log("==> Built dist folder located at:", distSource);

  const destinations = [
    path.join(process.cwd(), "dist"),
    path.join(__dirname, "dist"),
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

console.log("==> Universal Build successfully finished!");
