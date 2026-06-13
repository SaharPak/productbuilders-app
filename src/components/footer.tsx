import Link from "next/link";

const SOCIALS: { name: string; href: string; icon: React.ReactNode }[] = [];

export function Footer() {
  return (
    <footer className="border-t border-border py-8">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:justify-between">
          <p className="font-mono text-xs text-ink-faint">
            Built by{" "}
            <a
              href="https://techimmigrants.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-ink-muted transition-colors hover:text-persimmon"
            >
              Tech Immigrants
            </a>
          </p>

          <div className="flex items-center gap-4">
            <Link
              href="/demo-days"
              className="font-mono text-xs text-ink-faint transition-colors hover:text-ink-muted"
            >
              Archive
            </Link>
            {SOCIALS.map((s) => (
              <a
                key={s.name}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                title={s.name}
                className="text-ink-faint transition-colors hover:text-persimmon"
              >
                {s.icon}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
