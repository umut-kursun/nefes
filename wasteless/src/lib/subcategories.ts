/**
 * Optional subcategory presets per seed category id.
 * Users may ignore subcategories entirely.
 */

export type SubcategoryPreset = {
  id: string;
  label: string;
};

export const SUBCATEGORIES: Record<string, SubcategoryPreset[]> = {
  // Araba children are UserCategories; tertiary detail only under Fuel
  akaryakit: [
    { id: "benzin", label: "Benzin" },
    { id: "motorin", label: "Motorin" },
    { id: "lpg", label: "LPG" },
  ],
  yeme_icme: [
    { id: "restaurant", label: "Restoran" },
    { id: "cafe", label: "Kafe" },
    { id: "celebration", label: "Kutlama" },
    { id: "social", label: "Sosyal" },
    { id: "fast_food", label: "Fast food" },
    { id: "bakery", label: "Fırın / pastane" },
    { id: "dessert", label: "Tatlı" },
  ],
  market: [
    { id: "grocery", label: "Market" },
    { id: "electronics", label: "Elektronik" },
    { id: "clothing", label: "Giyim" },
    { id: "home", label: "Ev" },
    { id: "personal_care", label: "Kişisel bakım" },
  ],
  saglik: [
    { id: "pharmacy", label: "Eczane" },
    { id: "clinic", label: "Muayene" },
    { id: "hospital", label: "Hastane" },
  ],
  faturalar: [
    { id: "electric", label: "Elektrik" },
    { id: "water", label: "Su" },
    { id: "gas", label: "Doğalgaz" },
    { id: "internet", label: "İnternet" },
    { id: "phone", label: "Telefon" },
  ],
  ev: [
    { id: "rent", label: "Kira" },
    { id: "furniture", label: "Mobilya" },
    { id: "cleaning", label: "Temizlik" },
    { id: "repair", label: "Tamirat" },
  ],
  giyim: [
    { id: "clothes", label: "Kıyafet" },
    { id: "shoes", label: "Ayakkabı" },
    { id: "accessories", label: "Aksesuar" },
  ],
};

export function subcategoriesFor(categoryId: string): SubcategoryPreset[] {
  return SUBCATEGORIES[categoryId] ?? [];
}
