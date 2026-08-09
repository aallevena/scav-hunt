import { signIn } from "@/auth";

const isDev = process.env.NODE_ENV !== "production";

export default function LoginPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-24">
      <div className="flex flex-col items-center gap-6">
        <h1 className="text-2xl font-semibold">Sign in</h1>
        <p className="max-w-sm text-center text-sm text-zinc-600 dark:text-zinc-400">
          Sign in to track your hunts, create your own, and join live
          events.
        </p>
        <form
          action={async () => {
            "use server";
            await signIn("google");
          }}
        >
          <button
            type="submit"
            className="rounded-full bg-foreground px-6 py-2.5 text-sm font-medium text-background hover:bg-[#383838] dark:hover:bg-[#ccc]"
          >
            Continue with Google
          </button>
        </form>
      </div>

      {isDev && (
        <div className="flex w-full max-w-xs flex-col gap-3 rounded-2xl border border-dashed border-black/20 p-5 dark:border-white/20">
          <p className="text-center text-xs font-medium uppercase tracking-wide text-zinc-500">
            Dev login (local only)
          </p>
          <form
            action={async (formData) => {
              "use server";
              await signIn("dev-login", {
                name: formData.get("name"),
                email: formData.get("email"),
                redirectTo: "/",
              });
            }}
            className="flex flex-col gap-2"
          >
            <input
              name="name"
              placeholder="Name"
              defaultValue="Test User"
              className="rounded-lg border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/30"
            />
            <input
              name="email"
              type="email"
              required
              placeholder="you@example.com"
              defaultValue="test@example.com"
              className="rounded-lg border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/30"
            />
            <button
              type="submit"
              className="rounded-lg border border-black/10 px-4 py-2 text-sm hover:bg-black/[.04] dark:border-white/10 dark:hover:bg-white/[.08]"
            >
              Sign in as this user
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
