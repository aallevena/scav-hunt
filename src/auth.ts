import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";

import { prisma } from "@/lib/prisma";

const isDev = process.env.NODE_ENV !== "production";

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
    async jwt({ token, user }) {
      if (user) token.sub = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
