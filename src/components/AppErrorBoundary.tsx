import { Component, type ReactNode } from "react";

/**
 * Catches any render-time crash (e.g. a component that resolves to undefined)
 * and shows a friendly recovery screen instead of a blank white page.
 */
export class AppErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("AppErrorBoundary caught a render error:", error);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center bg-[#faf9f6] px-6 text-center">
        <div className="glass-panel w-full max-w-md rounded-3xl px-8 py-10">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-forest-600 text-2xl text-white">
            ☁️
          </div>
          <h1 className="mt-5 font-serif text-2xl font-semibold tracking-tight text-ink">
            Something went wrong
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[#6e6a60]">
            This page hit a hiccup while loading. Reloading usually fixes it —
            your plan and progress are safe.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <button
              onClick={() => window.location.reload()}
              className="rounded-xl bg-ink px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-ink/90"
            >
              Reload page
            </button>
            <button
              onClick={() => {
                window.location.href = "/";
              }}
              className="rounded-xl border border-hairline bg-white px-5 py-2.5 text-sm font-semibold text-[#6e6a60] transition-colors hover:border-forest-300 hover:text-forest-700"
            >
              Back to home
            </button>
          </div>
        </div>
      </div>
    );
  }
}
