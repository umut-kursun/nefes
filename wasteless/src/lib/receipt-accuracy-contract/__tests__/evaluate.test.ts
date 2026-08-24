import { describe, expect, it } from "vitest";
import {
  CORPUS_RECEIPT_IDS,
  evaluateContractReport,
  getGroundTruth,
  isPollutedProductName,
  runFrozenBaselineSnapshot,
} from "@/lib/receipt-accuracy-contract";

describe("receipt-accuracy-contract evaluators", () => {
  it("detects polluted product names", () => {
    expect(isPollutedProductName("TEL: 02264656314")).toBe(true);
    expect(isPollutedProductName("BODRUM/MUĞLA")).toBe(true);
    expect(isPollutedProductName("Banvit Piliç Bonfile")).toBe(false);
  });

  it("produces ContractReport for every frozen baseline receipt", () => {
    for (const id of CORPUS_RECEIPT_IDS) {
      const snap = runFrozenBaselineSnapshot(id);
      const report = evaluateContractReport(snap, getGroundTruth(id));
      expect(report.id).toBe(id);
      expect(report.analysisStatus).toBe(snap.analysisStatus);
      expect(["correct", "needs_review", "incorrect"]).toContain(report.merchant);
    }
  });

  it("Phase 0 baseline: totals are correct for all 9 receipts", () => {
    for (const id of CORPUS_RECEIPT_IDS) {
      const snap = runFrozenBaselineSnapshot(id);
      const report = evaluateContractReport(snap, getGroundTruth(id));
      expect(report.total).toBe("correct");
    }
  });

  it("Phase 0 baseline: records false approvals on D,E,F,G,H", () => {
    const falseIds = ["D", "E", "F", "G", "H"] as const;
    for (const id of falseIds) {
      const snap = runFrozenBaselineSnapshot(id);
      const report = evaluateContractReport(snap, getGroundTruth(id));
      expect(report.falseApproval).toBe(true);
    }
  });

  it("Phase 0 baseline: A,B,C,I are not false approvals", () => {
    const okIds = ["A", "B", "C", "I"] as const;
    for (const id of okIds) {
      const snap = runFrozenBaselineSnapshot(id);
      const report = evaluateContractReport(snap, getGroundTruth(id));
      expect(report.falseApproval).toBe(false);
    }
  });
});
