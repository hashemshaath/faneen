import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ErrorBoundary } from "../ErrorBoundary";

const ThrowingComponent = () => {
  throw new Error("Test error");
};

const GoodComponent = () => <div>Everything is fine</div>;

describe("ErrorBoundary", () => {
  it("renders children when no error", () => {
    render(
      <ErrorBoundary>
        <GoodComponent />
      </ErrorBoundary>
    );
    expect(screen.getByText("Everything is fine")).toBeInTheDocument();
  });

  it("shows Arabic error message when child throws", () => {
    // Suppress console.error for the intentional throw
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText("حدث خطأ غير متوقع")).toBeInTheDocument();
    expect(screen.getByText("إعادة التحميل")).toBeInTheDocument();
    expect(screen.getByText("الرئيسية")).toBeInTheDocument();

    spy.mockRestore();
  });
});
