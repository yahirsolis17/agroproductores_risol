import fs from "node:fs";
import path from "node:path";

// Ejecutar desde la raíz del repo (frontend/..)
const ROOT = path.resolve(process.cwd());

// Directorios a inspeccionar
const FRONTEND_DIRS = [
  "frontend/src/modules/gestion_bodega",
  "frontend/src/modules/gestion_huerta",
  "frontend/src/modules/gestion_usuarios",
  "frontend/src/global",
];

const BACKEND_DIRS = [
  "backend/gestion_bodega",
  "backend/gestion_huerta",
  "backend/gestion_usuarios",
];

// Heurísticas ligeras para clasificar archivos de frontend
function classifyFrontend(content) {
  const isReduxSlice =
    content.includes("createSlice") || content.includes("createAsyncThunk");
  const usesReactQuery = content.includes("@tanstack/react-query");
  const usesReduxHook =
    content.includes("useSelector") || content.includes("useDispatch");
  const usesLocalState =
    content.includes("useState(") || content.includes("useReducer(");

  const notificationsBackendOnly =
    content.includes("handleBackendNotification") ||
    content.includes("notification");
  const metaFallback =
    content.includes("meta ??") ||
    content.includes("meta: payload?.meta") ||
    content.includes("payload?.meta ??");
  const unwrapData = content.includes("unwrapData");

  const tags = [];
  if (isReduxSlice) tags.push("redux-slice");
  if (usesReduxHook) tags.push("redux-hook");
  if (usesReactQuery) tags.push("react-query");
  if (!isReduxSlice && usesLocalState) tags.push("local-state");
  if (notificationsBackendOnly) tags.push("notif");
  if (metaFallback) tags.push("meta-fallback");
  if (unwrapData) tags.push("unwrap-data");
  if (tags.length === 0) tags.push("other");

  return tags.join(",");
}

// Heurísticas backend (notificaciones, paginación, filtros)
function classifyBackend(content) {
  const hasNotificationMessages = content.includes("NOTIFICATION_MESSAGES");
  const usesPagination = content.includes("PageNumberPagination");
  const hasFilterSet = content.includes("filterset_fields") || content.includes("DjangoFilterBackend");
  const usesSerializerValidation = content.includes("validate(") || content.includes("validate_");
  const usesMeta = content.includes("meta") && content.includes("results");

  const tags = [];
  if (hasNotificationMessages) tags.push("notifications");
  if (usesPagination) tags.push("pagination");
  if (hasFilterSet) tags.push("filters");
  if (usesSerializerValidation) tags.push("serializers-validate");
  if (usesMeta) tags.push("meta/results");
  if (tags.length === 0) tags.push("other");
  return tags.join(",");
}

function walk(dir, list = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, list);
    } else if (entry.isFile()) {
      list.push(full);
    }
  }
  return list;
}

function analyzeFrontend() {
  const rows = [];
  for (const relDir of FRONTEND_DIRS) {
    const dir = path.join(ROOT, relDir);
    if (!fs.existsSync(dir)) continue;
    for (const file of walk(dir)) {
      if (!file.endsWith(".ts") && !file.endsWith(".tsx") && !file.endsWith(".d.ts")) continue;
      const content = fs.readFileSync(file, "utf8");
      const kind = classifyFrontend(content);
      rows.push({ file: path.relative(ROOT, file), kind });
    }
  }
  return rows;
}

function analyzeBackend() {
  const rows = [];
  for (const relDir of BACKEND_DIRS) {
    const dir = path.join(ROOT, relDir);
    if (!fs.existsSync(dir)) continue;
    for (const file of walk(dir)) {
      if (!file.endsWith(".py")) continue;
      const content = fs.readFileSync(file, "utf8");
      const kind = classifyBackend(content);
      rows.push({ file: path.relative(ROOT, file), kind });
    }
  }
  return rows;
}

function toTable(rows) {
  const lines = ["file,kind"];
  for (const row of rows.sort((a, b) => a.file.localeCompare(b.file))) {
    lines.push(`${row.file},${row.kind}`);
  }
  return lines.join("\n");
}

function main() {
  const feRows = analyzeFrontend();
  const beRows = analyzeBackend();

  console.log("=== Frontend (clasificación heurística) ===");
  console.log(toTable(feRows));
  console.log("\n=== Backend (notifs/paginación/filtros/validaciones) ===");
  console.log(toTable(beRows));
}

main();
