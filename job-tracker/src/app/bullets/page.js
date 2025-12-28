import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProjectBulletsPanel } from "@/components/features/projects/ProjectBulletsPanel";

export default async function BulletsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  return (
    <main className="min-h-screen p-8 pb-20 sm:p-20">
      <ProjectBulletsPanel />
    </main>
  );
}
