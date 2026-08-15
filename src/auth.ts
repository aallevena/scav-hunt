import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";

import { prisma } from "@/lib/prisma";
import { adminEmails } from "@/lib/admin-emails";

const isDev = process.env.NODE_ENV !== "production";

async function isEmailAllowed(email: string): Promise<boolean> {
  if (adminEmails.includes(email)) return true;
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) return true;
  const invited = await prisma.allowedEmail.findUnique({ where: { email } });
  return invited !== null;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Google,
    ...(isDev
      ? [
          Credentials({
            id: "dev-login",
            name: "Dev login",
            credentials: {
              name: { label: "Name", type: "text" },
              email: { label: "Email", type: "text" },
            },
            async authorize(credentials) {
              const name = String(credentials?.name ?? "").trim();
              const email = String(credentials?.email ?? "").trim();
              if (!email) return null;

              const user = await prisma.user.upsert({
                where: { email },
                update: name ? { name } : {},
                create: { email, name: name || email.split("@")[0] },
              });

              return { id: user.id, name: user.name, email: user.email };
            },
          }),
        ]
      : []),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // Dev-login already gates itself in authorize(); only the real
      // (Google) flow needs the allowlist check.
      if (account?.provider !== "google") return true;
      if (!user.email) return false;
      return isEmailAllowed(user.email.toLowerCase());
    },
    async jwt({ token, user }) {
      if (user) token.sub = user.id;
      if (token.sub) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { isAdmin: true },
        });
        token.isAdmin =
          adminEmails.includes((token.email as string | undefined)?.toLowerCase() ?? "") ||
          (dbUser?.isAdmin ?? false);
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.isAdmin = Boolean(token.isAdmin);
      }
      return session;
    },
  },
});
