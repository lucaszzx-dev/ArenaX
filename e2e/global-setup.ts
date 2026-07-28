import { execSync } from "node:child_process";

export default function globalSetup() {
  execSync("pnpm --dir backend run db:seed", {
    cwd: process.cwd(),
    stdio: "inherit"
  });
}
