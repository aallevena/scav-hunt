"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { ClueInputType } from "@/generated/prisma/enums";

type ClueCardProps = {
  huntId: string;
  clue: {
    id: string;
    title: string;
    prompt: string;
    hint: string | null;
    inputType: ClueInputType;
  };
  index: number;
  status: "locked" | "active" | "completed";
};

export function ClueCard({ huntId, clue, index, status }: ClueCardProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);

  async function submit(payload: Record<string, unknown>) {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/hunts/${huntId}/clues/${clue.id}/verify`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      if (!data.correct) {
        setError(data.message ?? "Not quite — try again.");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error — try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <li
      className={`rounded-xl border p-4 ${
        status === "locked"
          ? "border-black/10 opacity-50 dark:border-white/10"
          : status === "completed"
            ? "border-green-500/30 bg-green-500/5"
            : "border-black/10 dark:border-white/10"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">
          {status === "completed" ? "✓ " : ""}
          {index + 1}. {status === "locked" ? "Locked clue" : clue.title}
        </span>
        <span className="rounded-full border border-black/10 px-2 py-0.5 text-xs text-zinc-500 dark:border-white/10 dark:text-zinc-500">
          {clue.inputType.replace("_", " ").toLowerCase()}
        </span>
      </div>

      {status === "active" && (
        <div className="mt-3 flex flex-col gap-3">
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            {clue.prompt}
          </p>

          {clue.hint &&
            (showHint ? (
              <p className="text-xs italic text-zinc-500">💡 {clue.hint}</p>
            ) : (
              <button
                type="button"
                onClick={() => setShowHint(true)}
                className="self-start text-xs text-zinc-500 underline"
              >
                Show hint
              </button>
            ))}

          <ClueInput
            inputType={clue.inputType}
            submitting={submitting}
            onSubmit={submit}
          />

          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      )}
    </li>
  );
}

function ClueInput({
  inputType,
  submitting,
  onSubmit,
}: {
  inputType: ClueInputType;
  submitting: boolean;
  onSubmit: (payload: Record<string, unknown>) => void;
}) {
  if (inputType === "TEXT_PASSWORD") {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const answer = new FormData(e.currentTarget).get("answer");
          onSubmit({ answer });
        }}
        className="flex gap-2"
      >
        <input
          name="answer"
          placeholder="Your answer"
          disabled={submitting}
          className="flex-1 rounded-lg border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/30"
        />
        <SubmitButton submitting={submitting} />
      </form>
    );
  }

  if (inputType === "QR_BARCODE") {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const code = new FormData(e.currentTarget).get("code");
          onSubmit({ code });
        }}
        className="flex gap-2"
      >
        <input
          name="code"
          placeholder="Scanned code (camera scan coming soon)"
          disabled={submitting}
          className="flex-1 rounded-lg border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/30"
        />
        <SubmitButton submitting={submitting} />
      </form>
    );
  }

  if (inputType === "GEOLOCATION") {
    return (
      <GeolocationInput submitting={submitting} onSubmit={onSubmit} />
    );
  }

  return (
    <p className="text-xs text-zinc-500">
      This clue type isn&apos;t playable yet.
    </p>
  );
}

function GeolocationInput({
  submitting,
  onSubmit,
}: {
  submitting: boolean;
  onSubmit: (payload: Record<string, unknown>) => void;
}) {
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  function checkLocation() {
    if (!("geolocation" in navigator)) {
      setGeoError("Geolocation isn't supported on this device.");
      return;
    }
    setLocating(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        onSubmit({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
      },
      (err) => {
        setLocating(false);
        setGeoError(err.message || "Couldn't get your location.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={checkLocation}
        disabled={submitting || locating}
        className="self-start rounded-lg border border-black/10 px-4 py-2 text-sm hover:bg-black/[.04] disabled:opacity-50 dark:border-white/10 dark:hover:bg-white/[.08]"
      >
        {locating ? "Locating..." : "📍 Check in with my location"}
      </button>
      {geoError && <p className="text-xs text-red-600">{geoError}</p>}
    </div>
  );
}

function SubmitButton({ submitting }: { submitting: boolean }) {
  return (
    <button
      type="submit"
      disabled={submitting}
      className="rounded-lg bg-foreground px-4 py-2 text-sm text-background disabled:opacity-50"
    >
      {submitting ? "Checking..." : "Submit"}
    </button>
  );
}
