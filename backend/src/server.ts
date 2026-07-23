import { buildApp } from "./app.js";

const app = buildApp();
const port = 3333;

try {
  await app.listen({
    host: "0.0.0.0",
    port
  });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
