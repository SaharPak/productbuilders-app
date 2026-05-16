import type { Stage } from "@/types/database";

const config: Record<Stage, { color: string; label: string }> = {
  idea: { color: "bg-stage-idea", label: "Idea" },
  building: { color: "bg-stage-building", label: "Building" },
  launched: { color: "bg-stage-launched", label: "Launched" },
};

export function StageDot({ stage }: { stage: Stage }) {
  const { color, label } = config[stage];
  return (
    <span className="inline-flex items-center gap-1 text-xs text-ink-faint">
      <span className={`h-1.5 w-1.5 rounded-full ${color}`} />
      {label}
    </span>
  );
}
