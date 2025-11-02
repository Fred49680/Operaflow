import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import CreatePartenaireClient from "./create-partenaire-client";

export default async function NewPartenairePage() {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return <CreatePartenaireClient />;
}

