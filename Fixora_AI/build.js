const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const cwd = process.cwd();
console.log("==> Vercel Build Hook: Current Directory:", cwd);

let frontendDir = "";
if (fs.existsSync(path.join(cwd, "frontend", "package.json"))) {
  frontendDir = path.join(cwd, "frontend");
} else if (fs.existsSync(path.join(cwd, "Fixora_AI", "frontend", "package.json"))) {
  frontendDir = path.join(cwd, "Fixora_AI", "frontend");
} else if (fs.existsSync(path.join(cwd, "package.json"))) {
  frontendDir = cwd;
}

if (!frontendDir) {
  console.error("ERROR: Could not locate frontend directory with package.json!");
  process.exit(1);
}

console.log("==> Building frontend inside:", frontendDir);
execSync("npm install && npm run build", { cwd: frontendDir, stdio: "inherit" });

const distSource = path.join(frontendDir, "dist");
const rootDist = path.join(cwd, "dist");

if (fs.existsSync(distSource) && distSource !== rootDist) {
  fs.cpSync(distSource, rootDist, { recursive: true });
  console.log("==> Copied dist to root:", rootDist);
}

console.log("==> Build successfully completed!");
