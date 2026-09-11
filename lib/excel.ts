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
const COR_TEXTO_CLARO = "FFFFFFFF";
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

export async function exportarRelatorioExcel(
  linhas: LinhaRelatorioPonto[],
  nomeFicheiro = "relatorio-ponto",
  dataInicio?: string,
  dataFim?: string
) {
  const livro = new ExcelJS.Workbook();
  livro.creator = EMPRESA.nome;
  livro.created = new Date();

  const folha = livro.addWorksheet("Relatório de Ponto", {
    pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    views: [{ showGridLines: false }],
  });

  folha.columns = [
    { key: "a", width: 15 },
    { key: "b", width: 17 },
    { key: "c", width: 14 },
    { key: "d", width: 14 },
    { key: "e", width: 14 },
    { key: "f", width: 16 },
  ];

  // ---------------------------------------------------------------
  // Cabeçalho / papel timbrado
  // ---------------------------------------------------------------
  for (let i = 1; i <= 5; i++) folha.getRow(i).height = 16;

  const logoBuffer = await obterLogoBuffer();
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

  folha.mergeCells("E1:F1");
  folha.getCell("E1").value = "Relatório de Ponto";
  folha.getCell("E1").font = { bold: true, size: 14, color: { argb: COR_MARCA } };
  folha.getCell("E1").alignment = { horizontal: "right" };

  const periodo =
    dataInicio && dataFim
      ? dataInicio === dataFim
        ? formatarDataPT(dataInicio)
        : `${formatarDataPT(dataInicio)} a ${formatarDataPT(dataFim)}`
      : null;

  if (periodo) {
    folha.mergeCells("E2:F2");
    folha.getCell("E2").value = periodo;
    folha.getCell("E2").font = { size: 10, color: { argb: COR_SUBTITULO } };
    folha.getCell("E2").alignment = { horizontal: "right" };
  }

  const grupos = agruparPorFuncionario(linhas);
  folha.mergeCells("E3:F3");
  folha.getCell("E3").value =
    grupos.length === 1 ? "1 colaborador" : `${grupos.length} colaboradores`;
  folha.getCell("E3").font = { size: 10, color: { argb: COR_SUBTITULO } };
  folha.getCell("E3").alignment = { horizontal: "right" };

  folha.getCell("A6").border = { bottom: { style: "medium", color: { argb: COR_MARCA } } };
  folha.mergeCells("A6:F6");
  folha.getRow(6).height = 4;

  // ---------------------------------------------------------------
  // Uma secção por colaborador
  // ---------------------------------------------------------------
  let linhaAtual = 8;

  for (const grupo of grupos) {
    const linhaGrupo = folha.getRow(linhaAtual);
    folha.mergeCells(linhaAtual, 1, linhaAtual, 6);
    linhaGrupo.getCell(1).value = grupo.numero
      ? `${grupo.nome}   ·   Nº ${grupo.numero}`
      : grupo.nome;
    linhaGrupo.getCell(1).font = { bold: true, size: 12, color: { argb: COR_TEXTO_CLARO } };
    linhaGrupo.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: COR_MARCA } };
    linhaGrupo.getCell(1).alignment = { vertical: "middle" };
    linhaGrupo.height = 22;
    linhaAtual++;

    const linhaCabecalho = folha.getRow(linhaAtual);
    const titulos = ["Data", "Dia da Semana", "Entrada", "Saída", "Situação", "Total de Horas"];
    titulos.forEach((titulo, idx) => {
      const celula = linhaCabecalho.getCell(idx + 1);
      celula.value = titulo;
      celula.font = { bold: true, size: 10, color: { argb: COR_TITULO } };
      celula.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COR_CABECALHO_TABELA } };
      celula.alignment = { horizontal: idx === 5 ? "right" : "left", vertical: "middle" };
      celula.border = BORDA_CELULA;
    });
    linhaAtual++;

    for (const registo of grupo.registos) {
      const linhaDados = folha.getRow(linhaAtual);
      linhaDados.getCell(1).value = formatarDataPT(registo.data);
      linhaDados.getCell(2).value = nomeDiaSemanaPT(registo.data);
      linhaDados.getCell(3).value = registo.hora_entrada ?? "—";
      linhaDados.getCell(4).value = registo.hora_saida ?? "—";
      linhaDados.getCell(5).value = registo.situacao;
      linhaDados.getCell(6).value = Number((registo.total_horas || 0).toFixed(2));
      linhaDados.getCell(6).numFmt = '0.00"h"';
      linhaDados.getCell(6).alignment = { horizontal: "right" };
      linhaDados.getCell(5).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: CORES_SITUACAO[registo.situacao] ?? "FFFFFFFF" },
      };
      for (let col = 1; col <= 6; col++) {
        linhaDados.getCell(col).border = BORDA_CELULA;
        linhaDados.getCell(col).font = { size: 10 };
      }
      linhaAtual++;
    }

    const linhaSubtotal = folha.getRow(linhaAtual);
    folha.mergeCells(linhaAtual, 1, linhaAtual, 5);
    linhaSubtotal.getCell(1).value = "Total do colaborador";
    linhaSubtotal.getCell(1).alignment = { horizontal: "right" };
    linhaSubtotal.getCell(6).value = Number(grupo.subtotal.toFixed(2));
    linhaSubtotal.getCell(6).numFmt = '0.00"h"';
    linhaSubtotal.getCell(6).alignment = { horizontal: "right" };
    for (let col = 1; col <= 6; col++) {
      linhaSubtotal.getCell(col).font = { bold: true, size: 10, color: { argb: COR_TITULO } };
      linhaSubtotal.getCell(col).fill = { type: "pattern", pattern: "solid", fgColor: { argb: COR_SUBTOTAL } };
      linhaSubtotal.getCell(col).border = BORDA_CELULA;
    }
    linhaAtual += 2;
  }

  // ---------------------------------------------------------------
  // Total geral
  // ---------------------------------------------------------------
  const totalGeral = linhas.reduce((soma, l) => soma + (l.total_horas || 0), 0);
  const linhaTotalGeral = folha.getRow(linhaAtual);
  folha.mergeCells(linhaAtual, 1, linhaAtual, 5);
  linhaTotalGeral.getCell(1).value = "Total geral do período";
  linhaTotalGeral.getCell(1).alignment = { horizontal: "right", vertical: "middle" };
  linhaTotalGeral.getCell(6).value = Number(totalGeral.toFixed(2));
  linhaTotalGeral.getCell(6).numFmt = '0.00"h"';
  linhaTotalGeral.getCell(6).alignment = { horizontal: "right", vertical: "middle" };
  linhaTotalGeral.height = 24;
  for (let col = 1; col <= 6; col++) {
    linhaTotalGeral.getCell(col).font = { bold: true, size: 12, color: { argb: COR_TEXTO_CLARO } };
    linhaTotalGeral.getCell(col).fill = { type: "pattern", pattern: "solid", fgColor: { argb: COR_MARCA } };
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
