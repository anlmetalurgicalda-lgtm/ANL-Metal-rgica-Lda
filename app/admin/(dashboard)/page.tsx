import { createClient } from "@/lib/supabase/server";
import { Users, Camera, Clock } from "lucide-react";
import AtividadeHojeTable from "@/components/admin/AtividadeHojeTable";
import RelogioCompacto from "@/components/admin/RelogioCompacto";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const supabase = await createClient();

  const [{ count: totalFuncionarios }, { count: fotosPendentes }] = await Promise.all([
    supabase.from("funcionarios").select("*", { count: "exact", head: true }).eq("ativo", true),
    supabase.from("funcionarios").select("*", { count: "exact", head: true }).eq("foto_status", "pendente"),
  ]);

  const hoje = new Date().toISOString().slice(0, 10);
  const { count: registosHoje } = await supabase
    .from("registos_ponto")
    .select("*", { count: "exact", head: true })
    .eq("data", hoje)
    .eq("tipo", "entrada");

  const cartoes = [
    { titulo: "Funcionários ativos", valor: totalFuncionarios ?? 0, icon: Users, cor: "bg-brand-50 text-brand-700" },
    { titulo: "Fotos pendentes", valor: fotosPendentes ?? 0, icon: Camera, cor: "bg-amber-50 text-amber-700" },
    { titulo: "Entradas registadas hoje", valor: registosHoje ?? 0, icon: Clock, cor: "bg-emerald-50 text-emerald-700" },
  ];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Painel</h1>
          <p className="text-sm text-slate-500">Visão geral do controlo de ponto hoje.</p>
        </div>
        <RelogioCompacto />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {cartoes.map((c) => (
          <div
            key={c.titulo}
            className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className={`mb-3 inline-flex rounded-xl p-2.5 ${c.cor}`}>
              <c.icon size={20} />
            </div>
            <p className="text-2xl font-semibold text-slate-900">{c.valor}</p>
            <p className="text-sm text-slate-500">{c.titulo}</p>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <AtividadeHojeTable />
      </div>
    </div>
  );
}
