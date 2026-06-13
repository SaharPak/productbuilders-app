import type { ProductStatus } from "@/types/database";

const STATUS_CONFIG: Record<
  ProductStatus,
  { label: string; className: string }
> = {
  pending: {
    label: "Pending review",
    className: "bg-stage-idea/15 text-stage-idea",
  },
  live: {
    label: "Approved",
    className: "bg-stage-launched/15 text-stage-launched",
  },
  rejected: {
    label: "Not approved",
    className: "bg-red-100 text-red-600",
  },
  hidden: {
    label: "Hidden",
    className: "bg-ink/10 text-ink-muted",
  },
  removed: {
    label: "Removed",
    className: "bg-ink/10 text-ink-muted",
  },
};

export function StatusBadge({ status }: { status: ProductStatus }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  return (
    <span
      className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${config.className}`}
    >
      {config.label}
    </span>
  );
}

export function statusLabel(status: ProductStatus): string {
  return (STATUS_CONFIG[status] ?? STATUS_CONFIG.pending).label;
}
