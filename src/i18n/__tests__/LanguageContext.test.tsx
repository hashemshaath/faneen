import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { LanguageProvider, useLanguage } from "@/i18n/LanguageContext";

const Probe: React.FC = () => {
  const { language, setLanguage, dir, isRTL } = useLanguage();
  return (
    <div>
      <span data-testid="lang">{language}</span>
      <span data-testid="dir">{dir}</span>
      <span data-testid="rtl">{String(isRTL)}</span>
      <button onClick={() => setLanguage("en")}>to-en</button>
      <button onClick={() => setLanguage("ar")}>to-ar</button>
    </div>
  );
};

describe("LanguageContext — no faneen_* legacy dependency", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("defaults to Arabic when no language is stored", () => {
    render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>,
    );
    expect(screen.getByTestId("lang").textContent).toBe("ar");
    expect(screen.getByTestId("dir").textContent).toBe("rtl");
    expect(screen.getByTestId("rtl").textContent).toBe("true");
  });

  it("ignores legacy faneen_* keys completely", () => {
    // Pre-seed the legacy keys a beta tester might still have.
    localStorage.setItem("faneen_lang", "en");
    localStorage.setItem("faneen_language", "en");
    localStorage.setItem("faneen_locale", "en");

    render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>,
    );

    // Should still default to Arabic — legacy keys must NOT influence anything.
    expect(screen.getByTestId("lang").textContent).toBe("ar");
  });

  it("only reads/writes the qitaat_lang key (no faneen_* access)", () => {
    const getSpy = vi.spyOn(Storage.prototype, "getItem");
    const setSpy = vi.spyOn(Storage.prototype, "setItem");

    render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>,
    );

    act(() => {
      screen.getByText("to-en").click();
    });

    const allKeys = [
      ...getSpy.mock.calls.map((c) => String(c[0])),
      ...setSpy.mock.calls.map((c) => String(c[0])),
    ];

    // No faneen_* key should ever be touched.
    expect(allKeys.some((k) => k.startsWith("faneen_"))).toBe(false);
    // The new namespaced key must be the one persisted.
    expect(localStorage.getItem("qitaat_lang")).toBe("en");
  });

  it("persists the user's choice to qitaat_lang and updates direction", () => {
    render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>,
    );

    act(() => {
      screen.getByText("to-en").click();
    });
    expect(screen.getByTestId("lang").textContent).toBe("en");
    expect(screen.getByTestId("dir").textContent).toBe("ltr");
    expect(screen.getByTestId("rtl").textContent).toBe("false");
    expect(localStorage.getItem("qitaat_lang")).toBe("en");

    act(() => {
      screen.getByText("to-ar").click();
    });
    expect(screen.getByTestId("lang").textContent).toBe("ar");
    expect(localStorage.getItem("qitaat_lang")).toBe("ar");
  });

  it("rehydrates from qitaat_lang on next mount (en persists across reloads)", () => {
    localStorage.setItem("qitaat_lang", "en");

    render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>,
    );

    expect(screen.getByTestId("lang").textContent).toBe("en");
    expect(screen.getByTestId("dir").textContent).toBe("ltr");
  });
});
