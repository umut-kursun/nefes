import type { CorpusReceiptId } from "./types";

export type ReceiptGroundTruth = {
  readonly id: CorpusReceiptId;
  readonly name: string;
  readonly domain: string;
  readonly merchantContains: string;
  readonly merchantCanonical?: string;
  readonly total: number;
  readonly vat?: number;
  readonly paymentAmount?: number;
  readonly categoryId: string;
  readonly date?: string;
  readonly time?: string;
  readonly productCount?: number;
  readonly productNameHints?: readonly string[];
  readonly fuelType?: string;
  readonly fuelQty?: number;
  readonly fuelUnitPrice?: number;
  readonly plateContains?: string;
};

/** Frozen A–I contract ground truth (read-only reference; does not modify corpus-v0). */
export const RECEIPT_GROUND_TRUTH: Record<CorpusReceiptId, ReceiptGroundTruth> = {
  A: {
    id: "A",
    name: "Migros 0347",
    domain: "supermarket",
    merchantContains: "Migros",
    merchantCanonical: "Migros",
    total: 477.9,
    vat: 33.99,
    paymentAmount: 477.9,
    categoryId: "market",
    date: "2026-08-16",
    time: "19:33",
    productCount: 5,
    productNameHints: ["Coca", "Lipton", "Patates", "Poşet", "Selpak"],
  },
  B: {
    id: "B",
    name: "5M Migros 0242",
    domain: "supermarket",
    merchantContains: "5M",
    merchantCanonical: "Migros",
    total: 1978.99,
    vat: 127.22,
    paymentAmount: 1978.99,
    categoryId: "market",
    date: "2026-08-15",
    time: "21:38",
    productCount: 16,
  },
  C: {
    id: "C",
    name: "File Market",
    domain: "supermarket",
    merchantContains: "File Market",
    merchantCanonical: "File Market",
    total: 1118.83,
    vat: 18.67,
    paymentAmount: 1118.83,
    categoryId: "market",
    productCount: 16,
  },
  D: {
    id: "D",
    name: "Tiki Beach",
    domain: "restaurant",
    merchantContains: "Tiki",
    merchantCanonical: "Tiki Beach",
    total: 365.0,
    vat: 33.18,
    paymentAmount: 365.0,
    categoryId: "yeme_icme",
    date: "2026-08-11",
    time: "23:46",
    productCount: 1,
    productNameHints: ["İÇECEK"],
  },
  E: {
    id: "E",
    name: "Altınkılıçlar Kahve",
    domain: "restaurant",
    merchantContains: "Altınkılıç",
    merchantCanonical: "Altınkılıçlar Kahve",
    total: 695.0,
    vat: 63.18,
    paymentAmount: 695.0,
    categoryId: "yeme_icme",
    date: "2026-08-08",
    time: "10:49",
    productCount: 4,
    productNameHints: ["Keten", "Espresso", "Cappuccino", "Americano"],
  },
  F: {
    id: "F",
    name: "Petrol Ofisi",
    domain: "fuel",
    merchantContains: "Petrol",
    merchantCanonical: "Petrol Ofisi",
    total: 2200.66,
    vat: 366.78,
    paymentAmount: 2200.66,
    categoryId: "akaryakit",
    productCount: 1,
    productNameHints: ["DIESEL", "Motorin", "Dizel", "V/MAX"],
    fuelType: "motorin",
    fuelQty: 30.8,
    fuelUnitPrice: 71.45,
  },
  G: {
    id: "G",
    name: "Çehre Gıda",
    domain: "restaurant",
    merchantContains: "Çehre",
    merchantCanonical: "Çehre Gıda",
    total: 3704.0,
    vat: 336.73,
    paymentAmount: 3704.0,
    categoryId: "yeme_icme",
    date: "2026-08-11",
    time: "21:16",
    productCount: 8,
  },
  H: {
    id: "H",
    name: "Şengül Hediyelik",
    domain: "retail",
    merchantContains: "Şengül",
    merchantCanonical: "Şengül Hediyelik",
    total: 1000.0,
    paymentAmount: 1000.0,
    categoryId: "diger",
    date: "2026-08-12",
    time: "00:05",
    productCount: 1,
    productNameHints: ["Hediyelik", "HEDİYELİK"],
  },
  I: {
    id: "I",
    name: "Özyıldız Petrol",
    domain: "fuel",
    merchantContains: "Özyıldız",
    merchantCanonical: "Özyıldız Petrol",
    total: 1000.0,
    paymentAmount: 1000.0,
    categoryId: "akaryakit",
    date: "2026-08-08",
    time: "12:19",
    productCount: 1,
    productNameHints: ["MOTORİN", "Motorin"],
    fuelType: "motorin",
    fuelQty: 12.5,
    fuelUnitPrice: 79.99,
    plateContains: "34",
  },
};

export function getGroundTruth(id: CorpusReceiptId): ReceiptGroundTruth {
  return RECEIPT_GROUND_TRUTH[id];
}
