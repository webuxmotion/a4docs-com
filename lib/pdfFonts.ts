import { jsPDF } from 'jspdf';

// Cache for font data
let cachedFonts: { regular: string; bold: string } | null = null;

export async function loadFonts(doc: jsPDF): Promise<void> {
  try {
    // Load and cache font data if not already cached
    if (!cachedFonts) {
      // Load Roboto Regular
      const regularResponse = await fetch('/fonts/Roboto-Regular.ttf');
      const regularBuffer = await regularResponse.arrayBuffer();
      const regularBase64 = arrayBufferToBase64(regularBuffer);

      // Load Roboto Bold
      const boldResponse = await fetch('/fonts/Roboto-Bold.ttf');
      const boldBuffer = await boldResponse.arrayBuffer();
      const boldBase64 = arrayBufferToBase64(boldBuffer);

      cachedFonts = { regular: regularBase64, bold: boldBase64 };
    }

    // Add fonts to this jsPDF instance
    doc.addFileToVFS('Roboto-Regular.ttf', cachedFonts.regular);
    doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');

    doc.addFileToVFS('Roboto-Bold.ttf', cachedFonts.bold);
    doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');
  } catch (error) {
    console.error('Error loading fonts:', error);
    throw error;
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
