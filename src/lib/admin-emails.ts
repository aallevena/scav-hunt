function parseEmailList(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

// Bootstrap admins, granted via env so the first admin doesn't need a DB row
// to exist yet. Additional admins are promoted from the /admin page instead.
export const adminEmails = parseEmailList(process.env.ADMIN_EMAILS);
