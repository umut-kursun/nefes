export function rawLineId(lineIndex: number): string {
  return `raw:L${lineIndex}`;
}

export function nameFragmentId(lineIndex: number): string {
  return `frag:L${lineIndex}:name`;
}

export function amountId(lineIndex: number): string {
  return `amt:L${lineIndex}`;
}

export function vatTokenId(lineIndex: number): string {
  return `vat:L${lineIndex}`;
}

export function quantityTokenId(lineIndex: number): string {
  return `qty:L${lineIndex}`;
}

export function unitPriceTokenId(lineIndex: number): string {
  return `uprice:L${lineIndex}`;
}

export function noiseId(lineIndex: number): string {
  return `noise:L${lineIndex}`;
}

export function edgeId(kind: string, from: string, to: string): string {
  return `edge:${kind}:${from}->${to}`;
}
