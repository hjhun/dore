import { describe, expect, it } from "vitest";
import { resolveEngineeringIntakeIdea } from "./engineering-intake.js";

describe("engineering intake CLI", () => {
  it("uses CLI arguments before environment fallback", () => {
    expect(
      resolveEngineeringIntakeIdea(["node", "engineering-intake.ts", "Build", "review", "summary"], {
        DORE_ENGINEERING_IDEA: "Use env idea"
      })
    ).toBe("Build review summary");
  });

  it("uses DORE_ENGINEERING_IDEA when no CLI idea is provided", () => {
    expect(
      resolveEngineeringIntakeIdea(["node", "engineering-intake.ts"], {
        DORE_ENGINEERING_IDEA: "Persist generated drafts"
      })
    ).toBe("Persist generated drafts");
  });

  it("returns null when no idea is provided", () => {
    expect(resolveEngineeringIntakeIdea(["node", "engineering-intake.ts"], {})).toBeNull();
  });
});
