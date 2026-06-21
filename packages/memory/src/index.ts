import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

export interface MemoryBootstrapResult {
  root: string;
  createdPaths: string[];
}

export async function bootstrapMemory(root = "memory"): Promise<MemoryBootstrapResult> {
  const dirs = [
    "raw",
    "raw/inbox",
    "raw/market",
    "raw/broker",
    "raw/news",
    "raw/projects",
    "wiki",
    "wiki/profile",
    "wiki/projects",
    "wiki/trading",
    "wiki/engineering",
    "operations",
    "logs",
    "logs/daily",
    "logs/trading",
    "logs/usage"
  ];
  const createdPaths: string[] = [];

  for (const dir of dirs) {
    const path = join(root, dir);
    await mkdir(path, { recursive: true });
    createdPaths.push(path);
  }

  const indexPath = join(root, "wiki", "index.md");
  await writeFile(indexPath, "# Dore Memory Index\n\n", { flag: "a" });
  createdPaths.push(indexPath);

  return { root, createdPaths };
}

