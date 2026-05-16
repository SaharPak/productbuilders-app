"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { currentWeekOf } from "@/lib/week";
import type { Category, Stage } from "@/types/database";

const CATEGORIES: Category[] = [
  "AI",
  "Developer Tool",
  "Web App",
  "Mobile",
  "Community",
  "Other",
];

const STAGES: { value: Stage; label: string; color: string }[] = [
  { value: "idea", label: "Idea", color: "bg-stage-idea" },
  { value: "building", label: "Building", color: "bg-stage-building" },
  { value: "launched", label: "Launched", color: "bg-stage-launched" },
];

export default function SubmitPage() {
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [stage, setStage] = useState<Stage>("building");
  const [category, setCategory] = useState<Category>("AI");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login?redirect=/submit");
      return;
    }

    let image_url: string | null = null;

    if (imageFile) {
      const ext = imageFile.name.split(".").pop();
      const path = `products/${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(path, imageFile, { upsert: true });

      if (uploadError) {
        setError("Failed to upload image. Try again.");
        setLoading(false);
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("product-images").getPublicUrl(path);
      image_url = publicUrl;
    }

    const { data, error: insertError } = await supabase
      .from("products")
      .insert({
        builder_id: user.id,
        name: name.trim(),
        tagline: tagline.trim(),
        description: description.trim() || null,
        url: url.trim() || null,
        image_url,
        category,
        stage,
        week_of: currentWeekOf(),
      })
      .select("id")
      .single();

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    router.push(`/p/${data.id}`);
  }

  return (
    <div className="mx-auto max-w-lg px-4 pt-24 pb-16 sm:px-6">
      <h1 className="font-display text-3xl font-black text-ink">
        Submit your product
      </h1>
      <p className="mt-2 text-sm text-ink-muted">
        The best submissions are honest about where they are.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <div>
          <label className="mb-1 block font-mono text-xs text-ink-faint">
            Product name <span className="text-persimmon">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My awesome tool"
            required
            maxLength={50}
            className="w-full rounded-xl border border-border bg-card-bg px-4 py-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-persimmon"
          />
          <p className="mt-1 text-right font-mono text-xs text-ink-faint">
            {name.length}/50
          </p>
        </div>

        <div>
          <label className="mb-1 block font-mono text-xs text-ink-faint">
            Tagline <span className="text-persimmon">*</span>
          </label>
          <input
            type="text"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            placeholder="One line that sells it"
            required
            maxLength={120}
            className="w-full rounded-xl border border-border bg-card-bg px-4 py-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-persimmon"
          />
          <p className="mt-1 text-right font-mono text-xs text-ink-faint">
            {tagline.length}/120
          </p>
        </div>

        <div>
          <label className="mb-1 block font-mono text-xs text-ink-faint">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What problem does it solve? How does it work?"
            maxLength={1000}
            rows={4}
            className="w-full resize-none rounded-xl border border-border bg-card-bg px-4 py-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-persimmon"
          />
          <p className="mt-1 text-right font-mono text-xs text-ink-faint">
            {description.length}/1000
          </p>
        </div>

        <div>
          <label className="mb-1 block font-mono text-xs text-ink-faint">
            Demo / site URL
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://"
            className="w-full rounded-xl border border-border bg-card-bg px-4 py-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-persimmon"
          />
        </div>

        <div>
          <label className="mb-1 block font-mono text-xs text-ink-faint">
            Product image
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
            className="w-full text-sm text-ink-muted file:mr-3 file:rounded-lg file:border-0 file:bg-paper-bg-deep file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-ink-muted"
          />
          <p className="mt-1 font-mono text-xs text-ink-faint">Max 2MB</p>
        </div>

        <div>
          <label className="mb-2 block font-mono text-xs text-ink-faint">
            Stage <span className="text-persimmon">*</span>
          </label>
          <div className="flex gap-2">
            {STAGES.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setStage(s.value)}
                className={`flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-medium transition-all ${
                  stage === s.value
                    ? "border-ink bg-ink text-paper-bg"
                    : "border-border text-ink-muted hover:border-border-strong"
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${s.color}`} />
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-2 block font-mono text-xs text-ink-faint">
            Category <span className="text-persimmon">*</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-all ${
                  category === c
                    ? "border-ink bg-ink text-paper-bg"
                    : "border-border text-ink-muted hover:border-border-strong"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || !name.trim() || !tagline.trim()}
          className="w-full rounded-xl bg-persimmon px-4 py-3 text-sm font-semibold text-white transition-all hover:scale-[1.01] hover:bg-persimmon-hover active:scale-[0.99] disabled:opacity-50"
        >
          {loading ? "Submitting..." : "Submit product"}
        </button>
      </form>
    </div>
  );
}
