import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parsedReceiptToPurchaseDraft } from "../adapters/parsedReceiptToPurchaseDraft";
import {
  finalizeParsedReceipt,
  parseParsedReceiptJson,
  type ParsedReceipt,
} from "../types/ParsedReceipt";

const fileMarketFixture = finalizeParsedReceipt(
  parseParsedReceiptJson(
    JSON.parse(
      readFileSync(
        join(process.cwd(), "fixtures/vision/file-market-e-arsiv.json"),
        "utf8"
      )
    )
  )
);

const sample: ParsedReceipt = {
  merchant: {
    title: "BST GROUP RESTORAN GIDA SAN. VE TİC. LTD. ŞTİ.",
    vknTckn: "1871729510",
    taxOffice: "BÜYÜKÇEKMECE VD.",
    address: "B BLOK NO: 10/C İÇ KAPI NO: 23, BÜYÜKÇEKMECE / İSTANBUL",
    category: "RESTAURANT",
  },
  metadata: {
    purchaseDate: "2026-07-30",
    purchaseTime: "20:03:36",
    receiptNumber: "0084",
    currency: "TRY",
  },
  products: [
    {
      name: "YİYECEK",
      quantity: 1,
      unitPrice: 1219,
      lineTotal: 1219,
      vatRatePercentage: 10,
    },
  ],
  payments: [
    {
      type: "CREDIT_CARD",
      bankName: "ZİRAATBANK",
      cardLastFour: "4421",
      approvalCode: "664347",
      amount: 1219,
    },
  ],
  financials: {
    vatTotal: 110.82,
    totalAmount: 1219,
  },
  confidence: 0.9,
};

describe("parsedReceiptToPurchaseDraft", () => {
  it("maps ÖKC vision output to PurchaseDraft", async () => {
    const draft = await parsedReceiptToPurchaseDraft(sample);
    expect(draft.merchant).toMatch(/BST Restoran/i);
    expect(draft.merchant).not.toMatch(/GIDA|LTD/i);
    expect(draft.currency?.normalized).toBe("TRY");
    expect(draft.products).toHaveLength(1);
    expect(draft.products[0]?.name).toBe("YİYECEK");
    expect(draft.products[0]?.lineTotal).toBe(1219);
    expect(draft.products[0]?.vatRate).toBe(10);
    expect(draft.payments.length).toBeGreaterThan(0);
    expect(draft.payments[0]?.label).toMatch(/ZİRAAT|4421/i);
    expect(draft.total?.amount).toBe(1219);
  });

  it("maps FİLE MARKET e-Arşiv fixture to PurchaseDraft", async () => {
    const draft = await parsedReceiptToPurchaseDraft(fileMarketFixture);
    expect(draft.merchant).toMatch(/File Market/i);
    expect(fileMarketFixture.merchant.category).toBe("MARKET");
    expect(draft.products).toHaveLength(10);
    expect(draft.total?.amount).toBe(817.02);

    const karpuz = draft.products.find((p) => /KARPUZ/i.test(p.name));
    expect(karpuz).toBeDefined();
    expect(karpuz?.quantity).toBe(5.59);
    expect(karpuz?.unit).toBe("kg");
    expect(karpuz?.unitPrice).toBe(19.5);
    expect(karpuz?.lineTotal).toBe(109.01);

    const cola = draft.products.find((p) => /COLA/i.test(p.name));
    expect(cola?.quantity).toBe(1);
    expect(cola?.unitPrice).toBe(55);
    expect(cola?.lineTotal).toBe(55);

    const dusJeli = draft.products.find((p) => /DUŞ JELİ|DUS JELI/i.test(p.name));
    expect(dusJeli?.quantity).toBe(1);
    expect(dusJeli?.unitPrice).toBe(144);
    expect(dusJeli?.lineTotal).toBe(144);

    const baget = draft.products.find((p) => /BAGET/i.test(p.name));
    expect(baget?.quantity).toBe(2);
    expect(baget?.unitPrice).toBe(37.5);
    expect(baget?.lineTotal).toBe(75);

    const nektarin = draft.products.find((p) => /NEKTAR/i.test(p.name));
    expect(nektarin).toBeDefined();
    expect(nektarin?.quantity).toBe(0.744);
    expect(nektarin?.unit).toBe("kg");
    expect(nektarin?.unitPrice).toBe(89.9);
    expect(nektarin?.lineTotal).toBe(66.89);

    const muz = draft.products.find((p) => /MUZ/i.test(p.name));
    expect(muz?.lineTotal).toBe(79.72);

    const sum = draft.products.reduce((s, p) => s + p.lineTotal, 0);
    expect(Math.round(sum * 100) / 100).toBe(817.02);

    expect(draft.payments[0]?.amount).toBe(817.02);
    expect(draft.payments[0]?.label).toMatch(/İş Bankası/i);
  });
});
