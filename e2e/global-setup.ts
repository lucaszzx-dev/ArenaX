import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

export default function globalSetup() {
  const distSeed = path.join(process.cwd(), "backend", "dist", "db", "seed.js");
  if (existsSync(distSeed)) {
    execSync(`node "${distSeed}"`, {
      cwd: path.join(process.cwd(), "backend"),
      stdio: "inherit"
    });
    return;
  }
  execSync("pnpm --dir backend run db:seed", {
    cwd: process.cwd(),
    stdio: "inherit"
  });
}
