import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { adminEmails } from "@/lib/admin-emails";

import { addAllowedEmails, removeAllowedEmail, setUserAdmin } from "./actions";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!session.user.isAdmin) redirect("/");

  const [users, pendingInvites] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.allowedEmail.findMany({ orderBy: { createdAt: "desc" } }),
  ]);

  const signedUpEmails = new Set(
    users.map((u) => u.email?.toLowerCase()).filter(Boolean)
  );
  const stillPending = pendingInvites.filter(
    (invite) => !signedUpEmails.has(invite.email)
  );

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <h1 className="mb-2 text-xl font-semibold">Admin</h1>
      <p className="mb-10 text-sm text-black/60 dark:text-white/60">
        Manage who can sign in and who has admin access.
      </p>

      <section className="mb-10">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-black/50 dark:text-white/50">
          Invite people
        </h2>
        <form action={addAllowedEmails} className="flex flex-col gap-3">
          <textarea
            name="emails"
            placeholder="Emails to allow, separated by commas or newlines"
            rows={3}
            required
            className="w-full rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/30"
          />
          <button
            type="submit"
            className="self-start rounded-full bg-foreground px-4 py-1.5 text-sm text-background hover:bg-[#383838] dark:hover:bg-[#ccc]"
          >
            Add
          </button>
        </form>

        {stillPending.length > 0 && (
          <ul className="mt-4 flex flex-col gap-2">
            {stillPending.map((invite) => (
              <li
                key={invite.id}
                className="flex items-center justify-between rounded-md border border-black/10 px-3 py-2 text-sm dark:border-white/10"
              >
                <span>
                  {invite.email}{" "}
                  <span className="text-black/40 dark:text-white/40">
                    (invited, not yet signed in)
                  </span>
                </span>
                <form action={removeAllowedEmail}>
                  <input type="hidden" name="email" value={invite.email} />
                  <button
                    type="submit"
                    className="text-black/50 hover:text-red-600 dark:text-white/50 dark:hover:text-red-400"
                  >
                    Remove
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-black/50 dark:text-white/50">
          Signed-up users ({users.length})
        </h2>
        <div className="overflow-hidden rounded-md border border-black/10 dark:border-white/10">
          <table className="w-full text-left text-sm">
            <thead className="bg-black/[.03] dark:bg-white/[.06]">
              <tr>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Email</th>
                <th className="px-3 py-2 font-medium">Joined</th>
                <th className="px-3 py-2 font-medium">Admin</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="border-t border-black/10 dark:border-white/10"
                >
                  <td className="px-3 py-2">{user.name ?? "—"}</td>
                  <td className="px-3 py-2">{user.email ?? "—"}</td>
                  <td className="px-3 py-2 text-black/60 dark:text-white/60">
                    {user.createdAt.toLocaleDateString()}
                  </td>
                  <td className="px-3 py-2">
                    {user.email && adminEmails.includes(user.email.toLowerCase()) ? (
                      <span className="text-xs text-black/50 dark:text-white/50">
                        Admin (via env)
                      </span>
                    ) : (
                      <form action={setUserAdmin}>
                        <input type="hidden" name="userId" value={user.id} />
                        <input
                          type="hidden"
                          name="isAdmin"
                          value={(!user.isAdmin).toString()}
                        />
                        <button
                          type="submit"
                          disabled={user.id === session.user.id && user.isAdmin}
                          className={
                            user.isAdmin
                              ? "rounded-full border border-black/10 px-3 py-1 text-xs hover:bg-black/[.04] disabled:opacity-40 dark:border-white/10 dark:hover:bg-white/[.08]"
                              : "rounded-full bg-foreground px-3 py-1 text-xs text-background hover:bg-[#383838] dark:hover:bg-[#ccc]"
                          }
                        >
                          {user.isAdmin ? "Remove admin" : "Make admin"}
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
