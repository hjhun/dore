import { createRoot } from "react-dom/client";
import { Dashboard, createMockDashboardStatus } from "./Dashboard.js";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Missing #root element.");
}

createRoot(root).render(<Dashboard status={createMockDashboardStatus()} />);

