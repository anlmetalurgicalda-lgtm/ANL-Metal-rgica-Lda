"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Funcionario } from "@/lib/types";
import { X, Loader2 } from "lucide-react";

const DIAS = [
  { valor: 1, label: "Seg" },
  { valor: 2, label: "Ter" },
  { valor: 3, label: "Qua" },
  { valor: 4, label: "Qui" },
  { valor: 5, label: "Sex" },
  { valor: 6, label: "Sáb" },
  { valor: 7, label: "Dom" },
];

interface Props {
  funcionario?: Funcionario | null;
  onFechar: () => void;
  onGuardado: () => void;
}

export default function FuncionarioFormModal({ funcionario, onFechar, onGuardado }: Props) {
  const supabase = createClient();
  const editando = Boolean(funcionario);

  const [nome, setNome] = useState(funcionario?.nome_completo ?? "");
  const [numero, setNumero] = useState(funcionario?.numero_funcionario ?? "");
  const [email, setEmail] = useState(funcionario?.email ?? "");
  const [senha, setSenha] = useState("");
  const [horaEntrada, setHoraEntrada] = useState(funcionario?.hora_entrada_padrao?.slice(0, 5) ?? "08:00");
  const [horaSaida, setHoraSaida] = useState(funcionario?.hora_saida_padrao?.slice(0, 5) ?? "19:00");
  const [dias, setDias] = useState<number[]>(funcionario?.dias_trabalho ?? [1, 2, 3, 4, 5, 6]);
  const [foto, setFoto] = useState<File | null>(null);
  const [aGuardar, setAGuardar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function alternarDia(d: number) {
    setDias((atual) => (atual.includes(d) ? atual.filter((x) => x !== d) : [...atual, d].sort()));
  }

  async function carregarFoto(funcionarioId: string) {
    if (!foto) return;
    const ext = foto.name.split(".").pop() || "jpg";
    const caminho = `aprovada/${funcionarioId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("fotos-funcionarios").upload(caminho, foto, { upsert: true });
    if (error) return;
    const { data } = supabase.storage.from("fotos-funcionarios").getPublicUrl(caminho);
    await supabase.from("funcionarios").update({ foto_url: data.publicUrl }).eq("id", funcionarioId);
  }

  async function guardar() {
    if (!nome.trim()) {
      setErro("O nome é obrigatório.");
      return;
    }
    if (!editando && !senha) {
      setErro("Defina um código de 6 dígitos para o novo colaborador.");
      return;
    }
    if (senha && !/^\d{6}$/.test(senha)) {
      setErro("O código tem de ter exatamente 6 dígitos numéricos.");
      return;
    }
    if (dias.length === 0) {
      setErro("Selecione pelo menos um dia de trabalho.");
      return;
    }

    setAGuardar(true);
    setErro(null);

    if (editando && funcionario) {
      const { error } = await supabase
        .from("funcionarios")
        .update({
          nome_completo: nome,
          numero_funcionario: numero || null,
          email: email || null,
          hora_entrada_padrao: horaEntrada,
          hora_saida_padrao: horaSaida,
          dias_trabalho: dias,
        })
        .eq("id", funcionario.id);

      if (error) {
        setAGuardar(false);
        setErro("Não foi possível guardar as alterações.");
        return;
      }

      if (senha) {
        await supabase.rpc("definir_senha_funcionario", {
          p_funcionario_id: funcionario.id,
          p_nova_senha: senha,
        });
      }

      await carregarFoto(funcionario.id);
    } else {
      const { data: novoData, error } = await supabase.rpc("criar_funcionario", {
        p_nome_completo: nome,
        p_senha: senha,
        p_numero_funcionario: numero || null,
        p_email: email || null,
        p_hora_entrada: horaEntrada,
        p_hora_saida: horaSaida,
        p_dias_trabalho: dias,
      });
      const novo = novoData as Funcionario | null;

      if (error || !novo) {
        setAGuardar(false);
        setErro("Não foi possível criar o colaborador.");
        return;
      }

      await carregarFoto(novo.id);
    }

    setAGuardar(false);
    onGuardado();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            {editando ? "Editar Colaborador" : "Novo Colaborador"}
          </h2>
          <button onClick={onFechar} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100">
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Nome completo</label>
            <input value={nome} onChange={(e) => setNome(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100" />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Nº de funcionário</label>
            <input value={numero ?? ""} onChange={(e) => setNumero(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Email (opcional)</label>
            <input value={email ?? ""} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100" />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Hora de entrada</label>
            <input type="time" value={horaEntrada} onChange={(e) => setHoraEntrada(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Hora de saída</label>
            <input type="time" value={horaSaida} onChange={(e) => setHoraSaida(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100" />
          </div>

          <div className="col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Dias de trabalho</label>
            <div className="flex flex-wrap gap-2">
              {DIAS.map((d) => (
                <button
                  key={d.valor}
                  type="button"
                  onClick={() => alternarDia(d.valor)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                    dias.includes(d.valor) ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div className="col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">
              {editando ? "Novo código de 6 dígitos (opcional)" : "Código de 6 dígitos"}
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={senha}
              onChange={(e) => setSenha(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="••••••"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 tracking-[0.3em] outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
            <p className="mt-1 text-xs text-slate-400">
              É o código que o colaborador usa no teclado numérico do ecrã de ponto.
            </p>
          </div>

          <div className="col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Foto de perfil</label>
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setFoto(e.target.files?.[0] ?? null)} className="w-full text-sm" />
          </div>
        </div>

        {erro && <div className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{erro}</div>}

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onFechar} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
            Cancelar
          </button>
          <button
            onClick={guardar}
            disabled={aGuardar}
            className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {aGuardar && <Loader2 className="animate-spin" size={16} />}
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
