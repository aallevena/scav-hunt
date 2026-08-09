import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;

  const [createdHunts, progress] = await Promise.all([
    prisma.hunt.findMany({
      where: { creatorId: userId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.huntProgress.findMany({
      where: { userId },
      include: { hunt: true },
      orderBy: { startedAt: "desc" },
    }),
  ]);

  const inProgress = progress.filter((p) => p.status === "IN_PROGRESS");
  const completed = progress.filter((p) => p.status === "COMPLETED");

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <div className="mb-10 flex items-center gap-4">
        {session.user.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={session.user.image}
            alt=""
            className="h-14 w-14 rounded-full"
          />
        )}
        <div>
          <h1 className="text-xl font-semibold">{session.user.name}</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {session.user.email}
          </p>
        </div>
      </div>

      <Section title="In progress" empty="No hunts in progress yet.">
        {inProgress.map((p) => (
          <HuntRow key={p.id} href={`/hunts/${p.hunt.id}`} title={p.hunt.title} />
        ))}
      </Section>

      <Section title="Completed" empty="No completed hunts yet.">
        {completed.map((p) => (
          <HuntRow key={p.id} href={`/hunts/${p.hunt.id}`} title={p.hunt.title} />
        ))}
      </Section>

      <Section title="Created by you" empty="You haven't created a hunt yet.">
        {createdHunts.map((h) => (
          <HuntRow key={h.id} href={`/hunts/${h.id}`} title={h.title} />
        ))}
      </Section>
    </div>
  );
}

function Section({
  title,
  empty,
  children,
}: {
  title: string;
  empty: string;
  children: React.ReactNode;
}) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : !!children;
  return (
    <div className="mb-8">
      <h2 className="mb-3 text-lg font-medium">{title}</h2>
      {hasChildren ? (
        <ul className="flex flex-col gap-2">{children}</ul>
      ) : (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{empty}</p>
      )}
    </div>
  );
}

function HuntRow({ href, title }: { href: string; title: string }) {
  return (
    <li>
      <Link
        href={href}
        className="block rounded-xl border border-black/10 px-4 py-3 text-sm hover:border-black/30 dark:border-white/10 dark:hover:border-white/30"
      >
        {title}
      </Link>
    </li>
  );
}
