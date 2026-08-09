import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ClueCard } from "@/components/clue-card";

export default async function HuntDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  const hunt = await prisma.hunt.findUnique({
    where: { id },
    include: {
      creator: { select: { name: true } },
      tags: { include: { tag: true } },
      clues: { orderBy: { orderIndex: "asc" } },
      _count: { select: { upvotes: true } },
    },
  });

  if (!hunt) notFound();

  let progress: { currentClueIndex: number; status: string } | null = null;
  let completedClueIds = new Set<string>();

  if (session?.user?.id) {
    const userId = session.user.id;
    const [progressRow, completions] = await Promise.all([
      prisma.huntProgress.findUnique({
        where: { userId_huntId: { userId, huntId: hunt.id } },
        select: { currentClueIndex: true, status: true },
      }),
      prisma.clueCompletion.findMany({
        where: { userId, clue: { huntId: hunt.id } },
        select: { clueId: true },
      }),
    ]);
    progress = progressRow;
    completedClueIds = new Set(completions.map((c) => c.clueId));
  }

  const currentClueIndex = progress?.currentClueIndex ?? 0;
  const isHuntComplete = progress?.status === "COMPLETED";

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{hunt.title}</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            by {hunt.creator.name ?? "Anonymous"} ·{" "}
            {hunt.ordered ? "Ordered" : "Free-roam"} · {hunt.clues.length}{" "}
            clues
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-black/10 px-3 py-1 text-sm dark:border-white/10">
          ▲ {hunt._count.upvotes}
        </span>
      </div>

      <p className="mb-6 text-sm leading-relaxed">{hunt.description}</p>

      <div className="mb-8 flex flex-wrap gap-1.5">
        {hunt.tags.map(({ tag }) => (
          <span
            key={tag.id}
            className="rounded-full bg-black/[.04] px-2 py-0.5 text-xs text-zinc-600 dark:bg-white/[.08] dark:text-zinc-400"
          >
            {tag.name}
          </span>
        ))}
      </div>

      {!session?.user && (
        <p className="mb-6 rounded-xl border border-dashed border-black/20 p-4 text-sm text-zinc-600 dark:border-white/20 dark:text-zinc-400">
          <a href="/login" className="underline">
            Sign in
          </a>{" "}
          to play this hunt and track your progress.
        </p>
      )}

      {isHuntComplete && (
        <p className="mb-6 rounded-xl border border-green-500/30 bg-green-500/5 p-4 text-sm">
          🎉 You&apos;ve completed this hunt!
        </p>
      )}

      <h2 className="mb-3 text-lg font-medium">
        {hunt.ordered ? "Clues (in order)" : "Clues"}
      </h2>
      <ol className="flex flex-col gap-3">
        {hunt.clues.map((clue, i) => {
          const completed = completedClueIds.has(clue.id);
          const status: "locked" | "active" | "completed" = completed
            ? "completed"
            : !session?.user
              ? "locked"
              : hunt.ordered
                ? i === currentClueIndex
                  ? "active"
                  : i < currentClueIndex
                    ? "completed"
                    : "locked"
                : "active";

          return (
            <ClueCard
              key={clue.id}
              huntId={hunt.id}
              clue={clue}
              index={i}
              status={status}
            />
          );
        })}
      </ol>
    </div>
  );
}
