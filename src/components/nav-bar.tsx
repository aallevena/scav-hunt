import Link from "next/link";

import { auth, signIn, signOut } from "@/auth";

export async function NavBar() {
  const session = await auth();

  return (
    <header className="border-b border-black/10 dark:border-white/10">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-semibold">
          🗺️ Scavenger Hunt
        </Link>

        <nav className="flex items-center gap-4 text-sm">
          <Link href="/" className="hover:underline">
            Browse
          </Link>

          {session?.user ? (
            <>
              <Link href="/hunts/new" className="hover:underline">
                Create
              </Link>
              <Link href="/profile" className="hover:underline">
                Profile
              </Link>
              {session.user.isAdmin && (
                <Link href="/admin" className="hover:underline">
                  Admin
                </Link>
              )}
              <form
                action={async () => {
                  "use server";
                  await signOut();
                }}
              >
                <button
                  type="submit"
                  className="rounded-full border border-black/10 px-4 py-1.5 hover:bg-black/[.04] dark:border-white/10 dark:hover:bg-white/[.08]"
                >
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <form
              action={async () => {
                "use server";
                await signIn("google");
              }}
            >
              <button
                type="submit"
                className="rounded-full bg-foreground px-4 py-1.5 text-background hover:bg-[#383838] dark:hover:bg-[#ccc]"
              >
                Sign in
              </button>
            </form>
          )}
        </nav>
      </div>
    </header>
  );
}
