import { createRoot } from "react-dom/client";
import { Dashboard, createMockDashboardStatus } from "./Dashboard.js";
import { fetchDashboardStatus } from "./daemon-status.js";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Missing #root element.");
}

const reactRoot = createRoot(root);
reactRoot.render(<Dashboard status={createMockDashboardStatus()} />);

fetchDashboardStatus({
  baseUrl: import.meta.env.VITE_DORE_DAEMON_URL ?? "http://127.0.0.1:3173"
}).then((status) => {
  reactRoot.render(<Dashboard status={status} />);
});
