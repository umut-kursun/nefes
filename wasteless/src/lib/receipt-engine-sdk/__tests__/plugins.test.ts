import { describe, expect, it, beforeEach } from "vitest";
import { PluginRegistry } from "../plugins/registry";
import type { CurrencyPlugin } from "../plugins/types";

describe("PluginRegistry", () => {
  beforeEach(() => {
    PluginRegistry.clear("currency");
  });

  it("registers and retrieves plugins by kind", () => {
    const plugin: CurrencyPlugin = {
      id: "try",
      name: "Turkish Lira",
      currencyCode: "TRY",
      symbol: "₺",
    };

    PluginRegistry.register("currency", plugin);
    expect(PluginRegistry.get("currency", "try")).toEqual(plugin);
    expect(PluginRegistry.getAll("currency")).toHaveLength(1);
  });

  it("clears plugins by kind", () => {
    PluginRegistry.register("currency", {
      id: "usd",
      name: "US Dollar",
      currencyCode: "USD",
      symbol: "$",
    });
    PluginRegistry.clear("currency");
    expect(PluginRegistry.getAll("currency")).toHaveLength(0);
  });
});
