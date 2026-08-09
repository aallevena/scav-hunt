import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { HuntForm } from "@/components/hunt-form";

export default async function NewHuntPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
      <h1 className="mb-8 text-2xl font-semibold">Create a hunt</h1>
      <HuntForm />
    </div>
  );
}
