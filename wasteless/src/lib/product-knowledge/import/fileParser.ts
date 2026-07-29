import Papa from "papaparse";
import * as XLSX from "xlsx";

export type RawImportTable = {
  rows: Record<string, string>[];
  headers: string[];
  fileName: string;
  format: "csv" | "xlsx" | "json";
};

function normalizeHeaderKey(key: string): string {
  return key.trim();
}

function rowToStrings(
  row: Record<string, unknown>,
  headers: string[]
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const h of headers) {
    const v = row[h];
    out[h] =
      v == null
        ? ""
        : typeof v === "number"
          ? String(v)
          : String(v).trim();
  }
  return out;
}

function parseJsonTable(text: string, fileName: string): RawImportTable {
  const parsed = JSON.parse(text) as unknown;
  let rows: Record<string, unknown>[] = [];

  if (Array.isArray(parsed)) {
    rows = parsed.filter((r) => r && typeof r === "object") as Record<
      string,
      unknown
    >[];
  } else if (parsed && typeof parsed === "object") {
    const obj = parsed as Record<string, unknown>;
    const candidate =
      obj.products ?? obj.items ?? obj.rows ?? obj.data ?? obj.catalog;
    if (Array.isArray(candidate)) {
      rows = candidate as Record<string, unknown>[];
    }
  }

  if (rows.length === 0) {
    throw new Error("JSON dosyasında içe aktarılabilir satır bulunamadı.");
  }

  const headers = Object.keys(rows[0] ?? {}).map(normalizeHeaderKey);
  return {
    rows: rows.map((r) => rowToStrings(r, headers)),
    headers,
    fileName,
    format: "json",
  };
}

function parseCsvTable(text: string, fileName: string): RawImportTable {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: normalizeHeaderKey,
  });
  if (result.errors.length > 0 && result.data.length === 0) {
    throw new Error(result.errors[0]?.message ?? "CSV ayrıştırılamadı.");
  }
  const rows = result.data.map((row) => {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(row)) {
      out[normalizeHeaderKey(k)] = v?.trim?.() ?? String(v ?? "").trim();
    }
    return out;
  });
  const headers = result.meta.fields?.map(normalizeHeaderKey) ?? [];
  return { rows, headers, fileName, format: "csv" };
}

function parseXlsxTable(buffer: ArrayBuffer, fileName: string): RawImportTable {
  const wb = XLSX.read(buffer, { type: "array" });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) throw new Error("Excel dosyasında sayfa bulunamadı.");
  const sheet = wb.Sheets[sheetName]!;
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
  });
  if (json.length === 0) throw new Error("Excel sayfası boş.");
  const headers = Object.keys(json[0] ?? {}).map(normalizeHeaderKey);
  return {
    rows: json.map((r) => rowToStrings(r, headers)),
    headers,
    fileName,
    format: "xlsx",
  };
}

export async function parseImportFile(file: File): Promise<RawImportTable> {
  const name = file.name;
  const lower = name.toLowerCase();

  if (lower.endsWith(".json")) {
    return parseJsonTable(await file.text(), name);
  }
  if (lower.endsWith(".csv")) {
    return parseCsvTable(await file.text(), name);
  }
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
    return parseXlsxTable(await file.arrayBuffer(), name);
  }

  const head = (await file.slice(0, 4).text()).trim();
  if (head.startsWith("{") || head.startsWith("[")) {
    return parseJsonTable(await file.text(), name);
  }
  return parseCsvTable(await file.text(), name);
}

export function supportedImportExtensions(): string {
  return ".csv,.xlsx,.xls,.json";
}
