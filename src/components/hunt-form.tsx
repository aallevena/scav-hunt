"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type InputType = "TEXT_PASSWORD" | "GEOLOCATION" | "QR_BARCODE";

type ClueDraft = {
  key: string;
  title: string;
  prompt: string;
  hint: string;
  inputType: InputType;
  password: string;
  caseSensitive: boolean;
  code: string;
  latitude: string;
  longitude: string;
  locationLabel: string;
  radiusMeters: string;
};

function emptyClue(): ClueDraft {
  return {
    key: crypto.randomUUID(),
    title: "",
    prompt: "",
    hint: "",
    inputType: "TEXT_PASSWORD",
    password: "",
    caseSensitive: false,
    code: "",
    latitude: "",
    longitude: "",
    locationLabel: "",
    radiusMeters: "100",
  };
}

const inputTypeLabels: Record<InputType, string> = {
  TEXT_PASSWORD: "Text password",
  GEOLOCATION: "Geolocation check-in",
  QR_BARCODE: "QR / barcode scan",
};

export function HuntForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [ordered, setOrdered] = useState(true);
  const [published, setPublished] = useState(true);
  const [tagsText, setTagsText] = useState("");
  const [clues, setClues] = useState<ClueDraft[]>([emptyClue()]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function updateClue(key: string, patch: Partial<ClueDraft>) {
    setClues((prev) =>
      prev.map((c) => (c.key === key ? { ...c, ...patch } : c))
    );
  }

  function removeClue(key: string) {
    setClues((prev) => prev.filter((c) => c.key !== key));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim() || !description.trim()) {
      setError("Title and description are required.");
      return;
    }
    if (clues.length === 0) {
      setError("Add at least one clue.");
      return;
    }
    for (const clue of clues) {
      if (!clue.title.trim() || !clue.prompt.trim()) {
        setError("Every clue needs a title and prompt.");
        return;
      }
      if (clue.inputType === "TEXT_PASSWORD" && !clue.password.trim()) {
        setError(`Clue "${clue.title}" needs a password.`);
        return;
      }
      if (clue.inputType === "QR_BARCODE" && !clue.code.trim()) {
        setError(`Clue "${clue.title}" needs a code.`);
        return;
      }
      if (
        clue.inputType === "GEOLOCATION" &&
        (!clue.latitude.trim() || !clue.longitude.trim())
      ) {
        setError(`Clue "${clue.title}" needs a latitude and longitude.`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/hunts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          ordered,
          published,
          tagNames: tagsText
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          clues: clues.map((c) => ({
            title: c.title,
            prompt: c.prompt,
            hint: c.hint || undefined,
            inputType: c.inputType,
            password: c.password || undefined,
            caseSensitive: c.caseSensitive,
            code: c.code || undefined,
            latitude: c.latitude ? Number(c.latitude) : undefined,
            longitude: c.longitude ? Number(c.longitude) : undefined,
            locationLabel: c.locationLabel || undefined,
            radiusMeters: c.radiusMeters ? Number(c.radiusMeters) : undefined,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't create hunt.");
        return;
      }
      router.push(`/hunts/${data.id}`);
    } catch {
      setError("Network error — try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <Field label="Title">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input"
          />
        </Field>

        <Field label="Description">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="input"
          />
        </Field>

        <Field label="Tags (comma separated)">
          <input
            value={tagsText}
            onChange={(e) => setTagsText(e.target.value)}
            placeholder="Outdoor, Downtown, Puzzle"
            className="input"
          />
        </Field>

        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={ordered}
              onChange={(e) => setOrdered(e.target.checked)}
            />
            Ordered (clues unlock one at a time)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
            />
            Publish immediately
          </label>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Clues</h2>
          <button
            type="button"
            onClick={() => setClues((prev) => [...prev, emptyClue()])}
            className="rounded-full border border-black/10 px-3 py-1 text-sm hover:bg-black/[.04] dark:border-white/10 dark:hover:bg-white/[.08]"
          >
            + Add clue
          </button>
        </div>

        {clues.map((clue, i) => (
          <div
            key={clue.key}
            className="flex flex-col gap-3 rounded-xl border border-black/10 p-4 dark:border-white/10"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Clue {i + 1}</span>
              {clues.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeClue(clue.key)}
                  className="text-xs text-red-600"
                >
                  Remove
                </button>
              )}
            </div>

            <Field label="Title">
              <input
                value={clue.title}
                onChange={(e) =>
                  updateClue(clue.key, { title: e.target.value })
                }
                className="input"
              />
            </Field>

            <Field label="Prompt">
              <textarea
                value={clue.prompt}
                onChange={(e) =>
                  updateClue(clue.key, { prompt: e.target.value })
                }
                rows={2}
                className="input"
              />
            </Field>

            <Field label="Hint (optional)">
              <input
                value={clue.hint}
                onChange={(e) =>
                  updateClue(clue.key, { hint: e.target.value })
                }
                className="input"
              />
            </Field>

            <Field label="Input type">
              <select
                value={clue.inputType}
                onChange={(e) =>
                  updateClue(clue.key, {
                    inputType: e.target.value as InputType,
                  })
                }
                className="input"
              >
                {Object.entries(inputTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>

            {clue.inputType === "TEXT_PASSWORD" && (
              <div className="flex gap-3">
                <Field label="Password" className="flex-1">
                  <input
                    value={clue.password}
                    onChange={(e) =>
                      updateClue(clue.key, { password: e.target.value })
                    }
                    className="input"
                  />
                </Field>
                <label className="flex items-center gap-2 self-end pb-2 text-xs">
                  <input
                    type="checkbox"
                    checked={clue.caseSensitive}
                    onChange={(e) =>
                      updateClue(clue.key, {
                        caseSensitive: e.target.checked,
                      })
                    }
                  />
                  Case sensitive
                </label>
              </div>
            )}

            {clue.inputType === "QR_BARCODE" && (
              <Field label="Code">
                <input
                  value={clue.code}
                  onChange={(e) =>
                    updateClue(clue.key, { code: e.target.value })
                  }
                  className="input"
                />
              </Field>
            )}

            {clue.inputType === "GEOLOCATION" && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Latitude">
                  <input
                    value={clue.latitude}
                    onChange={(e) =>
                      updateClue(clue.key, { latitude: e.target.value })
                    }
                    className="input"
                  />
                </Field>
                <Field label="Longitude">
                  <input
                    value={clue.longitude}
                    onChange={(e) =>
                      updateClue(clue.key, { longitude: e.target.value })
                    }
                    className="input"
                  />
                </Field>
                <Field label="Location label (optional)">
                  <input
                    value={clue.locationLabel}
                    onChange={(e) =>
                      updateClue(clue.key, {
                        locationLabel: e.target.value,
                      })
                    }
                    className="input"
                  />
                </Field>
                <Field label="Radius (meters)">
                  <input
                    value={clue.radiusMeters}
                    onChange={(e) =>
                      updateClue(clue.key, {
                        radiusMeters: e.target.value,
                      })
                    }
                    className="input"
                  />
                </Field>
              </div>
            )}
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="self-start rounded-full bg-foreground px-6 py-2.5 text-sm font-medium text-background disabled:opacity-50"
      >
        {submitting ? "Creating..." : "Create hunt"}
      </button>

      <style jsx global>{`
        .input {
          border-radius: 0.5rem;
          border: 1px solid rgba(0, 0, 0, 0.1);
          background: transparent;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          outline: none;
          width: 100%;
        }
        .input:focus {
          border-color: rgba(0, 0, 0, 0.3);
        }
        @media (prefers-color-scheme: dark) {
          .input {
            border-color: rgba(255, 255, 255, 0.1);
          }
          .input:focus {
            border-color: rgba(255, 255, 255, 0.3);
          }
        }
      `}</style>
    </form>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1 text-sm ${className ?? ""}`}>
      <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
        {label}
      </span>
      {children}
    </label>
  );
}
