import type { GoldenFixtureMeta } from "./types";

/** Permanent V3 golden dataset — minimum 20 receipt categories. */
export const GOLDEN_FIXTURE_CATALOG: readonly GoldenFixtureMeta[] = Object.freeze([
  { slug: "migros", label: "Migros", category: "market", legacyRef: "migros-ortak-pos", image: null, imageNote: "Add scan to cases/migros/image.jpg" },
  { slug: "carrefoursa", label: "CarrefourSA", category: "market", image: null },
  { slug: "a101", label: "A101", category: "market", image: null },
  { slug: "bim", label: "BIM", category: "market", image: null },
  { slug: "sok", label: "Şok", category: "market", image: null },
  { slug: "macrocenter", label: "Macrocenter", category: "market", image: null },
  { slug: "shell", label: "Shell", category: "fuel", legacyRef: "shell-motorin", image: null },
  { slug: "opet", label: "Opet", category: "fuel", legacyRef: "opet-benzin", image: null },
  { slug: "bp", label: "BP", category: "fuel", image: null },
  { slug: "petrol-ofisi", label: "Petrol Ofisi", category: "fuel", image: null },
  { slug: "restaurant", label: "Restaurant", category: "restaurant", legacyRef: "lezzet-restaurant", image: null },
  { slug: "cafe", label: "Cafe", category: "cafe", image: null },
  { slug: "pharmacy", label: "Pharmacy", category: "pharmacy", legacyRef: "eczane-pharmacy", image: null },
  { slug: "hardware", label: "Hardware store", category: "hardware", image: null },
  { slug: "clothing", label: "Clothing", category: "clothing", legacyRef: "lcw-clothing", image: null },
  { slug: "parking", label: "Parking", category: "parking", image: null },
  { slug: "toll", label: "Toll", category: "toll", image: null },
  { slug: "taxi", label: "Taxi", category: "taxi", image: null },
  { slug: "pos-slip", label: "POS Slip", category: "pos-slip", legacyRef: "toyzz-card-slip", image: null },
  { slug: "e-arsiv", label: "E-Arşiv", category: "e-arsiv", image: null },
]);
