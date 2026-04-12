import { describe, it, expect } from "vitest";
import { getLocalizedValue } from "../direction";

describe("getLocalizedValue", () => {
  it("returns Arabic value when language is 'ar'", () => {
    expect(getLocalizedValue("ar", "عربي", "English")).toBe("عربي");
  });

  it("returns English value when language is 'en'", () => {
    expect(getLocalizedValue("en", "عربي", "English")).toBe("English");
  });

  it("falls back to the other language if preferred is null", () => {
    expect(getLocalizedValue("ar", null, "English")).toBe("English");
    expect(getLocalizedValue("en", "عربي", null)).toBe("عربي");
  });

  it("returns fallback when both are null", () => {
    expect(getLocalizedValue("ar", null, null, "—")).toBe("—");
  });

  it("returns empty string as default fallback", () => {
    expect(getLocalizedValue("en", null, null)).toBe("");
  });
});
