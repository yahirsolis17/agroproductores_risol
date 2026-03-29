type NumericInputOptions = {
  allowDecimal?: boolean;
  allowNegative?: boolean;
  maxDecimals?: number;
};

export function stripThousandsSeparators(value: string): string {
  return String(value ?? "")
    .replace(/,/g, "")
    .replace(/\s+/g, "");
}

export function normalizeNumericInput(value: string, opts: NumericInputOptions = {}): string {
  const { allowDecimal = true, allowNegative = false, maxDecimals } = opts;
  let next = stripThousandsSeparators(value);
  if (!next) return "";

  // Keep only allowed chars.
  next = next.replace(allowDecimal ? /[^0-9.-]/g : /[^0-9-]/g, "");

  // Handle sign.
  const hasMinus = next.startsWith("-");
  next = next.replace(/-/g, "");
  if (allowNegative && hasMinus) next = `-${next}`;

  if (allowDecimal) {
    // UI-ONLY: sanitize/normalize numeric text input for presentation fields.
    const sign = next.startsWith("-") ? "-" : "";
    const unsigned = sign ? next.slice(1) : next;
    const firstDot = unsigned.indexOf(".");

    if (firstDot >= 0) {
      // UI-ONLY: split/slice here is only for display-time decimal normalization.
      const intPart = unsigned.slice(0, firstDot).replace(/\./g, "");
      let fracPart = unsigned.slice(firstDot + 1).replace(/\./g, "");
      if (typeof maxDecimals === "number" && maxDecimals >= 0) {
        // UI-ONLY: trimming decimal precision for input rendering.
        fracPart = fracPart.slice(0, maxDecimals);
      }
      const safeInt = intPart.replace(/^0+(?=\d)/, "");
      return `${sign}${safeInt || "0"}.${fracPart}`;
    }

    const safeInt = unsigned.replace(/^0+(?=\d)/, "");
    return `${sign}${safeInt}`;
  }

  const sign = next.startsWith("-") ? "-" : "";
  // UI-ONLY: integer normalization for controlled input display.
  const unsigned = sign ? next.slice(1) : next;
  const safeInt = unsigned.replace(/^0+(?=\d)/, "");
  return `${sign}${safeInt}`;
}

export function formatWithThousands(value: string | number, opts: NumericInputOptions = {}): string {
  const { allowDecimal = true } = opts;
  const raw = String(value ?? "").trim();
  if (!raw) return "";

  const normalized = normalizeNumericInput(raw, opts);
  if (!normalized) return "";

  const sign = normalized.startsWith("-") ? "-" : "";
  // UI-ONLY: formatting-only split for thousand separators in UI inputs.
  const unsigned = sign ? normalized.slice(1) : normalized;

  if (allowDecimal && unsigned.includes(".")) {
    const [intPart, fracPart] = unsigned.split(".", 2);
    const groupedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return `${sign}${groupedInt}.${fracPart}`;
  }

  return `${sign}${unsigned.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

export function parseIntegerInput(value: string | number): number {
  const normalized = normalizeNumericInput(String(value ?? ""), { allowDecimal: true });
  const n = Number(normalized);
  return Number.isFinite(n) ? Math.trunc(n) : NaN;
}

export function parseDecimalInput(value: string | number): number {
  const normalized = normalizeNumericInput(String(value ?? ""), { allowDecimal: true });
  const n = Number(normalized);
  return Number.isFinite(n) ? n : NaN;
}
