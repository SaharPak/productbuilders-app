"use server";

import { createClient } from "@/lib/supabase/server";

export async function updateProfile(displayName: string, handle: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  if (!/^[a-z0-9_]{3,30}$/.test(handle)) {
    return { error: "Handle must be 3-30 characters: lowercase letters, numbers, or underscores." };
  }

  if (!displayName || displayName.length > 50) {
    return { error: "Display name is required (max 50 characters)." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ display_name: displayName, handle })
    .eq("id", user.id);

  if (error) {
    if (error.message.includes("duplicate") || error.message.includes("unique")) {
      return { error: "That handle is already taken. Try another." };
    }
    return { error: error.message };
  }

  return { error: null };
}
