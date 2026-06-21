import { createDaemonApp } from "./server.js";

const port = Number(process.env.DORE_DAEMON_PORT ?? 3173);
const host = process.env.DORE_DAEMON_HOST ?? "127.0.0.1";
const app = createDaemonApp({
  configLoaded: true,
  memoryReady: true
});

await app.listen({ host, port });
console.log(`Dore daemon listening on http://${host}:${port}`);

