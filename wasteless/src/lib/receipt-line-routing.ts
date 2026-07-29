import {
  ChargeType,
  DiscountType,
  PaymentType,
  type ChargeLine,
  type DiscountLine,
  type PaymentLine,
  type UnknownLine,
} from "@/lib/receipt-model";
import { appendCharge } from "@/lib/receipt-charges";
import type {
  ClassificationLogEntry,
  ReceiptLineClassification,
} from "@/lib/receipt-line-classifier";
import type { AnalysisItem } from "@/lib/types";

export type ReceiptLineBuckets = {
  products: AnalysisItem[];
  charges: ChargeLine[];
  discounts: DiscountLine[];
  payments: PaymentLine[];
  unknownLines: UnknownLine[];
};

export function routeClassifiedLine<
  T extends { name: string; totalPrice: number | null },
>(
  classification: ReceiptLineClassification,
  log: ClassificationLogEntry[],
  state: ReceiptLineBuckets,
  productFactory?: (label: string, amount: number | null) => T
): void {
  const { kind, label, amount, reason, raw, chargeType, discountType, paymentType } =
    classification;
  const absAmount = amount != null ? Math.abs(amount) : null;

  switch (kind) {
    case "receipt_charge": {
      if (absAmount != null && absAmount > 0) {
        state.charges = appendCharge(
          state.charges,
          label,
          absAmount,
          chargeType ?? ChargeType.Other
        );
        log.push({
          raw,
          label,
          kind,
          reason,
          amount: absAmount,
          chargeType,
          action: "moved_charge",
        });
      } else {
        state.unknownLines.push({
          label,
          amount,
          reason: `${reason}; charge amount missing`,
          raw,
        });
        log.push({
          raw,
          label,
          kind,
          reason: `${reason}; persisted as unknownLines`,
          amount,
          chargeType,
          action: "moved_unknown",
        });
      }
      return;
    }
    case "discount":
    case "loyalty": {
      if (absAmount != null && absAmount > 0) {
        state.discounts.push({
          type: discountType ?? DiscountType.Other,
          label,
          amount: absAmount,
        });
        log.push({
          raw,
          label,
          kind,
          reason,
          amount: absAmount,
          discountType,
          action: "moved_discount",
        });
      } else {
        state.unknownLines.push({ label, amount, reason, raw });
        log.push({
          raw,
          label,
          kind,
          reason: `${reason}; persisted as unknownLines`,
          amount,
          discountType,
          action: "moved_unknown",
        });
      }
      return;
    }
    case "payment": {
      state.payments.push({
        type: paymentType ?? PaymentType.Other,
        label,
        amount: absAmount,
      });
      log.push({
        raw,
        label,
        kind,
        reason,
        amount: absAmount,
        paymentType,
        action: "moved_payment",
      });
      return;
    }
    case "unknown": {
      state.unknownLines.push({ label, amount, reason, raw });
      log.push({
        raw,
        label,
        kind,
        reason,
        amount,
        action: absAmount != null && absAmount > 0 ? "moved_unknown" : "skipped_noise",
      });
      return;
    }
    case "product": {
      if (productFactory) {
        state.products.push(productFactory(label, amount) as unknown as AnalysisItem);
      } else {
        state.products.push({
          name: label,
          quantity: null,
          unit: null,
          unitPrice: null,
          totalPrice: amount,
        });
      }
      log.push({
        raw,
        label,
        kind,
        reason,
        amount,
        action: "kept_product",
      });
    }
  }
}

export function emptyReceiptLineBuckets(): ReceiptLineBuckets {
  return {
    products: [],
    charges: [],
    discounts: [],
    payments: [],
    unknownLines: [],
  };
}

export function mergeReceiptLineBuckets(
  base: ReceiptLineBuckets,
  incoming: Partial<ReceiptLineBuckets>
): ReceiptLineBuckets {
  let charges = [...base.charges];
  for (const c of incoming.charges ?? []) {
    charges = appendCharge(charges, c.label, c.amount, c.type);
  }
  const discountKeys = new Set(
    base.discounts.map((d) => `${d.type}:${d.label.toLocaleLowerCase("tr-TR")}`)
  );
  const discounts = [
    ...base.discounts,
    ...(incoming.discounts ?? []).filter(
      (d) => !discountKeys.has(`${d.type}:${d.label.toLocaleLowerCase("tr-TR")}`)
    ),
  ];
  const paymentKeys = new Set(
    base.payments.map((p) => `${p.type}:${p.label.toLocaleLowerCase("tr-TR")}`)
  );
  const payments = [
    ...base.payments,
    ...(incoming.payments ?? []).filter(
      (p) => !paymentKeys.has(`${p.type}:${p.label.toLocaleLowerCase("tr-TR")}`)
    ),
  ];
  const unknownLines = [
    ...base.unknownLines,
    ...(incoming.unknownLines ?? []),
  ];
  return {
    products: incoming.products ?? base.products,
    charges,
    discounts,
    payments,
    unknownLines,
  };
}
