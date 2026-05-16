import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "edge";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get current week_of (Monday of this week in Helsinki time)
  const { data: weekData } = await supabase.rpc("current_week");
  const weekOf = weekData;

  if (!weekOf) {
    return NextResponse.json({ error: "Could not determine current week" }, { status: 500 });
  }

  // Get top 3 products for the week
  const { data: topProducts } = await supabase
    .from("product_with_counts")
    .select("id, vote_count, week_of")
    .eq("week_of", weekOf)
    .order("vote_count", { ascending: false })
    .limit(3);

  if (!topProducts || topProducts.length === 0) {
    return NextResponse.json({ message: "No products this week", weekOf });
  }

  // Upsert demo day
  await supabase.from("demo_days").upsert({
    week_of: weekOf,
    demo_date: new Date().toISOString(),
    status: "completed",
  });

  // Insert winners
  for (let i = 0; i < topProducts.length; i++) {
    await supabase.from("demo_day_winners").upsert({
      week_of: weekOf,
      rank: i + 1,
      product_id: topProducts[i].id,
      vote_count: topProducts[i].vote_count,
    });
  }

  return NextResponse.json({
    success: true,
    weekOf,
    winners: topProducts.map((p, i) => ({
      rank: i + 1,
      productId: p.id,
      votes: p.vote_count,
    })),
  });
}
