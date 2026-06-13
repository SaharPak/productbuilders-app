import { isMockMode } from "@/lib/mock-data";

/**
 * Fixed banner shown only when the app runs on demo data (no Supabase config).
 * Server component: reads env at render time.
 */
export function DemoModeBanner() {
  if (!isMockMode()) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2">
      <div className="flex items-center gap-3 rounded-full border border-border bg-ink px-4 py-2 text-paper-bg shadow-lg">
        <span className="text-base">🧪</span>
        <p className="text-xs leading-tight">
          <span className="font-semibold">Demo data.</span> You&apos;re exploring
          sample content. Add Supabase keys to <code>.env.local</code> to go live.
        </p>
      </div>
    </div>
  );
}
