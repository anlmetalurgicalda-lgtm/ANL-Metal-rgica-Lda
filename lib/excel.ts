import ExcelJS from "exceljs";
import type { LinhaRelatorioPonto } from "./types";
import { formatarDataPT, nomeDiaSemanaPT } from "./timezone";

const EMPRESA = {
  nome: "ANL Metalúrgica Lda",
  morada: ["Rua Dr Calado, nº 26, 1º andar", "3080-152 Figueira da Foz", "Coimbra - Portugal"],
  telefone: "+351 965 272 818",
  logo: "/logo-icon.png",
};

const COR_MARCA = "FF2A63F2";
const COR_TITULO = "FF1E293B";
const COR_SUBTITULO = "FF64748B";
const COR_CABECALHO_TABELA = "FFEEF2FF";
const COR_SUBTOTAL = "FFF1F5F9";
const COR_BORDA = "FFE2E8F0";

const CORES_SITUACAO: Record<string, string> = {
  Trabalhado: "FFD1FAE5",
  Incompleto: "FFFEF3C7",
  Falta: "FFFFE4E6",
  Folga: "FFF1F5F9",
  Férias: "FFE0E7FF",
  "Sem registo": "FFF8FAFC",
};

const BORDA_FINA = { style: "thin" as const, color: { argb: COR_BORDA } };
const BORDA_CELULA = { top: BORDA_FINA, left: BORDA_FINA, bottom: BORDA_FINA, right: BORDA_FINA };

async function obterLogoBuffer(): Promise<ArrayBuffer | null> {
  try {
    const resposta = await fetch(EMPRESA.logo);
    if (!resposta.ok) return null;
    return await resposta.arrayBuffer();
  } catch {
    return null;
  }
}

function agruparPorFuncionario(linhas: LinhaRelatorioPonto[]) {
  const grupos = new Map<string, LinhaRelatorioPonto[]>();
  for (const linha of linhas) {
    const lista = grupos.get(linha.nome_completo) ?? [];
    lista.push(linha);
    grupos.set(linha.nome_completo, lista);
  }
  return Array.from(grupos.entries()).map(([nome, registos]) => ({
    nome,
    registos,
    numero: registos[0]?.numero_funcionario ?? null,
    subtotal: registos.reduce((s, r) => s + (r.total_horas || 0), 0),
  }));
}

/** Nomes de folha do Excel: máx. 31 caracteres, sem \ / ? * [ ] : , e únicos no livro. */
function nomeFolhaUnico(nomeDesejado: string, usados: Set<string>): string {
  const limpo = nomeDesejado.replace(/[\\/?*[\]:]/g, "").trim().slice(0, 31) || "Funcionário";
  let candidato = limpo;
  let sufixo = 2;
  while (usados.has(candidato.toLowerCase())) {
    const base = limpo.slice(0, 28);
    candidato = `${base} (${sufixo})`;
    sufixo++;
  }
  usados.add(candidato.toLowerCase());
  return candidato;
}

function desenharCabecalho(
  folha: ExcelJS.Worksheet,
  livro: ExcelJS.Workbook,
  logoBuffer: ArrayBuffer | null,
  titulo: string,
  subtitulo: string
) {
  for (let i = 1; i <= 5; i++) folha.getRow(i).height = 16;

  if (logoBuffer) {
    const imagemId = livro.addImage({ buffer: logoBuffer, extension: "png" });
    folha.addImage(imagemId, { tl: { col: 0.05, row: 0.05 }, ext: { width: 72, height: 72 } });
  }

  folha.mergeCells("B1:D1");
  folha.getCell("B1").value = EMPRESA.nome;
  folha.getCell("B1").font = { bold: true, size: 15, color: { argb: COR_TITULO } };

  EMPRESA.morada.forEach((linhaMorada, idx) => {
    const linha = idx + 2;
    folha.mergeCells(`B${linha}:D${linha}`);
    folha.getCell(`B${linha}`).value = linhaMorada;
    folha.getCell(`B${linha}`).font = { size: 10, color: { argb: COR_SUBTITULO } };
  });
  folha.mergeCells("B5:D5");
  folha.getCell("B5").value = EMPRESA.telefone;
  folha.getCell("B5").font = { size: 10, color: { argb: COR_SUBTITULO } };

  folha.getCell("A7").value = titulo;
  folha.getCell("A7").font = { bold: true, size: 13, color: { argb: COR_MARCA } };
  folha.getCell("A8").value = subtitulo;
  folha.getCell("A8").font = { size: 10, color: { argb: COR_SUBTITULO } };

  return 10; // primeira linha livre para a tabela
}

function estilizarCabecalhoTabela(folha: ExcelJS.Worksheet, linha: number, titulos: string[], alinhamentos: ("left" | "right")[]) {
  const linhaCabecalho = folha.getRow(linha);
  titulos.forEach((titulo, idx) => {
    const celula = linhaCabecalho.getCell(idx + 1);
    celula.value = titulo;
    celula.font = { bold: true, size: 10, color: { argb: COR_TITULO } };
    celula.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COR_CABECALHO_TABELA } };
    celula.alignment = { horizontal: alinhamentos[idx] ?? "left", vertical: "middle" };
    celula.border = BORDA_CELULA;
  });
}

export async function exportarRelatorioExcel(
  linhas: LinhaRelatorioPonto[],
  nomeFicheiro = "relatorio-ponto",
  dataInicio?: string,
  dataFim?: string
) {
  const livro = new ExcelJS.Workbook();
  livro.creator = EMPRESA.nome;
  livro.created = new Date();

  const logoBuffer = await obterLogoBuffer();
  const grupos = agruparPorFuncionario(linhas);
  const datasUnicas = Array.from(new Set(linhas.map((l) => l.data))).sort();
  const totalGeral = linhas.reduce((s, l) => s + (l.total_horas || 0), 0);

  const periodo =
    dataInicio && dataFim
      ? dataInicio === dataFim
        ? formatarDataPT(dataInicio)
        : `${formatarDataPT(dataInicio)} a ${formatarDataPT(dataFim)}`
      : null;

  const subtituloResumo = [periodo, grupos.length === 1 ? "1 funcionário" : `${grupos.length} funcionários`]
    .filter(Boolean)
    .join("   ·   ");

  // ---------------------------------------------------------------
  // Folha "Resumo": total de horas por dia, por funcionário, e geral
  // ---------------------------------------------------------------
  const folhaResumo = livro.addWorksheet("Resumo", {
    pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    views: [{ showGridLines: false, state: "frozen", ySplit: 10, xSplit: 2 }],
  });

  folhaResumo.columns = [
    { key: "data", width: 13 },
    { key: "dia", width: 16 },
    ...grupos.map((g, idx) => ({ key: `f${idx}`, width: Math.max(12, Math.min(20, g.nome.length + 2)) })),
    { key: "totalDia", width: 15 },
  ];

  const linhaTabelaResumo = desenharCabecalho(folhaResumo, livro, logoBuffer, "Relatório de Ponto — Resumo", subtituloResumo);

  estilizarCabecalhoTabela(
    folhaResumo,
    linhaTabelaResumo,
    ["Data", "Dia da Semana", ...grupos.map((g) => g.nome), "Total do Dia"],
    ["left", "left", ...grupos.map(() => "right" as const), "right"]
  );

  let linhaAtualResumo = linhaTabelaResumo + 1;
  for (const data of datasUnicas) {
    const linha = folhaResumo.getRow(linhaAtualResumo);
    linha.getCell(1).value = formatarDataPT(data);
    linha.getCell(2).value = nomeDiaSemanaPT(data);

    let totalDia = 0;
    grupos.forEach((g, idx) => {
      const registo = g.registos.find((r) => r.data === data);
      const horas = registo?.total_horas || 0;
      totalDia += horas;
      const celula = linha.getCell(idx + 3);
      celula.value = horas > 0 ? Number(horas.toFixed(2)) : null;
      if (horas > 0) celula.numFmt = '0.00"h"';
      celula.alignment = { horizontal: "right" };
    });

    const celulaTotalDia = linha.getCell(grupos.length + 3);
    celulaTotalDia.value = Number(totalDia.toFixed(2));
    celulaTotalDia.numFmt = '0.00"h"';
    celulaTotalDia.font = { bold: true };
    celulaTotalDia.alignment = { horizontal: "right" };

    for (let col = 1; col <= grupos.length + 3; col++) {
      linha.getCell(col).border = BORDA_CELULA;
      if (col <= 2) linha.getCell(col).font = { size: 10 };
    }
    linhaAtualResumo++;
  }

  const linhaRodapeResumo = folhaResumo.getRow(linhaAtualResumo);
  folhaResumo.mergeCells(linhaAtualResumo, 1, linhaAtualResumo, 2);
  linhaRodapeResumo.getCell(1).value = "Total do funcionário";
  linhaRodapeResumo.getCell(1).alignment = { horizontal: "right" };
  grupos.forEach((g, idx) => {
    const celula = linhaRodapeResumo.getCell(idx + 3);
    celula.value = Number(g.subtotal.toFixed(2));
    celula.numFmt = '0.00"h"';
    celula.alignment = { horizontal: "right" };
  });
  const celulaTotalGeralResumo = linhaRodapeResumo.getCell(grupos.length + 3);
  celulaTotalGeralResumo.value = Number(totalGeral.toFixed(2));
  celulaTotalGeralResumo.numFmt = '0.00"h"';
  celulaTotalGeralResumo.alignment = { horizontal: "right" };
  for (let col = 1; col <= grupos.length + 3; col++) {
    linhaRodapeResumo.getCell(col).font = { bold: true, size: 10, color: { argb: COR_TITULO } };
    linhaRodapeResumo.getCell(col).fill = { type: "pattern", pattern: "solid", fgColor: { argb: COR_SUBTOTAL } };
    linhaRodapeResumo.getCell(col).border = BORDA_CELULA;
  }

  // ---------------------------------------------------------------
  // Uma folha por funcionário
  // ---------------------------------------------------------------
  const nomesFolhaUsados = new Set<string>(["resumo"]);

  for (const grupo of grupos) {
    const nomeFolha = nomeFolhaUnico(grupo.nome, nomesFolhaUsados);
    const folha = livro.addWorksheet(nomeFolha, {
      pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
      views: [{ showGridLines: false }],
    });

    folha.columns = [
      { key: "data", width: 13 },
      { key: "dia", width: 17 },
      { key: "entrada", width: 12 },
      { key: "saidaAlmoco", width: 12 },
      { key: "retornoAlmoco", width: 12 },
      { key: "saida", width: 12 },
      { key: "situacao", width: 14 },
      { key: "horas", width: 15 },
    ];

    const subtitulo = [periodo, grupo.numero ? `Nº ${grupo.numero}` : null].filter(Boolean).join("   ·   ");
    const linhaTabela = desenharCabecalho(folha, livro, logoBuffer, grupo.nome, subtitulo);

    estilizarCabecalhoTabela(
      folha,
      linhaTabela,
      ["Data", "Dia da Semana", "Clock In", "Lunch In", "Lunch Out", "Clock Out", "Situação", "Total de Horas"],
      ["left", "left", "left", "left", "left", "left", "left", "right"]
    );

    let linhaAtual = linhaTabela + 1;
    for (const registo of grupo.registos) {
      const linha = folha.getRow(linhaAtual);
      linha.getCell(1).value = formatarDataPT(registo.data);
      linha.getCell(2).value = nomeDiaSemanaPT(registo.data);
      linha.getCell(3).value = registo.hora_entrada ?? "—";
      linha.getCell(4).value = registo.hora_saida_almoco ?? "—";
      linha.getCell(5).value = registo.hora_retorno_almoco ?? "—";
      linha.getCell(6).value = registo.hora_saida ?? "—";
      linha.getCell(7).value = registo.situacao;
      linha.getCell(8).value = Number((registo.total_horas || 0).toFixed(2));
      linha.getCell(8).numFmt = '0.00"h"';
      linha.getCell(8).alignment = { horizontal: "right" };
      linha.getCell(7).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: CORES_SITUACAO[registo.situacao] ?? "FFFFFFFF" },
      };
      for (let col = 1; col <= 8; col++) {
        linha.getCell(col).border = BORDA_CELULA;
        linha.getCell(col).font = { size: 10 };
      }
      linhaAtual++;
    }

    const linhaSubtotal = folha.getRow(linhaAtual);
    folha.mergeCells(linhaAtual, 1, linhaAtual, 7);
    linhaSubtotal.getCell(1).value = "Total do funcionário";
    linhaSubtotal.getCell(1).alignment = { horizontal: "right" };
    linhaSubtotal.getCell(8).value = Number(grupo.subtotal.toFixed(2));
    linhaSubtotal.getCell(8).numFmt = '0.00"h"';
    linhaSubtotal.getCell(8).alignment = { horizontal: "right" };
    for (let col = 1; col <= 8; col++) {
      linhaSubtotal.getCell(col).font = { bold: true, size: 10, color: { argb: COR_TITULO } };
      linhaSubtotal.getCell(col).fill = { type: "pattern", pattern: "solid", fgColor: { argb: COR_SUBTOTAL } };
      linhaSubtotal.getCell(col).border = BORDA_CELULA;
    }
  }

  const buffer = await livro.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const dataAtual = new Date().toISOString().slice(0, 10);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${nomeFicheiro}-${dataAtual}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
