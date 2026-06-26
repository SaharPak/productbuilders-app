import type { ProductBuilder } from "@/types/database";

export function parseBuilder(
  builder: ProductBuilder | string | null | undefined
): ProductBuilder | null {
  if (!builder) return null;
  if (typeof builder !== "string") return builder;

  try {
    return JSON.parse(builder) as ProductBuilder;
  } catch {
    return null;
  }
}
