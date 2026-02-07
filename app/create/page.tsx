'use client';

import { useState, useRef, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import Link from 'next/link';

type BlockType = 'text' | 'image';

interface Block {
  id: string;
  type: BlockType;
  content: string;
  x: number; // percentage from left
  y: number; // percentage from top
  width: number; // percentage width
  height: number; // percentage height
  aspectRatio?: number; // original image width/height ratio
}

interface Document {
  id: string;
  title: string;
  blocks: Block[];
  createdAt: number;
  updatedAt: number;
}

const A4_RATIO = 297 / 210; // height / width
const STORAGE_KEY = 'a4docs_documents';

// Helper functions for localStorage
const getDocuments = (): Document[] => {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
};

const saveDocuments = (docs: Document[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
};

export default function CreateDocPage() {
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [documentTitle, setDocumentTitle] = useState('Untitled Document');
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [savedDocuments, setSavedDocuments] = useState<Document[]>([]);
  const [showDocumentsList, setShowDocumentsList] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState<string | null>(null);
  const [mouseDownPos, setMouseDownPos] = useState<{ x: number; y: number } | null>(null);
  const [pendingDragBlockId, setPendingDragBlockId] = useState<string | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);

  // Load documents from localStorage on mount
  useEffect(() => {
    setSavedDocuments(getDocuments());
  }, []);

  // Save document function
  const saveDocument = () => {
    setIsSaving(true);
    const now = Date.now();
    const docs = getDocuments();

    if (documentId) {
      // Update existing document
      const index = docs.findIndex(d => d.id === documentId);
      if (index !== -1) {
        docs[index] = {
          ...docs[index],
          title: documentTitle,
          blocks,
          updatedAt: now,
        };
      }
    } else {
      // Create new document
      const newId = now.toString();
      const newDoc: Document = {
        id: newId,
        title: documentTitle,
        blocks,
        createdAt: now,
        updatedAt: now,
      };
      docs.unshift(newDoc);
      setDocumentId(newId);
    }

    saveDocuments(docs);
    setSavedDocuments(docs);
    setLastSaved(new Date());
    setIsSaving(false);
  };

  // Load document function
  const loadDocument = (doc: Document) => {
    setDocumentId(doc.id);
    setDocumentTitle(doc.title);
    setBlocks(doc.blocks);
    setShowDocumentsList(false);
    setSelectedBlockId(null);
  };

  // Create new document
  const createNewDocument = () => {
    setDocumentId(null);
    setDocumentTitle('Untitled Document');
    setBlocks([]);
    setShowDocumentsList(false);
    setSelectedBlockId(null);
    setLastSaved(null);
  };

  // Delete document
  const deleteDocument = (docId: string) => {
    const docs = getDocuments().filter(d => d.id !== docId);
    saveDocuments(docs);
    setSavedDocuments(docs);
    if (documentId === docId) {
      createNewDocument();
    }
  };

  const addBlock = (type: BlockType) => {
    const newBlock: Block = {
      id: Date.now().toString(),
      type,
      content: type === 'text' ? 'Double-click to edit' : '',
      x: 10,
      y: blocks.length * 15 + 5,
      width: type === 'text' ? 80 : 40,
      height: type === 'text' ? 10 : 20,
    };

    setBlocks([...blocks, newBlock]);
    setSelectedBlockId(newBlock.id);

    if (type === 'image') {
      setActiveBlockId(newBlock.id);
      setTimeout(() => fileInputRef.current?.click(), 100);
    }
  };

  const updateBlock = (id: string, updates: Partial<Block>) => {
    setBlocks(blocks.map(b => b.id === id ? { ...b, ...updates } : b));
  };

  const deleteBlock = (id: string) => {
    setBlocks(blocks.filter(b => b.id !== id));
    if (selectedBlockId === id) {
      setSelectedBlockId(null);
    }
  };

  const handleMouseDown = (e: React.MouseEvent, blockId: string) => {
    e.stopPropagation();
    if ((e.target as HTMLElement).closest('.resize-handle')) return;

    const block = blocks.find(b => b.id === blockId);
    if (!block || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const blockX = (block.x / 100) * rect.width;
    const blockY = (block.y / 100) * rect.height;

    setDragOffset({
      x: e.clientX - rect.left - blockX,
      y: e.clientY - rect.top - blockY,
    });

    // Select immediately on click
    setSelectedBlockId(blockId);

    // Store mouse position to detect drag start
    setMouseDownPos({ x: e.clientX, y: e.clientY });
    setPendingDragBlockId(blockId);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();

    // Start drag only after moving a threshold distance
    if (pendingDragBlockId && mouseDownPos && !isDragging) {
      const dx = Math.abs(e.clientX - mouseDownPos.x);
      const dy = Math.abs(e.clientY - mouseDownPos.y);
      if (dx > 3 || dy > 3) {
        setIsDragging(true);
      }
    }

    if (isDragging && selectedBlockId) {
      const block = blocks.find(b => b.id === selectedBlockId);
      if (!block) return;

      const newX = ((e.clientX - rect.left - dragOffset.x) / rect.width) * 100;
      const newY = ((e.clientY - rect.top - dragOffset.y) / rect.height) * 100;

      // Constrain to canvas bounds
      const constrainedX = Math.max(0, Math.min(100 - block.width, newX));
      const constrainedY = Math.max(0, Math.min(100 - block.height, newY));

      updateBlock(selectedBlockId, { x: constrainedX, y: constrainedY });
    }

    if (isResizing && selectedBlockId && resizeDirection) {
      const block = blocks.find(b => b.id === selectedBlockId);
      if (!block) return;

      const mouseX = ((e.clientX - rect.left) / rect.width) * 100;
      const mouseY = ((e.clientY - rect.top) / rect.height) * 100;

      let newWidth = block.width;
      let newHeight = block.height;
      let newX = block.x;
      let newY = block.y;

      // For images, maintain aspect ratio
      const isImage = block.type === 'image' && block.aspectRatio;

      if (resizeDirection.includes('e')) {
        newWidth = Math.max(5, mouseX - block.x);
      }
      if (resizeDirection.includes('w')) {
        const diff = block.x - mouseX;
        newWidth = Math.max(5, block.width + diff);
        newX = Math.min(block.x + block.width - 5, mouseX);
      }
      if (resizeDirection.includes('s')) {
        newHeight = Math.max(3, mouseY - block.y);
      }
      if (resizeDirection.includes('n')) {
        const diff = block.y - mouseY;
        newHeight = Math.max(3, block.height + diff);
        newY = Math.min(block.y + block.height - 3, mouseY);
      }

      // Maintain aspect ratio for images
      if (isImage && block.aspectRatio) {
        const canvasWidth = rect.width;
        const canvasHeight = rect.height;

        // Determine which dimension changed more
        const widthChanged = resizeDirection.includes('e') || resizeDirection.includes('w');
        const heightChanged = resizeDirection.includes('n') || resizeDirection.includes('s');

        if (widthChanged && !heightChanged) {
          // Width changed, adjust height to maintain ratio
          const widthPx = (newWidth / 100) * canvasWidth;
          const heightPx = widthPx / block.aspectRatio;
          newHeight = (heightPx / canvasHeight) * 100;
        } else if (heightChanged && !widthChanged) {
          // Height changed, adjust width to maintain ratio
          const heightPx = (newHeight / 100) * canvasHeight;
          const widthPx = heightPx * block.aspectRatio;
          newWidth = (widthPx / canvasWidth) * 100;
        } else if (widthChanged && heightChanged) {
          // Both changed (corner resize), use width as primary
          const widthPx = (newWidth / 100) * canvasWidth;
          const heightPx = widthPx / block.aspectRatio;
          newHeight = (heightPx / canvasHeight) * 100;
        }
      }

      // Constrain to canvas
      newWidth = Math.min(newWidth, 100 - newX);
      newHeight = Math.min(newHeight, 100 - newY);

      updateBlock(selectedBlockId, { x: newX, y: newY, width: newWidth, height: newHeight });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
    setResizeDirection(null);
    setMouseDownPos(null);
    setPendingDragBlockId(null);
  };

  const handleResizeStart = (e: React.MouseEvent, direction: string) => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeDirection(direction);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && activeBlockId) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;

        // Create an image to get dimensions
        const img = new window.Image();
        img.onload = () => {
          const aspectRatio = img.width / img.height;
          const block = blocks.find(b => b.id === activeBlockId);
          if (block && canvasRef.current) {
            // Calculate proper height based on width and aspect ratio
            // Account for A4 ratio in the calculation
            const canvasWidth = canvasRef.current.offsetWidth;
            const canvasHeight = canvasRef.current.offsetHeight;
            const blockWidthPx = (block.width / 100) * canvasWidth;
            const properHeightPx = blockWidthPx / aspectRatio;
            const properHeightPercent = (properHeightPx / canvasHeight) * 100;

            updateBlock(activeBlockId, {
              content: base64,
              aspectRatio,
              height: Math.min(properHeightPercent, 100 - block.y) // Constrain to canvas
            });
          } else {
            updateBlock(activeBlockId, { content: base64, aspectRatio });
          }
          setActiveBlockId(null);
        };
        img.src = base64;
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleTextEdit = (blockId: string) => {
    const block = blocks.find(b => b.id === blockId);
    if (block && block.type === 'text') {
      const newContent = prompt('Edit text:', block.content);
      if (newContent !== null) {
        updateBlock(blockId, { content: newContent });
      }
    }
  };

  const generatePDF = async () => {
    if (blocks.length === 0) {
      alert('Please add some content to your document');
      return;
    }

    setIsGenerating(true);

    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      for (const block of blocks) {
        const x = (block.x / 100) * pageWidth;
        const y = (block.y / 100) * pageHeight;
        const width = (block.width / 100) * pageWidth;
        const height = (block.height / 100) * pageHeight;

        if (block.type === 'text' && block.content) {
          doc.setFontSize(12);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(0, 0, 0);

          const lines = doc.splitTextToSize(block.content, width);
          doc.text(lines, x, y + 5);
        } else if (block.type === 'image' && block.content) {
          try {
            // Use the actual block dimensions as set by user
            doc.addImage(block.content, 'JPEG', x, y, width, height);
          } catch (imgError) {
            console.error('Error adding image to PDF:', imgError);
          }
        }
      }

      // Add footer
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text('Created with A4Docs', 10, pageHeight - 5);

      doc.save('document.pdf');
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle keyboard delete
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedBlockId) {
        // Don't delete if we're in an input field
        if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') {
          return;
        }
        deleteBlock(selectedBlockId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedBlockId]);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Hidden file input for image upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
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

              {/* Document title */}
              <input
                type="text"
                value={documentTitle}
                onChange={(e) => setDocumentTitle(e.target.value)}
                className="bg-white/20 text-white placeholder-white/60 px-4 py-2 rounded-lg text-sm font-medium border border-white/30 focus:outline-none focus:border-white/60 w-48"
                placeholder="Document title"
              />

              {lastSaved && (
                <span className="text-white/60 text-xs">
                  Saved {lastSaved.toLocaleTimeString()}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              {/* My Documents button */}
              <button
                onClick={() => setShowDocumentsList(!showDocumentsList)}
                className="flex items-center gap-2 px-4 py-2.5 bg-white/20 text-white font-medium rounded-full hover:bg-white/30 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                </svg>
                My Docs
              </button>

              {/* Save button */}
              <button
                onClick={saveDocument}
                disabled={isSaving || blocks.length === 0}
                className="flex items-center gap-2 px-4 py-2.5 bg-white text-primary font-medium rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
                  </svg>
                )}
                Save
              </button>

              {/* Download PDF button */}
              <button
                onClick={generatePDF}
                disabled={isGenerating || blocks.length === 0}
                className="flex items-center gap-2 px-4 py-2.5 bg-accent text-primary font-medium rounded-full hover:bg-accent-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Generating...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    PDF
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Documents Sidebar */}
      {showDocumentsList && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowDocumentsList(false)}
          />

          {/* Sidebar */}
          <div className="relative w-80 bg-white shadow-xl ml-auto h-full overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">My Documents</h2>
              <button
                onClick={() => setShowDocumentsList(false)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4 border-b border-gray-200">
              <button
                onClick={createNewDocument}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary-dark transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                New Document
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {savedDocuments.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-12 h-12 mx-auto mb-3 text-gray-300">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  <p>No documents yet</p>
                  <p className="text-sm mt-1">Create your first document!</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {savedDocuments.map((doc) => (
                    <div
                      key={doc.id}
                      className={`p-4 hover:bg-gray-50 cursor-pointer group ${
                        documentId === doc.id ? 'bg-primary/5' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0" onClick={() => loadDocument(doc)}>
                          <h3 className="font-medium text-gray-900 truncate">
                            {doc.title}
                          </h3>
                          <p className="text-sm text-gray-500 mt-1">
                            {doc.blocks.length} block{doc.blocks.length !== 1 ? 's' : ''}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            Updated {new Date(doc.updatedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('Delete this document?')) {
                              deleteDocument(doc.id);
                            }
                          }}
                          className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-3">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">Add:</span>
            <button
              onClick={() => addBlock('text')}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              Text
            </button>
            <button
              onClick={() => addBlock('image')}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
              </svg>
              Image
            </button>

            {selectedBlockId && (
              <>
                <div className="w-px h-6 bg-gray-300 mx-2" />
                <button
                  onClick={() => deleteBlock(selectedBlockId)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                  </svg>
                  Delete
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Canvas Area */}
      <main className="flex-1 flex items-center justify-center p-8">
        <div
          ref={canvasRef}
          className="bg-white shadow-2xl relative select-none"
          style={{
            width: '100%',
            maxWidth: '800px',
            aspectRatio: `1 / ${A4_RATIO}`,
          }}
          onClick={() => setSelectedBlockId(null)}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Grid pattern for visual guidance */}
          <div
            className="absolute inset-0 pointer-events-none opacity-10"
            style={{
              backgroundImage: 'linear-gradient(#4529F3 1px, transparent 1px), linear-gradient(90deg, #4529F3 1px, transparent 1px)',
              backgroundSize: '5% 5%',
            }}
          />

          {/* Blocks */}
          {blocks.map((block) => (
            <div
              key={block.id}
              className={`absolute cursor-move ${
                selectedBlockId === block.id
                  ? 'ring-2 ring-primary ring-offset-2'
                  : 'hover:ring-2 hover:ring-gray-300'
              }`}
              style={{
                left: `${block.x}%`,
                top: `${block.y}%`,
                width: `${block.width}%`,
                height: `${block.height}%`,
              }}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedBlockId(block.id);
              }}
              onMouseDown={(e) => handleMouseDown(e, block.id)}
              onDoubleClick={() => block.type === 'text' && handleTextEdit(block.id)}
            >
              {block.type === 'text' ? (
                <div className="w-full h-full bg-yellow-50 border border-yellow-200 p-2 overflow-hidden pointer-events-none">
                  <p className="text-sm text-gray-800 break-words">{block.content}</p>
                </div>
              ) : (
                <div className="w-full h-full bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center pointer-events-none">
                  {block.content ? (
                    <img
                      src={block.content}
                      alt="Uploaded"
                      className="w-full h-full object-contain"
                      draggable={false}
                    />
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveBlockId(block.id);
                        fileInputRef.current?.click();
                      }}
                      className="text-gray-400 hover:text-gray-600 pointer-events-auto"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-8 h-8">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                    </button>
                  )}
                </div>
              )}

              {/* Resize handles (only show when selected) */}
              {selectedBlockId === block.id && (
                <>
                  {/* Corner handles */}
                  <div
                    className="resize-handle absolute -top-2 -left-2 w-4 h-4 bg-primary border-2 border-white shadow-md rounded-sm cursor-nw-resize z-10"
                    onMouseDown={(e) => handleResizeStart(e, 'nw')}
                  />
                  <div
                    className="resize-handle absolute -top-2 -right-2 w-4 h-4 bg-primary border-2 border-white shadow-md rounded-sm cursor-ne-resize z-10"
                    onMouseDown={(e) => handleResizeStart(e, 'ne')}
                  />
                  <div
                    className="resize-handle absolute -bottom-2 -left-2 w-4 h-4 bg-primary border-2 border-white shadow-md rounded-sm cursor-sw-resize z-10"
                    onMouseDown={(e) => handleResizeStart(e, 'sw')}
                  />
                  <div
                    className="resize-handle absolute -bottom-2 -right-2 w-4 h-4 bg-primary border-2 border-white shadow-md rounded-sm cursor-se-resize z-10"
                    onMouseDown={(e) => handleResizeStart(e, 'se')}
                  />
                  {/* Edge handles */}
                  <div
                    className="resize-handle absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-primary border-2 border-white shadow-md rounded-sm cursor-n-resize z-10"
                    onMouseDown={(e) => handleResizeStart(e, 'n')}
                  />
                  <div
                    className="resize-handle absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-primary border-2 border-white shadow-md rounded-sm cursor-s-resize z-10"
                    onMouseDown={(e) => handleResizeStart(e, 's')}
                  />
                  <div
                    className="resize-handle absolute top-1/2 -left-2 -translate-y-1/2 w-4 h-4 bg-primary border-2 border-white shadow-md rounded-sm cursor-w-resize z-10"
                    onMouseDown={(e) => handleResizeStart(e, 'w')}
                  />
                  <div
                    className="resize-handle absolute top-1/2 -right-2 -translate-y-1/2 w-4 h-4 bg-primary border-2 border-white shadow-md rounded-sm cursor-e-resize z-10"
                    onMouseDown={(e) => handleResizeStart(e, 'e')}
                  />
                </>
              )}
            </div>
          ))}

          {/* Empty state */}
          {blocks.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-16 h-16 mx-auto mb-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                <p className="text-lg">Click &quot;Text&quot; or &quot;Image&quot; to add content</p>
                <p className="text-sm mt-2">Drag elements anywhere on the page</p>
              </div>
            </div>
          )}

          {/* Footer watermark */}
          <div className="absolute bottom-2 left-4 text-xs text-gray-300">
            Created with A4Docs
          </div>
        </div>
      </main>

      {/* Help text */}
      <div className="bg-gray-100 py-4 text-center text-gray-500 text-sm">
        Drag elements freely • Double-click text to edit • Use handles to resize • Press Delete to remove
      </div>
    </div>
  );
}
