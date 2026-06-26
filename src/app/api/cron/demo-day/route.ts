import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: weekData, error: weekError } = await supabase.rpc("current_week");
  const weekOf = weekData;

  if (weekError) {
    return NextResponse.json(
      { error: `Could not determine current week: ${weekError.message}` },
      { status: 500 }
    );
  }

  if (!weekOf) {
    return NextResponse.json({ error: "Could not determine current week" }, { status: 500 });
  }

  const { data: topProducts, error: productsError } = await supabase
    .from("product_with_counts")
    .select("id, vote_count, week_of")
    .eq("week_of", weekOf)
    .order("vote_count", { ascending: false })
    .limit(3);

  if (productsError) {
    return NextResponse.json({ error: productsError.message }, { status: 500 });
  }

  if (!topProducts || topProducts.length === 0) {
    return NextResponse.json({ message: "No products this week", weekOf });
  }

  const { error: demoError } = await supabase.from("demo_days").upsert({
    week_of: weekOf,
    demo_date: new Date().toISOString(),
    status: "completed",
  });

  if (demoError) {
    return NextResponse.json({ error: demoError.message }, { status: 500 });
  }

  for (let i = 0; i < topProducts.length; i++) {
    const { error: winnerError } = await supabase.from("demo_day_winners").upsert({
      week_of: weekOf,
      rank: i + 1,
      product_id: topProducts[i].id,
      vote_count: topProducts[i].vote_count,
    });

    if (winnerError) {
      return NextResponse.json(
        { error: `Failed to record winner ${i + 1}: ${winnerError.message}` },
        { status: 500 }
      );
    }
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
