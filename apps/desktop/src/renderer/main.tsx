import { createRoot } from "react-dom/client";
import { Dashboard, createMockDashboardStatus } from "./Dashboard.js";
import { createDaemonTaskClient, fetchDashboardStatus } from "./daemon-status.js";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Missing #root element.");
}

const reactRoot = createRoot(root);
const daemonBaseUrl = import.meta.env.VITE_DORE_DAEMON_URL ?? "http://127.0.0.1:3173";
const taskClient = createDaemonTaskClient({
  baseUrl: daemonBaseUrl
});

reactRoot.render(<Dashboard status={createMockDashboardStatus()} taskClient={taskClient} />);

fetchDashboardStatus({
  baseUrl: daemonBaseUrl
}).then((status) => {
  reactRoot.render(<Dashboard status={status} taskClient={taskClient} />);
});
