/** Read width/height from JPEG or PNG bytes without external image libraries. */
export function readImageDimensions(
  bytes: Uint8Array
): { width: number; height: number } | null {
  if (bytes.length >= 24 && bytes[0] === 0x89 && bytes[1] === 0x50) {
    const width =
      (bytes[16] << 24) | (bytes[17] << 16) | (bytes[18] << 8) | bytes[19];
    const height =
      (bytes[20] << 24) | (bytes[21] << 16) | (bytes[22] << 8) | bytes[23];
    if (width > 0 && height > 0) return { width, height };
  }

  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < bytes.length) {
      if (bytes[offset] !== 0xff) break;
      const marker = bytes[offset + 1];
      if (marker === 0xc0 || marker === 0xc2) {
        const height = (bytes[offset + 5] << 8) | bytes[offset + 6];
        const width = (bytes[offset + 7] << 8) | bytes[offset + 8];
        if (width > 0 && height > 0) return { width, height };
        return null;
      }
      const segmentLength = (bytes[offset + 2] << 8) | bytes[offset + 3];
      if (segmentLength < 2) break;
      offset += 2 + segmentLength;
    }
  }

  return null;
}
