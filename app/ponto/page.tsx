import { createClient } from "@/lib/supabase/server";
import type { FuncionarioKiosk } from "@/lib/types";
import EcraQuiosque from "@/components/ponto/EcraQuiosque";

export const dynamic = "force-dynamic";

export default async function PaginaPonto() {
  const supabase = await createClient();
  const { data: funcionarios } = await supabase
    .from("vw_funcionarios_kiosk")
    .select("*")
    .returns<FuncionarioKiosk[]>();

  return <EcraQuiosque funcionarios={funcionarios ?? []} />;
}
