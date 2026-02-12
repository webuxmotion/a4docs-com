import { PDFDocument } from 'pdf-lib';
import { SignaturePlacement } from './types';

/**
 * Convert base64 data URL to Uint8Array
 */
function base64ToUint8Array(base64: string): Uint8Array {
  // Remove data URL prefix if present
  const base64Data = base64.replace(/^data:image\/\w+;base64,/, '');
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Check if a base64 image is PNG
 */
function isPng(base64: string): boolean {
  return base64.includes('image/png') || base64.startsWith('iVBOR');
}

/**
 * Convert percentage coordinates to PDF points
 * PDF origin is bottom-left, screen origin is top-left
 */
function percentToPdfCoords(
  percentX: number,
  percentY: number,
  percentWidth: number,
  percentHeight: number,
  pdfWidth: number,
  pdfHeight: number
): { x: number; y: number; width: number; height: number } {
  const x = (percentX / 100) * pdfWidth;
  const width = (percentWidth / 100) * pdfWidth;
  const height = (percentHeight / 100) * pdfHeight;
  // Flip Y coordinate (PDF origin is bottom-left)
  const y = pdfHeight - ((percentY / 100) * pdfHeight) - height;

  return { x, y, width, height };
}

/**
 * Embed signatures into a PDF document
 */
export async function embedSignatures(
  pdfBytes: Uint8Array,
  signatures: SignaturePlacement[],
  pageWidths: number[],  // Array of page widths in PDF points
  pageHeights: number[]  // Array of page heights in PDF points
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes);

  for (const signature of signatures) {
    const pageIndex = signature.pageNumber - 1; // Convert to 0-indexed
    if (pageIndex < 0 || pageIndex >= pdfDoc.getPageCount()) {
      console.warn(`Invalid page number ${signature.pageNumber} for signature`);
      continue;
    }

    const page = pdfDoc.getPage(pageIndex);
    const pageWidth = pageWidths[pageIndex] || page.getWidth();
    const pageHeight = pageHeights[pageIndex] || page.getHeight();

    // Convert signature image to bytes
    const imageBytes = base64ToUint8Array(signature.imageData);

    // Embed the image (detect PNG vs JPG)
    let image;
    try {
      if (isPng(signature.imageData)) {
        image = await pdfDoc.embedPng(imageBytes);
      } else {
        image = await pdfDoc.embedJpg(imageBytes);
      }
    } catch (error) {
      console.error('Error embedding image:', error);
      // Try the other format if one fails
      try {
        image = isPng(signature.imageData)
          ? await pdfDoc.embedJpg(imageBytes)
          : await pdfDoc.embedPng(imageBytes);
      } catch (retryError) {
        console.error('Failed to embed image with both formats:', retryError);
        continue;
      }
    }

    // Convert percentage coordinates to PDF points
    const coords = percentToPdfCoords(
      signature.x,
      signature.y,
      signature.width,
      signature.height,
      pageWidth,
      pageHeight
    );

    // Draw the image on the page
    page.drawImage(image, {
      x: coords.x,
      y: coords.y,
      width: coords.width,
      height: coords.height,
    });
  }

  // Save and return the modified PDF
  return await pdfDoc.save();
}

/**
 * Get the dimensions of all pages in a PDF
 */
export async function getPdfPageDimensions(
  pdfBytes: Uint8Array
): Promise<{ widths: number[]; heights: number[] }> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pageCount = pdfDoc.getPageCount();
  const widths: number[] = [];
  const heights: number[] = [];

  for (let i = 0; i < pageCount; i++) {
    const page = pdfDoc.getPage(i);
    widths.push(page.getWidth());
    heights.push(page.getHeight());
  }

  return { widths, heights };
}
