import { describe, it, expect } from "vitest";
import { cn } from "../utils";

describe("cn (class merging)", () => {
  it("merges multiple class strings", () => {
    expect(cn("px-2", "py-1")).toBe("px-2 py-1");
  });

  it("resolves tailwind conflicts (last wins)", () => {
    const result = cn("px-2", "px-4");
    expect(result).toBe("px-4");
  });

  it("handles conditional classes", () => {
    const condition = false as boolean;
    const result = cn("base", condition && "hidden", "extra");
    expect(result).toBe("base extra");
  });

  it("returns empty string for no input", () => {
    expect(cn()).toBe("");
  });
});
