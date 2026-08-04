import { describe, expect, it } from "vitest";
import { displayMerchantName } from "@/lib/merchants";

describe("displayMerchantName", () => {
  it("cleans legal entity suffixes for UI cards", () => {
    expect(
      displayMerchantName(
        "BST GROUP RESTORAN GIDA SAN. VE TİC. LTD. ŞTİ."
      )
    ).toMatch(/BST/i);
    expect(
      displayMerchantName(
        "BST GROUP RESTORAN GIDA SAN. VE TİC. LTD. ŞTİ."
      )
    ).not.toMatch(/LTD/i);
  });

  it("collapses File Market OCR variants", () => {
    expect(
      displayMerchantName(
        "FILE VARNALI / SİLİVRİ FİLE MARKET MAĞAZACILIK A.Ş."
      )
    ).toBe("File Market");
  });

  it("uses fallback when name is empty", () => {
    expect(displayMerchantName(null, "Market")).toBe("Market");
    expect(displayMerchantName("", "Market")).toBe("Market");
  });
});
