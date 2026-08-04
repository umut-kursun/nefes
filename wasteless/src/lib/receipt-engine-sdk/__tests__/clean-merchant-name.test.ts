import { describe, expect, it } from "vitest";
import { cleanMerchantName } from "../normalize/cleanMerchantName";

describe("cleanMerchantName", () => {
  it("collapses BST restaurant legal name", () => {
    expect(
      cleanMerchantName(
        "BST GROUP RESTORAN GIDA SAN. VE TİC. LTD. ŞTİ."
      )
    ).toBe("BST Restoran");
  });

  it("extracts File Market from location-prefixed OCR", () => {
    expect(
      cleanMerchantName("FILE VARNALI / SİLİVRİ FİLE MARKET MAĞAZACILIK A.Ş.")
    ).toBe("File Market");
  });

  it("preserves profiterol shop branding without legal suffix", () => {
    expect(
      cleanMerchantName("PROFİTEROL EVİ GIDA SAN. VE TİC. LTD. ŞTİ.")
    ).toBe("Profiterol Evi");
  });

  it("does not strip VKN when passed as title alone", () => {
    expect(cleanMerchantName("1871729510")).toBe("1871729510");
  });
});
