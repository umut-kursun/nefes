import type { LayoutBlock } from "./layout-block";

export type SemanticBlockType =
  | "MerchantBlock"
  | "AddressBlock"
  | "MetadataBlock"
  | "ProductBlock"
  | "PaymentBlock"
  | "VATBlock"
  | "FooterBlock"
  | "CampaignBlock"
  | "POSBlock"
  | "TotalBlock"
  | "ChargeBlock"
  | "DiscountBlock"
  | "UnknownBlock";

export type SemanticBlock = {
  readonly id: string;
  readonly type: SemanticBlockType;
  readonly source: LayoutBlock;
  readonly text: string;
  readonly lineIndices: readonly number[];
};

export type SemanticDocument = {
  readonly blocks: readonly SemanticBlock[];
};
