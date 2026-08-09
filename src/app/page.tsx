import Link from "next/link";

import { prisma } from "@/lib/prisma";

type SearchParams = { tag?: string; q?: string };

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { tag, q } = await searchParams;

  const [hunts, tags] = await Promise.all([
    prisma.hunt.findMany({
      where: {
        published: true,
        ...(tag ? { tags: { some: { tag: { name: tag } } } } : {}),
        ...(q
          ? { title: { contains: q, mode: "insensitive" as const } }
          : {}),
      },
      include: {
        tags: { include: { tag: true } },
        creator: { select: { name: true } },
        _count: { select: { upvotes: true, clues: true } },
      },
      orderBy: [{ upvotes: { _count: "desc" } }, { createdAt: "desc" }],
    }),
    prisma.tag.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Browse hunts</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {hunts.length} hunt{hunts.length === 1 ? "" : "s"}
            {tag ? ` tagged "${tag}"` : ""}
            {q ? ` matching "${q}"` : ""}
          </p>
        </div>

        <form className="flex gap-2" action="/">
          <input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search hunts..."
            className="rounded-full border border-black/10 bg-transparent px-4 py-1.5 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/30"
          />
          {tag && <input type="hidden" name="tag" value={tag} />}
        </form>
      </div>

      {tags.length > 0 && (
        <div className="mb-8 flex flex-wrap gap-2">
          <Link
            href="/"
            className={`rounded-full border px-3 py-1 text-xs ${
              !tag
                ? "border-transparent bg-foreground text-background"
                : "border-black/10 hover:bg-black/[.04] dark:border-white/10 dark:hover:bg-white/[.08]"
            }`}
          >
            All
          </Link>
          {tags.map((t) => (
            <Link
              key={t.id}
              href={`/?tag=${encodeURIComponent(t.name)}`}
              className={`rounded-full border px-3 py-1 text-xs ${
                tag === t.name
                  ? "border-transparent bg-foreground text-background"
                  : "border-black/10 hover:bg-black/[.04] dark:border-white/10 dark:hover:bg-white/[.08]"
              }`}
            >
              {t.name}
            </Link>
          ))}
        </div>
      )}

      {hunts.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No hunts found yet.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {hunts.map((hunt) => (
            <li key={hunt.id}>
              <Link
                href={`/hunts/${hunt.id}`}
                className="flex h-full flex-col gap-3 rounded-2xl border border-black/10 p-5 transition-colors hover:border-black/30 dark:border-white/10 dark:hover:border-white/30"
              >
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-medium leading-snug">{hunt.title}</h2>
                  <span className="shrink-0 rounded-full border border-black/10 px-2 py-0.5 text-xs text-zinc-600 dark:border-white/10 dark:text-zinc-400">
                    {hunt.ordered ? "Ordered" : "Free-roam"}
                  </span>
                </div>
                <p className="line-clamp-2 flex-1 text-sm text-zinc-600 dark:text-zinc-400">
                  {hunt.description}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {hunt.tags.map(({ tag: t }) => (
                    <span
                      key={t.id}
                      className="rounded-full bg-black/[.04] px-2 py-0.5 text-xs text-zinc-600 dark:bg-white/[.08] dark:text-zinc-400"
                    >
                      {t.name}
                    </span>
                  ))}
                </div>
                <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-500">
                  <span>{hunt._count.clues} clues</span>
                  <span>▲ {hunt._count.upvotes}</span>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-500">
                  by {hunt.creator.name ?? "Anonymous"}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
