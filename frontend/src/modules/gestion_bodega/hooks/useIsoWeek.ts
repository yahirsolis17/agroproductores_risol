// src/modules/gestion_bodega/hooks/useIsoWeek.ts
// Utilidades Semana ISO + pequeño hook opcional.
// - Sin dependencias externas. Usa Date nativo + helpers de formato.
// - Exporta funciones puras: startOfISOWeek, endOfISOWeek, shiftISOWeek,
//   dateToIsoKey, isoKeyToRange, prettyRange, guessIsoFromRange.
// - Exporta también un hook opcional useIsoWeek para quien lo necesite.

import { useMemo, useState } from "react";
import { formatDateISO, parseLocalDateStrict } from "../../../global/utils/date";

// ───────────────────────────────────────────────────────────────────────────────
// Internos
function pad2(n: number) {
  return n < 10 ? `0${n}` : String(n);
}

function getISODay(d: Date) {
  // JS: 0=domingo..6=sábado → ISO: 1=lunes..7=domingo
  const day = d.getDay();
  return day === 0 ? 7 : day;
}

function getISOWeekYear(d: Date) {
  const date = new Date(d.getTime());
  date.setHours(0, 0, 0, 0);
  // El año ISO es el del jueves de la semana actual
  const thursday = new Date(date.getTime());
  thursday.setDate(date.getDate() + (4 - getISODay(date)));
  return thursday.getFullYear();
}

function getISOWeek(d: Date) {
  const date = new Date(d.getTime());
  date.setHours(0, 0, 0, 0);
  // Jueves de esta semana
  const thursday = new Date(date.getTime());
  thursday.setDate(date.getDate() + (4 - getISODay(date)));

  // Primer día del año del jueves (no ISO; solo para cálculo aproximado de semana)
  const yearStart = new Date(thursday.getFullYear(), 0, 1);
  const week = Math.floor(((thursday.getTime() - yearStart.getTime()) / 86400000 + getISODay(yearStart) + 3) / 7);
  return week;
}

// ───────────────────────────────────────────────────────────────────────────────
// API pública (funciones puras)
export function startOfISOWeek(d: Date) {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = (date.getDay() + 6) % 7; // días desde lunes
  date.setDate(date.getDate() - diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function endOfISOWeek(d: Date) {
  const s = startOfISOWeek(d);
  const e = new Date(s.getFullYear(), s.getMonth(), s.getDate() + 6);
  e.setHours(23, 59, 59, 999);
  return e;
}

export function shiftISOWeek(d: Date, weeks: number) {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  copy.setDate(copy.getDate() + weeks * 7);
  return copy;
}

export function dateToIsoKey(d: Date) {
  const monday = startOfISOWeek(d);
  const year = getISOWeekYear(monday);
  const week = getISOWeek(monday);
  return `${year}-W${pad2(week)}`; // YYYY-Www
}

// Dado YYYY-Www, devuelve el lunes/domingo de esa semana (YYYY-MM-DD)
export function isoKeyToRange(isoKey: string): { from: string; to: string } | null {
  const m = isoKey.match(/^(\d{4})-W(\d{2})$/);
  if (!m) return null;
  const year = Number(m[1]);
  const week = Number(m[2]);

  // Regla ISO: Semana 1 es la que contiene el 4 de enero
  const jan4 = new Date(year, 0, 4);
  const jan4ISODow = getISODay(jan4);
  const mondayWeek1 = new Date(jan4);
  mondayWeek1.setDate(jan4.getDate() - (jan4ISODow - 1));

  const monday = new Date(mondayWeek1);
  monday.setDate(mondayWeek1.getDate() + (week - 1) * 7);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return { from: formatDateISO(monday), to: formatDateISO(sunday) };
}

export function prettyRange(fromISO: string, toISO: string) {
  const from = parseLocalDateStrict(fromISO);
  const to = parseLocalDateStrict(toISO);

  const fmt = (d: Date) =>
    d.toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "short",
      year: d.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
    });

  return `${fmt(from)} – ${fmt(to)}`;
}

/** Infiera una clave ISO (YYYY-Www) desde un rango {from,to}.
 *  - Si hay ambos y caen en semanas ISO distintas, se prioriza 'from'.
 *  - Si solo hay uno, se usa ese como base.
 *  - Devuelve null si no puede parsear.
 */
export function guessIsoFromRange(range: { from?: string | null; to?: string | null }): string | null {
  const baseStr = range.from ?? range.to ?? null;
  if (!baseStr) return null;
  const base = parseLocalDateStrict(baseStr);
  if (Number.isNaN(base.getTime())) return null;

  // Si hay ambos, comprobamos si pertenecen a la misma semana ISO.
  if (range.from && range.to) {
    const fMon = startOfISOWeek(parseLocalDateStrict(range.from));
    const tMon = startOfISOWeek(parseLocalDateStrict(range.to));
    // Si difieren, sigue prevaleciendo la semana de 'from'
    // (comportamiento definido para mantener consistencia en filtros).
    void tMon; // no-op para claridad
    return dateToIsoKey(fMon);
  }

  return dateToIsoKey(base);
}

// ───────────────────────────────────────────────────────────────────────────────
// Hook opcional (por si en algún punto necesitas tener isoSemana + rango juntos)
export function useIsoWeek(initialIsoKey?: string) {
  const [isoSemana, setIsoSemana] = useState<string | undefined>(initialIsoKey);

  const range = useMemo(() => {
    if (isoSemana) {
      const r = isoKeyToRange(isoSemana);
      if (r) return r;
    }
    const today = new Date();
    return {
      from: formatDateISO(startOfISOWeek(today)),
      to: formatDateISO(endOfISOWeek(today)),
    };
  }, [isoSemana]);

  return { isoSemana, setIsoSemana, range };
}

export default useIsoWeek;
