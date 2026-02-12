// Dynamic import to avoid SSR issues
let pdfjsLib: typeof import('pdfjs-dist') | null = null;

async function getPdfjs() {
  if (!pdfjsLib) {
    pdfjsLib = await import('pdfjs-dist');
    // Use local worker file copied to public folder
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  }
  return pdfjsLib;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PDFDocumentProxy = any;

export interface PageDimensions {
  width: number;
  height: number;
}

/**
 * Load a PDF document from a File object
 */
export async function loadPdfFromFile(file: File): Promise<PDFDocumentProxy> {
  const pdfjs = await getPdfjs();
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
  return await loadingTask.promise;
}

/**
 * Load a PDF document from an ArrayBuffer
 */
export async function loadPdfFromArrayBuffer(arrayBuffer: ArrayBuffer): Promise<PDFDocumentProxy> {
  const pdfjs = await getPdfjs();
  const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
  return await loadingTask.promise;
}

/**
 * Get the dimensions of a specific page
 */
export async function getPageDimensions(
  pdfDoc: PDFDocumentProxy,
  pageNum: number
): Promise<PageDimensions> {
  const page = await pdfDoc.getPage(pageNum);
  const viewport = page.getViewport({ scale: 1 });
  return {
    width: viewport.width,
    height: viewport.height,
  };
}

/**
 * Render a PDF page to a canvas element
 */
export async function renderPageToCanvas(
  pdfDoc: PDFDocumentProxy,
  pageNum: number,
  canvas: HTMLCanvasElement,
  scale: number = 1.5
): Promise<PageDimensions> {
  const page = await pdfDoc.getPage(pageNum);
  const viewport = page.getViewport({ scale });

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Could not get canvas context');
  }

  canvas.height = viewport.height;
  canvas.width = viewport.width;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderContext: any = {
    canvasContext: context,
    viewport: viewport,
  };

  await page.render(renderContext).promise;

  return {
    width: viewport.width,
    height: viewport.height,
  };
}

/**
 * Convert a PDF page to a data URL (image)
 */
export async function renderPageToDataUrl(
  pdfDoc: PDFDocumentProxy,
  pageNum: number,
  scale: number = 1.5
): Promise<{ dataUrl: string; width: number; height: number }> {
  const page = await pdfDoc.getPage(pageNum);
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Could not get canvas context');
  }

  canvas.height = viewport.height;
  canvas.width = viewport.width;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderContext: any = {
    canvasContext: context,
    viewport: viewport,
  };

  await page.render(renderContext).promise;

  return {
    dataUrl: canvas.toDataURL('image/png'),
    width: viewport.width,
    height: viewport.height,
  };
}

/**
 * Get the original PDF bytes from a File
 */
export async function getPdfBytes(file: File): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}
