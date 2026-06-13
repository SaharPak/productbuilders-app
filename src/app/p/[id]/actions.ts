"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Category, Stage, DemoType, DemoLanguage } from "@/types/database";

export async function updateProduct(
  productId: string,
  data: {
    name: string;
    tagline: string;
    description?: string | null;
    problem?: string | null;
    audience?: string | null;
    url?: string | null;
    category: Category;
    stage: Stage;
    demo_type: DemoType;
    demo_week?: string | null;
    demo_language?: DemoLanguage | null;
  }
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { data: existing } = await supabase
    .from("products")
    .select("builder_id")
    .eq("id", productId)
    .single();

  if (!existing || existing.builder_id !== user.id) {
    return { error: "You can only edit your own products." };
  }

  const { error } = await supabase
    .from("products")
    .update({
      name: data.name.trim(),
      tagline: data.tagline.trim(),
      description: data.description?.trim() || null,
      problem: data.problem?.trim() || null,
      audience: data.audience?.trim() || null,
      url: data.url?.trim() || null,
      category: data.category,
      stage: data.stage,
      demo_type: data.demo_type,
      demo_week: data.demo_type === "live_demo" ? data.demo_week : null,
      demo_language: data.demo_type === "live_demo" ? data.demo_language : null,
    })
    .eq("id", productId);

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}

export async function deleteProduct(productId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { data: existing } = await supabase
    .from("products")
    .select("builder_id")
    .eq("id", productId)
    .single();

  if (!existing || existing.builder_id !== user.id) {
    return { error: "You can only delete your own products." };
  }

  const { error } = await supabase
    .from("products")
    .update({ status: "removed" })
    .eq("id", productId);

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}
