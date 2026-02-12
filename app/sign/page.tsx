'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { SignaturePlacement } from '@/lib/types';
import {
  loadPdfFromFile,
  renderPageToDataUrl,
  getPdfBytes,
  PDFDocumentProxy,
} from '@/lib/pdfUtils';
import {
  embedSignatures,
  getPdfPageDimensions,
} from '@/lib/signatureUtils';

// Signature template (library item)
interface SignatureTemplate {
  id: string;
  imageData: string;
  aspectRatio: number;
}

export default function SignPdfPage() {
  // PDF state
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageImage, setPageImage] = useState<string>('');
  const [pageDimensions, setPageDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const [isLoadingPage, setIsLoadingPage] = useState(false);

  // Signature library (templates)
  const [signatureLibrary, setSignatureLibrary] = useState<SignatureTemplate[]>([]);
  const [selectedLibraryId, setSelectedLibraryId] = useState<string | null>(null);

  // Placed signatures state
  const [signatures, setSignatures] = useState<SignaturePlacement[]>([]);
  const [selectedSignatureId, setSelectedSignatureId] = useState<string | null>(null);

  // Clipboard for copy/paste
  const [clipboard, setClipboard] = useState<SignaturePlacement | null>(null);

  // Drag and resize state
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState<string | null>(null);
  const [mouseDownPos, setMouseDownPos] = useState<{ x: number; y: number } | null>(null);
  const [pendingDragSignatureId, setPendingDragSignatureId] = useState<string | null>(null);

  // Export state
  const [isExporting, setIsExporting] = useState(false);

  // Refs
  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);

  // Render current page when PDF or page number changes
  const renderCurrentPage = useCallback(async () => {
    if (!pdfDoc) return;

    setIsLoadingPage(true);
    try {
      const result = await renderPageToDataUrl(pdfDoc, currentPage, 2);
      setPageImage(result.dataUrl);
      setPageDimensions({ width: result.width, height: result.height });
    } catch (error) {
      console.error('Error rendering page:', error);
    } finally {
      setIsLoadingPage(false);
    }
  }, [pdfDoc, currentPage]);

  useEffect(() => {
    renderCurrentPage();
  }, [renderCurrentPage]);

  // Handle PDF file upload
  const handlePdfUpload = async (file: File) => {
    if (!file.type.includes('pdf')) {
      alert('Please upload a PDF file');
      return;
    }

    setIsLoadingPdf(true);
    try {
      const doc = await loadPdfFromFile(file);
      const bytes = await getPdfBytes(file);

      setPdfDoc(doc);
      setPdfBytes(bytes);
      setFileName(file.name);
      setTotalPages(doc.numPages);
      setCurrentPage(1);
      setSignatures([]);
      setSelectedSignatureId(null);
      // Don't clear signature library - keep it for reuse
    } catch (error) {
      console.error('Error loading PDF:', error);
      alert('Error loading PDF. Please try again.');
    } finally {
      setIsLoadingPdf(false);
    }
  };

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handlePdfUpload(file);
    }
    e.target.value = '';
  };

  // Handle drag and drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      handlePdfUpload(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Page navigation
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Handle signature image upload - adds to library
  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;

        const img = new window.Image();
        img.onload = () => {
          const aspectRatio = img.width / img.height;

          const newTemplate: SignatureTemplate = {
            id: Date.now().toString(),
            imageData: base64,
            aspectRatio,
          };

          setSignatureLibrary([...signatureLibrary, newTemplate]);
          setSelectedLibraryId(newTemplate.id);
        };
        img.src = base64;
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  // Place signature from library onto current page
  const placeSignatureFromLibrary = (template: SignatureTemplate) => {
    if (!pdfDoc || !pageDimensions.width || !pageDimensions.height) return;

    const newSignature: SignaturePlacement = {
      id: Date.now().toString(),
      pageNumber: currentPage,
      imageData: template.imageData,
      x: 10,
      y: 10,
      width: 30,
      height: (30 / template.aspectRatio) * (pageDimensions.width / pageDimensions.height),
      aspectRatio: template.aspectRatio,
    };

    setSignatures([...signatures, newSignature]);
    setSelectedSignatureId(newSignature.id);
    setSelectedLibraryId(null);
  };

  // Delete signature template from library
  const deleteFromLibrary = (templateId: string) => {
    setSignatureLibrary(signatureLibrary.filter(t => t.id !== templateId));
    if (selectedLibraryId === templateId) {
      setSelectedLibraryId(null);
    }
  };

  // Update signature
  const updateSignature = (id: string, updates: Partial<SignaturePlacement>) => {
    setSignatures(signatures.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  // Delete signature
  const deleteSignature = (id: string) => {
    setSignatures(signatures.filter(s => s.id !== id));
    if (selectedSignatureId === id) {
      setSelectedSignatureId(null);
    }
  };

  // Copy signature to clipboard
  const copySignature = useCallback(() => {
    if (!selectedSignatureId) return;
    const signature = signatures.find(s => s.id === selectedSignatureId);
    if (signature) {
      setClipboard({ ...signature });
    }
  }, [selectedSignatureId, signatures]);

  // Paste signature from clipboard
  const pasteSignature = useCallback(() => {
    if (!clipboard || !pdfDoc) return;

    const newSignature: SignaturePlacement = {
      ...clipboard,
      id: Date.now().toString(),
      pageNumber: currentPage,
      x: clipboard.x + 5, // Offset slightly so it's visible
      y: clipboard.y + 5,
    };

    // Constrain to canvas
    newSignature.x = Math.min(newSignature.x, 100 - newSignature.width);
    newSignature.y = Math.min(newSignature.y, 100 - newSignature.height);

    setSignatures([...signatures, newSignature]);
    setSelectedSignatureId(newSignature.id);
  }, [clipboard, currentPage, pdfDoc, signatures]);

  // Mouse event handlers for drag and resize
  const handleMouseDown = (e: React.MouseEvent, signatureId: string) => {
    e.stopPropagation();
    if ((e.target as HTMLElement).closest('.resize-handle')) return;

    const signature = signatures.find(s => s.id === signatureId);
    if (!signature || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const signatureX = (signature.x / 100) * rect.width;
    const signatureY = (signature.y / 100) * rect.height;

    setDragOffset({
      x: e.clientX - rect.left - signatureX,
      y: e.clientY - rect.top - signatureY,
    });

    setSelectedSignatureId(signatureId);
    setMouseDownPos({ x: e.clientX, y: e.clientY });
    setPendingDragSignatureId(signatureId);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();

    if (pendingDragSignatureId && mouseDownPos && !isDragging) {
      const dx = Math.abs(e.clientX - mouseDownPos.x);
      const dy = Math.abs(e.clientY - mouseDownPos.y);
      if (dx > 3 || dy > 3) {
        setIsDragging(true);
      }
    }

    if (isDragging && selectedSignatureId) {
      const signature = signatures.find(s => s.id === selectedSignatureId);
      if (!signature) return;

      const newX = ((e.clientX - rect.left - dragOffset.x) / rect.width) * 100;
      const newY = ((e.clientY - rect.top - dragOffset.y) / rect.height) * 100;

      const constrainedX = Math.max(0, Math.min(100 - signature.width, newX));
      const constrainedY = Math.max(0, Math.min(100 - signature.height, newY));

      updateSignature(selectedSignatureId, { x: constrainedX, y: constrainedY });
    }

    if (isResizing && selectedSignatureId && resizeDirection) {
      const signature = signatures.find(s => s.id === selectedSignatureId);
      if (!signature) return;

      const mouseX = ((e.clientX - rect.left) / rect.width) * 100;
      const mouseY = ((e.clientY - rect.top) / rect.height) * 100;

      let newWidth = signature.width;
      let newHeight = signature.height;
      let newX = signature.x;
      let newY = signature.y;

      if (resizeDirection.includes('e')) {
        newWidth = Math.max(5, mouseX - signature.x);
      }
      if (resizeDirection.includes('w')) {
        const diff = signature.x - mouseX;
        newWidth = Math.max(5, signature.width + diff);
        newX = Math.min(signature.x + signature.width - 5, mouseX);
      }
      if (resizeDirection.includes('s')) {
        newHeight = Math.max(3, mouseY - signature.y);
      }
      if (resizeDirection.includes('n')) {
        const diff = signature.y - mouseY;
        newHeight = Math.max(3, signature.height + diff);
        newY = Math.min(signature.y + signature.height - 3, mouseY);
      }

      // Maintain aspect ratio
      if (signature.aspectRatio) {
        const canvasWidth = rect.width;
        const canvasHeight = rect.height;

        const widthChanged = resizeDirection.includes('e') || resizeDirection.includes('w');
        const heightChanged = resizeDirection.includes('n') || resizeDirection.includes('s');

        if (widthChanged && !heightChanged) {
          const widthPx = (newWidth / 100) * canvasWidth;
          const heightPx = widthPx / signature.aspectRatio;
          newHeight = (heightPx / canvasHeight) * 100;
        } else if (heightChanged && !widthChanged) {
          const heightPx = (newHeight / 100) * canvasHeight;
          const widthPx = heightPx * signature.aspectRatio;
          newWidth = (widthPx / canvasWidth) * 100;
        } else if (widthChanged && heightChanged) {
          const widthPx = (newWidth / 100) * canvasWidth;
          const heightPx = widthPx / signature.aspectRatio;
          newHeight = (heightPx / canvasHeight) * 100;
        }
      }

      newWidth = Math.min(newWidth, 100 - newX);
      newHeight = Math.min(newHeight, 100 - newY);

      updateSignature(selectedSignatureId, { x: newX, y: newY, width: newWidth, height: newHeight });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
    setResizeDirection(null);
    setMouseDownPos(null);
    setPendingDragSignatureId(null);
  };

  const handleResizeStart = (e: React.MouseEvent, direction: string) => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeDirection(direction);
  };

  // Export PDF with signatures
  const handleExport = async () => {
    if (!pdfBytes || signatures.length === 0) {
      alert('Please add at least one signature before exporting');
      return;
    }

    setIsExporting(true);
    try {
      // Get original page dimensions
      const dimensions = await getPdfPageDimensions(pdfBytes);

      // Embed signatures
      const signedPdfBytes = await embedSignatures(
        pdfBytes,
        signatures,
        dimensions.widths,
        dimensions.heights
      );

      // Create download
      const blob = new Blob([new Uint8Array(signedPdfBytes)], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName.replace('.pdf', '_signed.pdf');
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Error exporting PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') {
        return;
      }

      // Delete signature
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedSignatureId) {
        deleteSignature(selectedSignatureId);
      }

      // Copy (Ctrl+C or Cmd+C)
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && selectedSignatureId) {
        e.preventDefault();
        copySignature();
      }

      // Paste (Ctrl+V or Cmd+V)
      if ((e.ctrlKey || e.metaKey) && e.key === 'v' && clipboard) {
        e.preventDefault();
        pasteSignature();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedSignatureId, clipboard, copySignature, pasteSignature]);

  // Get signatures for current page
  const currentPageSignatures = signatures.filter(s => s.pageNumber === currentPage);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        onChange={handleFileInputChange}
        className="hidden"
      />
      <input
        ref={signatureInputRef}
        type="file"
        accept="image/*"
        onChange={handleSignatureUpload}
        className="hidden"
      />

      {/* Header */}
      <header className="bg-primary">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center">
                <span className="rounded-lg bg-white px-4 py-2 text-lg font-bold text-primary">
                  A4Docs
                </span>
              </Link>

              {fileName && (
                <span className="text-white/80 text-sm truncate max-w-xs">
                  {fileName}
                </span>
              )}

              {totalPages > 0 && (
                <span className="text-white/60 text-xs bg-white/10 px-2 py-1 rounded">
                  {signatures.length} signature{signatures.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              {pdfDoc && (
                <>
                  <button
                    onClick={() => {
                      setPdfDoc(null);
                      setPdfBytes(null);
                      setFileName('');
                      setTotalPages(0);
                      setCurrentPage(1);
                      setSignatures([]);
                      setPageImage('');
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white/20 text-white font-medium rounded-full hover:bg-white/30 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    New PDF
                  </button>

                  <button
                    onClick={handleExport}
                    disabled={isExporting || signatures.length === 0}
                    className="flex items-center gap-2 px-4 py-2.5 bg-accent text-primary font-medium rounded-full hover:bg-accent-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isExporting ? (
                      <>
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Exporting...
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                        </svg>
                        Download Signed PDF
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Toolbar - only show when PDF is loaded */}
      {pdfDoc && (
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => signatureInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Add Signature
                </button>

                {selectedSignatureId && (
                  <>
                    <div className="w-px h-6 bg-gray-300 mx-2" />
                    <button
                      onClick={copySignature}
                      className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                      title="Copy (Ctrl+C)"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" />
                      </svg>
                      Copy
                    </button>
                    <button
                      onClick={() => deleteSignature(selectedSignatureId)}
                      className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                      Delete
                    </button>
                  </>
                )}

                {clipboard && (
                  <>
                    <div className="w-px h-6 bg-gray-300 mx-2" />
                    <button
                      onClick={pasteSignature}
                      className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                      title="Paste (Ctrl+V)"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                      </svg>
                      Paste
                    </button>
                  </>
                )}
              </div>

              {/* Page navigation */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                  </svg>
                </button>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={totalPages}
                    value={currentPage}
                    onChange={(e) => goToPage(parseInt(e.target.value) || 1)}
                    className="w-12 text-center px-2 py-1 border border-gray-300 rounded-lg text-sm"
                  />
                  <span className="text-gray-500 text-sm">of {totalPages}</span>
                </div>

                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main content area */}
      <main className="flex-1 flex p-8 gap-6">
        {!pdfDoc ? (
          // Upload area - centered
          <div className="flex-1 flex items-center justify-center">
            <div
              className="w-full max-w-2xl aspect-[210/297] bg-white rounded-xl shadow-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-gray-50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              {isLoadingPdf ? (
                <div className="text-center">
                  <svg className="animate-spin h-12 w-12 mx-auto text-primary" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <p className="mt-4 text-gray-600">Loading PDF...</p>
                </div>
              ) : (
                <div className="text-center">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-16 h-16 mx-auto text-gray-400 mb-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  <p className="text-lg text-gray-600 mb-2">Drop your PDF here</p>
                  <p className="text-sm text-gray-400">or click to browse</p>
                  <p className="text-xs text-gray-400 mt-4">Supports PDF files</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Signature Library Panel */}
            <div className="w-64 bg-white rounded-xl shadow-lg p-4 flex flex-col h-fit max-h-[calc(100vh-200px)] sticky top-8">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                </svg>
                Signature Library
              </h3>

              {signatureLibrary.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-12 h-12 text-gray-300 mb-3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                  </svg>
                  <p className="text-sm text-gray-500 mb-2">No signatures yet</p>
                  <p className="text-xs text-gray-400">Click &quot;Add Signature&quot; to upload</p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto space-y-2">
                  {signatureLibrary.map((template) => (
                    <div
                      key={template.id}
                      className={`relative group p-2 border-2 rounded-lg cursor-pointer transition-colors ${
                        selectedLibraryId === template.id
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedLibraryId(template.id)}
                      onDoubleClick={() => placeSignatureFromLibrary(template)}
                    >
                      <img
                        src={template.imageData}
                        alt="Signature"
                        className="w-full h-16 object-contain"
                        draggable={false}
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteFromLibrary(template.id);
                        }}
                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Remove from library"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {selectedLibraryId && (
                <button
                  onClick={() => {
                    const template = signatureLibrary.find(t => t.id === selectedLibraryId);
                    if (template) placeSignatureFromLibrary(template);
                  }}
                  className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Place on Page
                </button>
              )}

              <p className="mt-3 text-xs text-gray-400 text-center">
                Double-click to place on page
              </p>
            </div>

            {/* PDF viewer with signature overlay */}
            <div className="flex-1 flex items-start justify-center">
              <div
                ref={canvasRef}
                className="bg-white shadow-2xl relative select-none"
                style={{
                  width: '100%',
                  maxWidth: '800px',
                  aspectRatio: pageDimensions.width && pageDimensions.height
                    ? `${pageDimensions.width} / ${pageDimensions.height}`
                    : '210 / 297',
                }}
                onClick={() => setSelectedSignatureId(null)}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                {/* PDF page image */}
                {isLoadingPage ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                    <svg className="animate-spin h-8 w-8 text-primary" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  </div>
                ) : pageImage ? (
                  <img
                    src={pageImage}
                    alt={`Page ${currentPage}`}
                    className="w-full h-full object-contain"
                    draggable={false}
                  />
                ) : null}

                {/* Signature overlay */}
                {currentPageSignatures.map((signature) => (
                  <div
                    key={signature.id}
                    className={`absolute cursor-move ${
                      selectedSignatureId === signature.id
                        ? 'ring-2 ring-primary ring-offset-2'
                        : 'hover:ring-2 hover:ring-gray-300'
                    }`}
                    style={{
                      left: `${signature.x}%`,
                      top: `${signature.y}%`,
                      width: `${signature.width}%`,
                      height: `${signature.height}%`,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedSignatureId(signature.id);
                    }}
                    onMouseDown={(e) => handleMouseDown(e, signature.id)}
                  >
                    <img
                      src={signature.imageData}
                      alt="Signature"
                      className="w-full h-full object-contain pointer-events-none"
                      draggable={false}
                    />

                    {/* Resize handles */}
                    {selectedSignatureId === signature.id && (
                      <>
                        <div className="resize-handle absolute -top-2 -left-2 w-4 h-4 bg-primary border-2 border-white shadow-md rounded-sm cursor-nw-resize z-10" onMouseDown={(e) => handleResizeStart(e, 'nw')} />
                        <div className="resize-handle absolute -top-2 -right-2 w-4 h-4 bg-primary border-2 border-white shadow-md rounded-sm cursor-ne-resize z-10" onMouseDown={(e) => handleResizeStart(e, 'ne')} />
                        <div className="resize-handle absolute -bottom-2 -left-2 w-4 h-4 bg-primary border-2 border-white shadow-md rounded-sm cursor-sw-resize z-10" onMouseDown={(e) => handleResizeStart(e, 'sw')} />
                        <div className="resize-handle absolute -bottom-2 -right-2 w-4 h-4 bg-primary border-2 border-white shadow-md rounded-sm cursor-se-resize z-10" onMouseDown={(e) => handleResizeStart(e, 'se')} />
                        <div className="resize-handle absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-primary border-2 border-white shadow-md rounded-sm cursor-n-resize z-10" onMouseDown={(e) => handleResizeStart(e, 'n')} />
                        <div className="resize-handle absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-primary border-2 border-white shadow-md rounded-sm cursor-s-resize z-10" onMouseDown={(e) => handleResizeStart(e, 's')} />
                        <div className="resize-handle absolute top-1/2 -left-2 -translate-y-1/2 w-4 h-4 bg-primary border-2 border-white shadow-md rounded-sm cursor-w-resize z-10" onMouseDown={(e) => handleResizeStart(e, 'w')} />
                        <div className="resize-handle absolute top-1/2 -right-2 -translate-y-1/2 w-4 h-4 bg-primary border-2 border-white shadow-md rounded-sm cursor-e-resize z-10" onMouseDown={(e) => handleResizeStart(e, 'e')} />
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <div className="bg-gray-100 py-4 text-center text-gray-500 text-sm">
        {pdfDoc ? (
          <>Select signature from library • Double-click or click &quot;Place on Page&quot; • Ctrl+C to copy • Ctrl+V to paste • Delete to remove</>
        ) : (
          <>Upload a PDF document to add signatures</>
        )}
      </div>
    </div>
  );
}
