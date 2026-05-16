import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border py-8 text-center">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
          <p className="font-mono text-xs text-ink-faint">
            &copy; {new Date().getFullYear()} productbuilders.app
          </p>
          <div className="flex gap-4">
            <Link
              href="/demo-days"
              className="font-mono text-xs text-ink-faint transition-colors hover:text-ink-muted"
            >
              Archive
            </Link>
            <a
              href="https://github.com/SaharPak/productbuilders-app"
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs text-ink-faint transition-colors hover:text-ink-muted"
            >
              GitHub
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
