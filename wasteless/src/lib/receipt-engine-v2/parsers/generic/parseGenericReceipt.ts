import { parseFooter } from "../../footer/parseFooter";
import { buildProductBlocks } from "../../parser/buildProductBlocks";
import { parseProductBlocks } from "../../parser/parseProductBlocks";
import type { ParseContext, ParseResult } from "../../core/types";

/** Default rule-pack parser — wraps the original V2 block builder + product parser. */
export function parseGenericReceipt(ctx: ParseContext): ParseResult {
  const { blocks } = buildProductBlocks(ctx.tokens);
  const { products } = parseProductBlocks(blocks);

  return {
    products,
    charges: [],
    blocks,
    footer: null,
    merchantOverride: null,
  };
}

/** Resolve footer: parser override or shared footer parser. */
export function resolveFooter(
  ctx: ParseContext,
  parseResult: ParseResult
): ReturnType<typeof parseFooter> {
  return parseResult.footer ?? parseFooter(ctx.tokens);
}
