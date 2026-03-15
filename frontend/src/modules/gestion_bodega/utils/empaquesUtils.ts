// frontend/src/modules/gestion_bodega/utils/empaquesUtils.ts

/**
 * Normaliza CALIDAD hacia backend (enum/códigos).
 */
export function normalizeCalidadToBackend(material: string, calidad: string): string {
    const mat = String(material ?? "").trim().toUpperCase();
    const raw = String(calidad ?? "").trim().toUpperCase();
  
    const aliases: Record<string, string> = {
      "NIÑO": "NINIO",
      "NINO": "NINIO",
      "NINIO": "NINIO",
      "ROÑA": "RONIA",
      "RONA": "RONIA",
      "RONIA": "RONIA",
      "PRIMERA (≥ 2DA)": "PRIMERA",
      "PRIMERA (>= 2DA)": "PRIMERA",
      "PRIMERA (≥ 2DA.)": "PRIMERA",
      "PRIMERA (>= 2DA.)": "PRIMERA",
    };
  
    const c = aliases[raw] ?? raw;
    if (c === "MADURO" || c === "MERMA") return c;
    if (mat === "PLASTICO") {
      if (c === "SEGUNDA" || c === "EXTRA") return "PRIMERA";
    }
    return c;
}
  
/**
 * Normaliza CALIDAD hacia UI (labels).
 */
export function normalizeCalidadToUI(material: string, calidad: string): string {
    const mat = String(material ?? "").trim().toUpperCase();
    const raw = String(calidad ?? "").trim().toUpperCase();
  
    if (!raw) return "";
    if (raw === "NINIO") return "Niño";
    if (raw === "RONIA") return "Roña";
    if (mat === "PLASTICO" && raw === "PRIMERA") return "Primera (≥ 2da)";
    return raw.charAt(0) + raw.substring(1).toLowerCase();
}

/**
 * Transforma y agrupa los resultados de /disponibles/ (filtering MERMA).
 */
export function transformDisponiblesAgrupados(resultsRaw: any[]): Array<{
    calidad: string;
    material: string;
    tipo_mango: string;
    disponible: number;
    fecha_min: string;
    huerteros: string;
}> {
    // UI-ONLY: this filtering/grouping is purely for rendering-friendly grouped rows.
    const filtered = resultsRaw.filter((item) => {
        const cal = String(item.calidad ?? "").toUpperCase().trim();
        return cal !== "MERMA";
    });
    
    const grouped = filtered.reduce((acc, item) => {
        const material = String(item.material ?? "").toUpperCase();
        const calidadBackend = String(item.calidad ?? "").toUpperCase();
        const tipo_mango = String(item.tipo_mango ?? "");
        const key = `${calidadBackend}-${material}-${tipo_mango}`;

        if (!acc[key]) {
            acc[key] = {
                calidad: calidadBackend,
                material: material,
                tipo_mango: tipo_mango,
                disponible: 0,
                fecha_min: item.fecha || "",
                huerteros_set: new Set<string>(),
            };
        }

        acc[key].disponible += Number(item.disponible || 0);
        const huertero = String(item.huertero ?? "").trim();
        if (huertero) acc[key].huerteros_set.add(huertero);

        if (item.fecha && (!acc[key].fecha_min || item.fecha < acc[key].fecha_min)) {
            acc[key].fecha_min = item.fecha;
        }

        return acc;
    }, {} as Record<string, any>);

    return Object.values(grouped).map((g: any) => ({
        calidad: g.calidad,
        material: g.material,
        tipo_mango: g.tipo_mango,
        disponible: g.disponible,
        fecha_min: g.fecha_min,
        huerteros: Array.from(g.huerteros_set as Set<string>).join(", ") || "—",
    }));
}
