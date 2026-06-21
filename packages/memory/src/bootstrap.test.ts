import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { bootstrapMemory } from "./index.js";

describe("memory bootstrap", () => {
  it("creates required memory directories and wiki index", async () => {
    const root = await mkdtemp(join(tmpdir(), "dore-memory-"));
    try {
      const result = await bootstrapMemory(root);

      expect(result.createdPaths).toEqual(
        expect.arrayContaining([
          join(root, "raw"),
          join(root, "wiki"),
          join(root, "operations"),
          join(root, "logs"),
          join(root, "wiki", "index.md")
        ])
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

