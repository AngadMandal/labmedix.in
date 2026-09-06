import JsBarcode from 'jsbarcode';

export function generateBarcodeDataUrl(
  text: string,
  options?: {
    width?: number;
    height?: number;
    fontSize?: number;
    displayValue?: boolean;
    margin?: number;
  }
): string {
  if (!text) return '';
  try {
    const canvas = document.createElement('canvas');
    JsBarcode(canvas, text, {
      format: 'CODE128',
      width: options?.width ?? 2,
      height: options?.height ?? 45,
      displayValue: options?.displayValue ?? true,
      fontSize: options?.fontSize ?? 11,
      fontOptions: 'bold',
      margin: options?.margin ?? 4,
      background: '#ffffff',
      lineColor: '#000000'
    });
    return canvas.toDataURL('image/png');
  } catch (err) {
    console.warn('JsBarcode generation error:', err);
    return '';
  }
}

export function generateCode128PngDataUrl(text: string): string {
  return generateBarcodeDataUrl(text);
}

export interface BarcodeBlock {
  start: number;
  width: number;
}

export interface EncodedCode128 {
  width: number;
  barBlocks: BarcodeBlock[];
  text: string;
}

export function encodeCode128(text: string): EncodedCode128 {
  const cleanText = text || '123456';
  const barBlocks: BarcodeBlock[] = [];
  let cursor = 0;
  for (let i = 0; i < cleanText.length; i++) {
    const charCode = (cleanText.charCodeAt(i) % 4) + 1;
    barBlocks.push({ start: cursor, width: charCode });
    cursor += charCode + 2;
  }
  return {
    width: Math.max(120, cursor + 15),
    barBlocks,
    text: cleanText
  };
}
