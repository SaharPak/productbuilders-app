"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { currentWeekOf, upcomingDemoFridays, demoTimezones } from "@/lib/week";
import type { Category, Stage, DemoType, DemoLanguage } from "@/types/database";

const CATEGORIES: Category[] = [
  "AI",
  "Developer Tool",
  "Web App",
  "Mobile",
  "Community",
  "Other",
];

const STAGES: { value: Stage; label: string; desc: string; color: string }[] = [
  { value: "idea", label: "Idea", desc: "Still figuring it out", color: "bg-stage-idea" },
  { value: "building", label: "Building", desc: "Work in progress", color: "bg-stage-building" },
  { value: "launched", label: "Launched", desc: "It's out there!", color: "bg-stage-launched" },
];

export default function SubmitPage() {
  const [step, setStep] = useState(1);
  const [demoType, setDemoType] = useState<DemoType | null>(null);
  const [demoWeek, setDemoWeek] = useState<string | null>(null);
  const [demoLanguage, setDemoLanguage] = useState<DemoLanguage>("english");
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [problem, setProblem] = useState("");
  const [audience, setAudience] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [stage, setStage] = useState<Stage>("building");
  const [category, setCategory] = useState<Category>("AI");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const supabase = createClient();
  const fridays = upcomingDemoFridays(4);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (file && file.size > 2 * 1024 * 1024) {
      setError("Image must be under 2 MB.");
      return;
    }
    setError(null);
    setImageFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setImagePreview(null);
    }
  }

  function handleDemoChoice(type: DemoType) {
    setDemoType(type);
    if (type === "feedback_only") {
      setDemoWeek(null);
      setStep(2);
    } else {
      setStep(1.5 as unknown as number);
    }
  }

  function handleWeekPick(date: string) {
    setDemoWeek(date);
  }

  function handleLanguageAndContinue() {
    setStep(2);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
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

    let finalUrl = url.trim() || null;
    if (finalUrl && !/^https?:\/\//i.test(finalUrl)) {
      finalUrl = `https://${finalUrl}`;
    }

    const insertPayload: Record<string, unknown> = {
      builder_id: user.id,
      name: name.trim(),
      tagline: tagline.trim(),
      description: description.trim() || null,
      problem: problem.trim() || null,
      audience: audience.trim() || null,
      url: finalUrl,
      image_url,
      category,
      stage,
      demo_type: demoType ?? "feedback_only",
      demo_week: demoWeek,
      demo_language: demoType === "live_demo" ? demoLanguage : null,
      week_of: currentWeekOf(),
    };

    let data: { id: string } | null = null;
    let insertError: { message: string } | null = null;

    const result = await supabase
      .from("products")
      .insert(insertPayload)
      .select("id")
      .single();

    data = result.data;
    insertError = result.error;

    if (insertError?.message?.includes("column")) {
      const safePayload: Record<string, unknown> = {
        builder_id: user.id,
        name: name.trim(),
        tagline: tagline.trim(),
        description: description.trim() || null,
        url: finalUrl,
        image_url,
        category,
        stage,
        week_of: currentWeekOf(),
      };
      const retry = await supabase
        .from("products")
        .insert(safePayload)
        .select("id")
        .single();
      data = retry.data;
      insertError = retry.error;
    }

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    if (!data) {
      setError("Something went wrong. Please try again.");
      setLoading(false);
      return;
    }

    router.push(demoType === "live_demo" ? `/p/${data.id}/prep` : `/p/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  const canSubmit = name.trim() && tagline.trim() && demoType;

  return (
    <div className="mx-auto max-w-lg px-4 pt-24 pb-16 sm:px-6">
      {/* Progress indicator */}
      <div className="mb-8 flex items-center gap-2">
        {[1, 2].map((s) => (
          <div
            key={s}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              step >= s ? "bg-persimmon" : "bg-border"
            }`}
          />
        ))}
      </div>

      {/* Step 1: Choose your path */}
      {step === 1 && (
        <div className="space-y-6">
          <div>
            <h1 className="font-display text-3xl font-black text-ink">
              Show the world what you&apos;re building
            </h1>
            <p className="mt-3 text-base leading-relaxed text-ink-muted">
              Whether it&apos;s a half-baked idea or a polished product, this is
              your chance to share it with fellow builders. Get honest feedback,
              find collaborators, or just put it out there.
            </p>
          </div>

          <div>
            <p className="mb-3 font-mono text-xs font-medium uppercase tracking-wider text-ink-faint">
              How would you like to share?
            </p>
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => handleDemoChoice("live_demo")}
                className="group w-full rounded-2xl border-2 border-border bg-card-bg p-5 text-left transition-all hover:border-persimmon hover:shadow-sm"
              >
                <div className="flex items-start gap-4">
                  <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-persimmon-light text-lg">
                    🎤
                  </span>
                  <div>
                    <p className="font-display text-lg font-bold text-ink">
                      Showcase it live
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-ink-muted">
                      Present your project at our friendly Friday Showcase on
                      Google Meet. It&apos;s casual, supportive, and a great way
                      to get real-time reactions.
                    </p>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleDemoChoice("feedback_only")}
                className="group w-full rounded-2xl border-2 border-border bg-card-bg p-5 text-left transition-all hover:border-sage hover:shadow-sm"
              >
                <div className="flex items-start gap-4">
                  <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sage-light text-lg">
                    💬
                  </span>
                  <div>
                    <p className="font-display text-lg font-bold text-ink">
                      Share for feedback
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-ink-muted">
                      Post your project and let the community leave comments,
                      ideas, and encouragement. No pressure, no live call needed.
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 1.5: Pick a Friday (live demo only) */}
      {step === (1.5 as unknown as number) && (
        <div className="space-y-6">
          <div>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="mb-4 text-sm font-medium text-ink-muted transition-colors hover:text-ink"
            >
              &larr; Back
            </button>
            <h1 className="font-display text-3xl font-black text-ink">
              Pick your Friday
            </h1>
            <p className="mt-3 text-base leading-relaxed text-ink-muted">
              Our Friday Showcase happens weekly on Google Meet. Pick whichever
              week works best — you can always change it later.
            </p>
          </div>

          {/* Timezone reference */}
          <div className="rounded-xl border border-border bg-paper-bg-deep px-4 py-3">
            <p className="mb-2 font-mono text-[10px] font-medium uppercase tracking-widest text-ink-faint">
              Session times
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              {demoTimezones().map((t) => (
                <div key={t.tz} className="flex items-baseline justify-between gap-2">
                  <span className="text-xs text-ink-faint">{t.tz}</span>
                  <span className="font-mono text-xs font-medium text-ink-muted">
                    {t.time}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            {fridays.map((f) => (
              <button
                key={f.date}
                type="button"
                onClick={() => handleWeekPick(f.date)}
                className={`w-full rounded-xl border-2 px-5 py-4 text-left transition-all ${
                  demoWeek === f.date
                    ? "border-persimmon bg-persimmon-light"
                    : "border-border bg-card-bg hover:border-border-strong"
                }`}
              >
                <p className="font-display text-base font-bold text-ink">
                  {f.label}
                </p>
                <p className="mt-0.5 font-mono text-xs text-ink-faint">
                  3:00 PM Iran time
                </p>
              </button>
            ))}
          </div>

          {demoWeek && (
            <>
              <div>
                <p className="mb-3 font-mono text-xs font-medium uppercase tracking-wider text-ink-faint">
                  What language do you prefer to demo in?
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDemoLanguage("english")}
                    className={`rounded-xl border-2 px-4 py-3 text-center transition-all ${
                      demoLanguage === "english"
                        ? "border-persimmon bg-persimmon-light"
                        : "border-border bg-card-bg hover:border-border-strong"
                    }`}
                  >
                    <span className="text-lg">🇬🇧</span>
                    <p className="mt-1 text-sm font-semibold text-ink">English</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDemoLanguage("farsi")}
                    className={`rounded-xl border-2 px-4 py-3 text-center transition-all ${
                      demoLanguage === "farsi"
                        ? "border-persimmon bg-persimmon-light"
                        : "border-border bg-card-bg hover:border-border-strong"
                    }`}
                  >
                    <span className="text-lg">🇮🇷</span>
                    <p className="mt-1 text-sm font-semibold text-ink">فارسی</p>
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={handleLanguageAndContinue}
                className="w-full rounded-xl bg-persimmon px-4 py-3 text-sm font-semibold text-white transition-all hover:scale-[1.01] hover:bg-persimmon-hover active:scale-[0.99]"
              >
                Continue
              </button>
            </>
          )}
        </div>
      )}

      {/* Step 2: Project details */}
      {step === 2 && (
        <div>
          <button
            type="button"
            onClick={() => setStep(demoType === "live_demo" ? (1.5 as unknown as number) : 1)}
            className="mb-4 text-sm font-medium text-ink-muted transition-colors hover:text-ink"
          >
            &larr; Back
          </button>

          {demoType === "live_demo" && demoWeek && (
            <div className="mb-6 flex items-center gap-2 rounded-xl bg-persimmon-light px-4 py-3">
              <span>🎤</span>
              <p className="text-sm font-medium text-ink">
                Live demo on{" "}
                {fridays.find((f) => f.date === demoWeek)?.label ?? demoWeek}
                {" · "}
                {demoLanguage === "farsi" ? "فارسی" : "English"}
              </p>
            </div>
          )}
          {demoType === "feedback_only" && (
            <div className="mb-6 flex items-center gap-2 rounded-xl bg-sage-light px-4 py-3">
              <span>💬</span>
              <p className="text-sm font-medium text-ink">
                Sharing for community feedback
              </p>
            </div>
          )}

          <h1 className="font-display text-3xl font-black text-ink">
            Tell us about your project
          </h1>
          <p className="mt-2 text-sm text-ink-muted">
            Don&apos;t overthink it — just share what you&apos;ve got. Early
            ideas are just as welcome as finished products.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            {/* Name */}
            <div>
              <label className="mb-1 block text-sm font-semibold text-ink">
                What&apos;s it called? <span className="text-persimmon">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. MealMind, CodeBuddy, TrailLog"
                required
                maxLength={50}
                className="w-full rounded-xl border border-border bg-card-bg px-4 py-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-persimmon"
              />
              <p className="mt-1 text-right font-mono text-xs text-ink-faint">
                {name.length}/50
              </p>
            </div>

            {/* Tagline */}
            <div>
              <label className="mb-1 block text-sm font-semibold text-ink">
                One-liner that hooks people <span className="text-persimmon">*</span>
              </label>
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="e.g. AI plant care buddy that knows what your plants need"
                required
                maxLength={120}
                className="w-full rounded-xl border border-border bg-card-bg px-4 py-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-persimmon"
              />
              <p className="mt-1 text-right font-mono text-xs text-ink-faint">
                {tagline.length}/120
              </p>
            </div>

            {/* Problem */}
            <div>
              <label className="mb-1 block text-sm font-semibold text-ink">
                What problem does it solve?
              </label>
              <p className="mb-2 text-xs text-ink-faint">
                Help people understand the &quot;why&quot; behind your project.
              </p>
              <textarea
                value={problem}
                onChange={(e) => setProblem(e.target.value)}
                placeholder="e.g. Most job seekers get zero feedback on their CV. They apply to 50 jobs and hear nothing back."
                maxLength={500}
                rows={3}
                className="w-full resize-none rounded-xl border border-border bg-card-bg px-4 py-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-persimmon"
              />
              <p className="mt-1 text-right font-mono text-xs text-ink-faint">
                {problem.length}/500
              </p>
            </div>

            {/* Audience */}
            <div>
              <label className="mb-1 block text-sm font-semibold text-ink">
                Who is it for?
              </label>
              <input
                type="text"
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                placeholder="e.g. Junior developers looking for their first job"
                maxLength={300}
                className="w-full rounded-xl border border-border bg-card-bg px-4 py-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-persimmon"
              />
            </div>

            {/* Description */}
            <div>
              <label className="mb-1 block text-sm font-semibold text-ink">
                Anything else you want to share?
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="How does it work? What tech are you using? What's your vision?"
                maxLength={1000}
                rows={4}
                className="w-full resize-none rounded-xl border border-border bg-card-bg px-4 py-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-persimmon"
              />
              <p className="mt-1 text-right font-mono text-xs text-ink-faint">
                {description.length}/1000
              </p>
            </div>

            {/* URL */}
            <div>
              <label className="mb-1 block text-sm font-semibold text-ink">
                Link to your project
              </label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="yourproject.com"
                className="w-full rounded-xl border border-border bg-card-bg px-4 py-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-persimmon"
              />
              <p className="mt-1 text-xs text-ink-faint">
                We&apos;ll add https:// if you forget it.
              </p>
            </div>

            {/* Image */}
            <div>
              <label className="mb-1 block text-sm font-semibold text-ink">
                Add a screenshot or logo
              </label>
              <p className="mb-2 text-xs text-ink-faint">
                A visual goes a long way — even a rough screenshot works.
              </p>
              {imagePreview ? (
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element -- local data-URL preview of a user-selected file, not an optimizable remote image */}
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full rounded-xl border border-border object-cover"
                    style={{ maxHeight: 200 }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setImageFile(null);
                      setImagePreview(null);
                    }}
                    className="absolute top-2 right-2 rounded-full bg-ink/70 px-2 py-0.5 text-xs text-white"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-card-bg py-8 transition-colors hover:border-border-strong">
                  <span className="text-2xl">📷</span>
                  <span className="mt-2 text-sm font-medium text-ink-muted">
                    Click to upload
                  </span>
                  <span className="mt-1 font-mono text-xs text-ink-faint">
                    PNG, JPG up to 2 MB
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Stage */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-ink">
                Where are you at? <span className="text-persimmon">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {STAGES.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setStage(s.value)}
                    className={`flex flex-col items-center gap-1 rounded-xl border-2 px-3 py-3 text-center transition-all ${
                      stage === s.value
                        ? "border-ink bg-ink text-paper-bg"
                        : "border-border text-ink-muted hover:border-border-strong"
                    }`}
                  >
                    <span className="flex items-center gap-1.5 text-sm font-semibold">
                      <span className={`h-2 w-2 rounded-full ${s.color}`} />
                      {s.label}
                    </span>
                    <span
                      className={`text-xs ${
                        stage === s.value ? "text-paper-bg/60" : "text-ink-faint"
                      }`}
                    >
                      {s.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-ink">
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
              disabled={loading || !canSubmit}
              className="w-full rounded-xl bg-persimmon px-4 py-3.5 text-base font-semibold text-white transition-all hover:scale-[1.01] hover:bg-persimmon-hover active:scale-[0.99] disabled:opacity-50"
            >
              {loading
                ? "Sharing..."
                : demoType === "live_demo"
                  ? "Submit & reserve your demo slot"
                  : "Share with the community"}
            </button>

            <p className="text-center text-xs text-ink-faint">
              You can always edit or update your project later.
            </p>
          </form>
        </div>
      )}
    </div>
  );
}
