import { formatInTimeZone } from "date-fns-tz";
import { pt } from "date-fns/locale";

export const FUSO_HORARIO = "Europe/Lisbon";

export function agoraLisboa(): Date {
  return new Date();
}

export function formatarDataHoraLisboa(data: string | Date, formato = "dd/MM/yyyy HH:mm"): string {
  return formatInTimeZone(data, FUSO_HORARIO, formato, { locale: pt });
}

export function formatarHoraLisboa(data: string | Date): string {
  return formatInTimeZone(data, FUSO_HORARIO, "HH:mm");
}

export function dataLisboaISO(data: Date = new Date()): string {
  return formatInTimeZone(data, FUSO_HORARIO, "yyyy-MM-dd");
}

const DIAS_SEMANA_PT = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

export function nomeDiaSemanaPT(dataISO: string): string {
  const [ano, mes, dia] = dataISO.split("-").map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  return DIAS_SEMANA_PT[data.getUTCDay()];
}

export function formatarDataPT(dataISO: string): string {
  const [ano, mes, dia] = dataISO.split("-");
  return `${dia}/${mes}/${ano}`;
}
