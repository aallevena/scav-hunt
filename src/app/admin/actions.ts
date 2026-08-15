"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    throw new Error("Admin access required.");
  }
  return session;
}

function parseEmails(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(/[\s,]+/)
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean)
    )
  );
}

export async function addAllowedEmails(formData: FormData) {
  const session = await requireAdmin();
  const raw = String(formData.get("emails") ?? "");
  const emails = parseEmails(raw);

  if (emails.length === 0) return;

  await prisma.allowedEmail.createMany({
    data: emails.map((email) => ({
      email,
      addedByEmail: session.user.email ?? undefined,
    })),
    skipDuplicates: true,
  });

  revalidatePath("/admin");
}

export async function removeAllowedEmail(formData: FormData) {
  await requireAdmin();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (!email) return;

  await prisma.allowedEmail.delete({ where: { email } }).catch(() => {});
  revalidatePath("/admin");
}

export async function setUserAdmin(formData: FormData) {
  const session = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const isAdmin = formData.get("isAdmin") === "true";
  if (!userId) return;

  if (userId === session.user.id && !isAdmin) {
    throw new Error("You can't remove your own admin access.");
  }

  await prisma.user.update({ where: { id: userId }, data: { isAdmin } });
  revalidatePath("/admin");
}
