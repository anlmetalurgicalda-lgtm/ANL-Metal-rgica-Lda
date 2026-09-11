import ExcelJS from "exceljs";
import type { LinhaRelatorioPonto } from "./types";
import { formatarDataPT, nomeDiaSemanaPT } from "./timezone";

export async function exportarRelatorioExcel(
  linhas: LinhaRelatorioPonto[],
  nomeFicheiro = "relatorio-ponto"
) {
  const livro = new ExcelJS.Workbook();
  livro.creator = "ANL Metalúrgica Lda";
  livro.created = new Date();

  const folha = livro.addWorksheet("Relatório de Ponto");

  folha.columns = [
    { header: "Colaborador", key: "colaborador", width: 30 },
    { header: "Nº Funcionário", key: "numero", width: 16 },
    { header: "Data", key: "data", width: 12 },
    { header: "Dia da Semana", key: "diaSemana", width: 16 },
    { header: "Hora de Entrada", key: "entrada", width: 15 },
    { header: "Hora de Saída", key: "saida", width: 15 },
    { header: "Situação", key: "situacao", width: 14 },
    { header: "Total de Horas", key: "totalHoras", width: 15 },
  ];

  folha.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  folha.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2A63F2" },
  };
  folha.getRow(1).alignment = { vertical: "middle", horizontal: "center" };

  for (const linha of linhas) {
    folha.addRow({
      colaborador: linha.nome_completo,
      numero: linha.numero_funcionario ?? "",
      data: formatarDataPT(linha.data),
      diaSemana: nomeDiaSemanaPT(linha.data),
      entrada: linha.hora_entrada ?? "-",
      saida: linha.hora_saida ?? "-",
      situacao: linha.situacao,
      totalHoras: linha.total_horas,
    });
  }

  const totalGeral = linhas.reduce((soma, l) => soma + (l.total_horas || 0), 0);
  const linhaTotal = folha.addRow({
    colaborador: "",
    numero: "",
    data: "",
    diaSemana: "",
    entrada: "",
    saida: "",
    situacao: "Total geral:",
    totalHoras: Number(totalGeral.toFixed(2)),
  });
  linhaTotal.font = { bold: true };

  folha.autoFilter = { from: "A1", to: "H1" };

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
