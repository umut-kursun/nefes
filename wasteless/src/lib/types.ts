export type ExpenseCategory = string;

export type CategorySpecialType = "fuel" | "cigarette" | null;

export type SourceType =
  | "receipt"
  | "bank_screenshot"
  | "quick_button"
  | "manual";

export interface UserCategory {
  id: string;
  label: string;
  description: string;
  icon: string;
  color: string;
  softColor: string;
  /**
   * @deprecated Prefer parentId + category id helpers.
   * Kept for fuel/cigarette UX backward compatibility.
   */
  specialType: CategorySpecialType;
  /** Optional parent category id for grouping (e.g. akaryakit → araba). */
  parentId: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ReceiptItem {
  id: string;
  expenseId: string;
  name: string;
  /** Canonical product name for memory / search. */
  normalizedName: string | null;
  quantity: number | null;
  unit: string | null;
  unitPrice: number | null;
  totalPrice: number | null;
  categoryGuess: ExpenseCategory | null;
  /** Verbatim OCR line — never overwritten by corrections. */
  rawText: string | null;
  /** Per-item confidence 0..1 from reconstruction pipeline. */
  confidence: number | null;
}

export interface FuelDetails {
  fuelType: string | null;
  liters: number | null;
  pricePerLiter: number | null;
  stationName: string | null;
  odometer: number | null;
  /** Vehicle license plate (plaka) read from the receipt, when available. */
  plate: string | null;
}

export interface UserTag {
  id: string;
  label: string;
  color: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Expense {
  id: string;
  sourceType: SourceType;
  date: string;
  /** Purchase time HH:mm when known (from OCR or user). */
  time: string | null;
  merchantName: string | null;
  merchantRaw: string | null;
  category: ExpenseCategory;
  subcategory: string | null;
  /** Optional memory tags (independent from category). */
  tagIds: string[];
  totalAmount: number;
  currency: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  rawText: string | null;
  confidence: number | null;
  imageDataUrl: string | null;
  aiResponseJson: string | null;
  fuel: FuelDetails | null;
  packCount: number | null;
  quickButtonId: string | null;
  items: ReceiptItem[];
  /** Poşet, kargo, hizmet, etc. — not products. */
  charges: ChargeLine[];
  /** Indirim, kupon, kampanya — not products. */
  discounts: DiscountLine[];
  /** Nakit, kart, ödeme footer lines. */
  payments: PaymentLine[];
  /** Unclassified non-product lines preserved for review. */
  unknownLines: UnknownLine[];
}

export interface QuickButton {
  id: string;
  title: string;
  category: ExpenseCategory;
  defaultAmount: number;
  unit: string | null;
  notes: string | null;
  icon: string;
  color: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface AnalysisItem {
  name: string;
  quantity: number | null;
  unit: string | null;
  unitPrice: number | null;
  totalPrice: number | null;
  /** OCR name before product intelligence (stage 5). */
  ocrName?: string | null;
  /** Per-item confidence 0..1 (stage 7). */
  confidence?: number | null;
}

import type {
  ChargeLine,
  DiscountLine,
  PaymentLine,
  UnknownLine,
} from "@/lib/receipt-model";

export type {
  ChargeType,
  DiscountType,
  PaymentType,
  ChargeLine,
  DiscountLine,
  PaymentLine,
  UnknownLine,
  ReceiptChargeLine,
  ReceiptChargeType,
} from "@/lib/receipt-model";

export {
  parseChargeType,
  parseDiscountType,
  parsePaymentType,
  normalizeChargeLine,
  normalizeDiscountLine,
  normalizePaymentLine,
  normalizeUnknownLine,
  readChargesField,
  readDiscountsField,
  readPaymentsField,
  readUnknownLinesField,
} from "@/lib/receipt-model";

export interface AnalysisResult {
  sourceType: "receipt" | "bank_screenshot";
  merchantName: string | null;
  date: string | null;
  /** HH:mm when printed on the receipt. */
  time: string | null;
  category: ExpenseCategory;
  subCategory: string | null;
  currency: string;
  totalAmount: number | null;
  confidence: number;
  items: AnalysisItem[];
  /** Poşet, kargo, hizmet, etc. — not products. */
  charges: ChargeLine[];
  discounts: DiscountLine[];
  payments: PaymentLine[];
  unknownLines: UnknownLine[];
  fuel: FuelDetails | null;
  packCount: number | null;
  rawText: string | null;
  notes: string | null;
}

export interface AppSettings {
  theme: "light" | "dark" | "system";
  /** Optional first name for personalized greetings. */
  displayName?: string | null;
  /** First-run onboarding completed on this device. */
  onboardingCompleted?: boolean;
  onboardingCompletedAt?: string;
}

/** User-taught OCR correction — never overwrites original OCR on expenses. */
export type OcrCorrectionField =
  | "merchant"
  | "itemName"
  | "total"
  | "category"
  | "date"
  | "other";

export interface OcrCorrection {
  id: string;
  /** Normalized merchant key for lookup. */
  merchantKey: string;
  field: OcrCorrectionField;
  /** Original OCR value (immutable history). */
  originalValue: string;
  /** User-corrected value. */
  correctedValue: string;
  source: "user";
  createdAt: string;
}
