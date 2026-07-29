/** Smart column detection — retailer-agnostic. */

export type MappedColumns = {
  name: string | null;
  brand: string | null;
  category: string | null;
  variant: string | null;
  barcode: string | null;
  size: string | null;
  unit: string | null;
  price: string | null;
  alias: string | null;
  description: string | null;
};

type ColumnRule = {
  field: keyof MappedColumns;
  patterns: RegExp[];
};

const RULES: ColumnRule[] = [
  {
    field: "name",
    patterns: [
      /^product\s*name$/i,
      /^product$/i,
      /^title$/i,
      /^name$/i,
      /^ürün\s*ad[ıi]$/i,
      /^urun\s*adi$/i,
      /^ürün$/i,
      /^urun$/i,
      /^item$/i,
    ],
  },
  {
    field: "description",
    patterns: [
      /^desc(ription)?$/i,
      /^detay$/i,
      /^detail$/i,
      /^açıklama$/i,
      /^aciklama$/i,
    ],
  },
  {
    field: "brand",
    patterns: [/^brand$/i, /^marka$/i, /^manufacturer$/i, /^üretici$/i],
  },
  {
    field: "category",
    patterns: [/^category$/i, /^kategori$/i, /^cat$/i, /^grup$/i],
  },
  {
    field: "variant",
    patterns: [
      /^variant$/i,
      /^varyant$/i,
      /^flavor$/i,
      /^aroma$/i,
      /^tür$/i,
      /^tur$/i,
    ],
  },
  {
    field: "barcode",
    patterns: [/^barcode$/i, /^barkod$/i, /^ean$/i, /^gtin$/i, /^sku$/i],
  },
  {
    field: "size",
    patterns: [
      /^size$/i,
      /^boyut$/i,
      /^package\s*size$/i,
      /^paket$/i,
      /^miktar$/i,
      /^volume$/i,
      /^hacim$/i,
    ],
  },
  {
    field: "unit",
    patterns: [/^unit$/i, /^birim$/i, /^ölçü\s*birimi$/i],
  },
  {
    field: "price",
    patterns: [/^price$/i, /^fiyat$/i, /^unit\s*price$/i, /^birim\s*fiyat$/i],
  },
  {
    field: "alias",
    patterns: [/^alias(es)?$/i, /^ocr$/i, /^alternatif$/i, /^synonym$/i],
  },
];

function scoreHeader(header: string, patterns: RegExp[]): number {
  const h = header.trim();
  for (const p of patterns) {
    if (p.test(h)) return 100;
  }
  return 0;
}

export function detectColumns(headers: string[]): MappedColumns {
  const mapped: MappedColumns = {
    name: null,
    brand: null,
    category: null,
    variant: null,
    barcode: null,
    size: null,
    unit: null,
    price: null,
    alias: null,
    description: null,
  };

  const used = new Set<string>();

  for (const rule of RULES) {
    let best: { header: string; score: number } | null = null;
    for (const h of headers) {
      if (used.has(h)) continue;
      const score = scoreHeader(h, rule.patterns);
      if (score > 0 && (!best || score > best.score)) {
        best = { header: h, score };
      }
    }
    if (best) {
      mapped[rule.field] = best.header;
      used.add(best.header);
    }
  }

  if (!mapped.name) {
    const fallback = headers.find((h) => !used.has(h));
    if (fallback) mapped.name = fallback;
  }

  return mapped;
}

export function getCell(
  row: Record<string, string>,
  column: string | null
): string {
  if (!column) return "";
  return (row[column] ?? "").trim();
}
