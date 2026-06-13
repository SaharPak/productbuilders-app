"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { upcomingDemoFridays, demoTimezones } from "@/lib/week";
import { updateProduct, deleteProduct } from "../actions";
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

export default function EditProductPage() {
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [problem, setProblem] = useState("");
  const [audience, setAudience] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [stage, setStage] = useState<Stage>("building");
  const [category, setCategory] = useState<Category>("AI");
  const [demoType, setDemoType] = useState<DemoType>("feedback_only");
  const [demoWeek, setDemoWeek] = useState<string | null>(null);
  const [demoLanguage, setDemoLanguage] = useState<DemoLanguage>("english");
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;
  const supabase = createClient();
  const fridays = upcomingDemoFridays(4);

  useEffect(() => {
    async function loadProduct() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push(`/login?redirect=/p/${productId}/edit`);
        return;
      }

      const { data: product } = await supabase
        .from("products")
        .select("*")
        .eq("id", productId)
        .single();

      if (!product) {
        router.push("/");
        return;
      }

      if (product.builder_id !== user.id) {
        router.push(`/p/${productId}`);
        return;
      }

      setName(product.name);
      setTagline(product.tagline);
      setProblem(product.problem ?? "");
      setAudience(product.audience ?? "");
      setDescription(product.description ?? "");
      setUrl(product.url ?? "");
      setStage(product.stage);
      setCategory(product.category);
      setDemoType(product.demo_type);
      setDemoWeek(product.demo_week);
      setDemoLanguage(product.demo_language ?? "english");
      setPageLoading(false);
    }
    loadProduct();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSaved(false);

    const result = await updateProduct(productId, {
      name,
      tagline,
      description: description || null,
      problem: problem || null,
      audience: audience || null,
      url: url || null,
      category,
      stage,
      demo_type: demoType,
      demo_week: demoWeek,
      demo_language: demoType === "live_demo" ? demoLanguage : null,
    });

    if (result.error) {
      setError(result.error);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
    setLoading(false);
  }

  async function handleDelete() {
    setLoading(true);
    const result = await deleteProduct(productId);
    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      router.push("/");
    }
  }

  if (pageLoading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <p className="text-ink-muted">Loading...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 pt-24 pb-16 sm:px-6">
      <h1 className="font-display text-3xl font-black text-ink">Edit project</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Update your project details. Changes are saved immediately.
      </p>

      <form onSubmit={handleSave} className="mt-8 space-y-6">
        <div>
          <label className="mb-1 block text-sm font-semibold text-ink">
            Name <span className="text-persimmon">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={50}
            className="w-full rounded-xl border border-border bg-card-bg px-4 py-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-persimmon"
          />
          <p className="mt-1 text-right font-mono text-xs text-ink-faint">{name.length}/50</p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-ink">
            Tagline <span className="text-persimmon">*</span>
          </label>
          <input
            type="text"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            required
            maxLength={120}
            className="w-full rounded-xl border border-border bg-card-bg px-4 py-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-persimmon"
          />
          <p className="mt-1 text-right font-mono text-xs text-ink-faint">{tagline.length}/120</p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-ink">Problem it solves</label>
          <textarea
            value={problem}
            onChange={(e) => setProblem(e.target.value)}
            maxLength={500}
            rows={3}
            className="w-full resize-none rounded-xl border border-border bg-card-bg px-4 py-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-persimmon"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-ink">Who is it for?</label>
          <input
            type="text"
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
            maxLength={300}
            className="w-full rounded-xl border border-border bg-card-bg px-4 py-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-persimmon"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-ink">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={1000}
            rows={4}
            className="w-full resize-none rounded-xl border border-border bg-card-bg px-4 py-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-persimmon"
          />
          <p className="mt-1 text-right font-mono text-xs text-ink-faint">{description.length}/1000</p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-ink">Link</label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://your-project.com"
            className="w-full rounded-xl border border-border bg-card-bg px-4 py-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-persimmon"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-ink">Stage</label>
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
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-ink">Category</label>
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

        {/* Demo type */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-ink">Sharing mode</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setDemoType("live_demo")}
              className={`rounded-xl border-2 px-4 py-3 text-center transition-all ${
                demoType === "live_demo"
                  ? "border-persimmon bg-persimmon-light"
                  : "border-border bg-card-bg hover:border-border-strong"
              }`}
            >
              <span className="text-lg">🎤</span>
              <p className="mt-1 text-sm font-semibold text-ink">Live demo</p>
            </button>
            <button
              type="button"
              onClick={() => { setDemoType("feedback_only"); setDemoWeek(null); }}
              className={`rounded-xl border-2 px-4 py-3 text-center transition-all ${
                demoType === "feedback_only"
                  ? "border-sage bg-sage-light"
                  : "border-border bg-card-bg hover:border-border-strong"
              }`}
            >
              <span className="text-lg">💬</span>
              <p className="mt-1 text-sm font-semibold text-ink">Feedback only</p>
            </button>
          </div>
        </div>

        {demoType === "live_demo" && (
          <>
            <div>
              <label className="mb-2 block text-sm font-semibold text-ink">Demo Friday</label>
              <div className="space-y-2">
                {fridays.map((f) => (
                  <button
                    key={f.date}
                    type="button"
                    onClick={() => setDemoWeek(f.date)}
                    className={`w-full rounded-xl border-2 px-4 py-3 text-left transition-all ${
                      demoWeek === f.date
                        ? "border-persimmon bg-persimmon-light"
                        : "border-border bg-card-bg hover:border-border-strong"
                    }`}
                  >
                    <p className="text-sm font-bold text-ink">{f.label}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-ink">Demo language</label>
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
          </>
        )}

        {error && (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>
        )}
        {saved && (
          <p className="rounded-lg bg-green-50 p-3 text-sm text-stage-launched">Changes saved.</p>
        )}

        <button
          type="submit"
          disabled={loading || !name.trim() || !tagline.trim()}
          className="w-full rounded-xl bg-persimmon px-4 py-3.5 text-base font-semibold text-white transition-all hover:scale-[1.01] hover:bg-persimmon-hover active:scale-[0.99] disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save changes"}
        </button>
      </form>

      {/* Delete section */}
      <div className="mt-10 rounded-2xl border border-red-200 bg-red-50/50 p-5">
        <h3 className="font-display text-base font-bold text-red-700">Remove project</h3>
        <p className="mt-1 text-sm text-red-600/80">
          This will hide your project from the community. It can be restored by an admin.
        </p>
        {showDeleteConfirm ? (
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleDelete}
              disabled={loading}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? "Removing..." : "Yes, remove it"}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-ink-muted"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="mt-3 rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 transition-all hover:bg-red-100"
          >
            Remove this project
          </button>
        )}
      </div>
    </div>
  );
}
