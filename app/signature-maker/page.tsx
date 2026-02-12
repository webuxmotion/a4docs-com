'use client';

import { useState, useRef, useCallback } from 'react';
import Link from 'next/link';

export default function SignatureMakerPage() {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [threshold, setThreshold] = useState(200);
  const [smoothing, setSmoothing] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Process image to remove background
  const processImage = useCallback((imageSrc: string, thresholdValue: number, smoothingValue: number) => {
    setIsProcessing(true);

    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Set canvas size to image size
      canvas.width = img.width;
      canvas.height = img.height;

      // Draw original image
      ctx.drawImage(img, 0, 0);

      // Get image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Process each pixel
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Calculate brightness (grayscale value)
        const brightness = (r + g + b) / 3;

        // If pixel is brighter than threshold, make it transparent
        if (brightness > thresholdValue) {
          data[i + 3] = 0; // Set alpha to 0 (transparent)
        } else {
          // Make dark pixels fully opaque and darker for better contrast
          const darkness = Math.max(0, 255 - brightness);
          const factor = darkness / 255;

          // Darken the signature
          data[i] = Math.round(data[i] * factor * 0.3); // R
          data[i + 1] = Math.round(data[i + 1] * factor * 0.3); // G
          data[i + 2] = Math.round(data[i + 2] * factor * 0.3); // B
          data[i + 3] = Math.round(255 * Math.min(1, (thresholdValue - brightness) / (thresholdValue * 0.5))); // Alpha based on darkness
        }
      }

      // Apply smoothing if needed
      if (smoothingValue > 0) {
        // Simple edge smoothing by averaging alpha with neighbors
        const tempData = new Uint8ClampedArray(data);
        const width = canvas.width;
        const height = canvas.height;

        for (let pass = 0; pass < smoothingValue; pass++) {
          for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
              const idx = (y * width + x) * 4;

              // Only smooth edge pixels (semi-transparent)
              if (tempData[idx + 3] > 0 && tempData[idx + 3] < 255) {
                // Average with neighbors
                let alphaSum = 0;
                let count = 0;

                for (let dy = -1; dy <= 1; dy++) {
                  for (let dx = -1; dx <= 1; dx++) {
                    const nIdx = ((y + dy) * width + (x + dx)) * 4;
                    alphaSum += tempData[nIdx + 3];
                    count++;
                  }
                }

                data[idx + 3] = Math.round(alphaSum / count);
              }
            }
          }
        }
      }

      // Put processed image data back
      ctx.putImageData(imageData, 0, 0);

      // Get processed image as PNG
      const processedDataUrl = canvas.toDataURL('image/png');
      setProcessedImage(processedDataUrl);
      setIsProcessing(false);
    };

    img.onerror = () => {
      console.error('Error loading image');
      setIsProcessing(false);
    };

    img.src = imageSrc;
  }, []);

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setOriginalImage(dataUrl);
        processImage(dataUrl, threshold, smoothing);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  // Handle drag and drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setOriginalImage(dataUrl);
        processImage(dataUrl, threshold, smoothing);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Reprocess when settings change
  const handleThresholdChange = (value: number) => {
    setThreshold(value);
    if (originalImage) {
      processImage(originalImage, value, smoothing);
    }
  };

  const handleSmoothingChange = (value: number) => {
    setSmoothing(value);
    if (originalImage) {
      processImage(originalImage, threshold, value);
    }
  };

  // Download processed image
  const downloadImage = () => {
    if (!processedImage) return;

    const link = document.createElement('a');
    link.href = processedImage;
    link.download = 'signature-transparent.png';
    link.click();
  };

  // Reset
  const reset = () => {
    setOriginalImage(null);
    setProcessedImage(null);
    setThreshold(200);
    setSmoothing(1);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Hidden elements */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />
      <canvas ref={canvasRef} className="hidden" />

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
              <span className="text-white/80 text-sm">
                Signature Maker
              </span>
            </div>

            <div className="flex items-center gap-3">
              {processedImage && (
                <button
                  onClick={downloadImage}
                  className="flex items-center gap-2 px-4 py-2.5 bg-accent text-primary font-medium rounded-full hover:bg-accent-dark transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  Download PNG
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center p-8">
        {!originalImage ? (
          // Upload area
          <div
            className="w-full max-w-2xl aspect-video bg-white rounded-xl shadow-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-gray-50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-16 h-16 text-gray-400 mb-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
            </svg>
            <p className="text-lg text-gray-600 mb-2">Drop your signature photo here</p>
            <p className="text-sm text-gray-400">or click to browse</p>
            <p className="text-xs text-gray-400 mt-4">Supports JPEG, PNG images</p>
          </div>
        ) : (
          // Processing view
          <div className="w-full max-w-4xl">
            {/* Controls */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <div className="flex flex-wrap items-center gap-6">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Threshold: {threshold}
                  </label>
                  <input
                    type="range"
                    min="100"
                    max="255"
                    value={threshold}
                    onChange={(e) => handleThresholdChange(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <p className="text-xs text-gray-500 mt-1">Higher = more background removed</p>
                </div>

                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Smoothing: {smoothing}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="5"
                    value={smoothing}
                    onChange={(e) => handleSmoothingChange(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <p className="text-xs text-gray-500 mt-1">Smoother edges</p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Upload New
                  </button>
                  <button
                    onClick={reset}
                    className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>

            {/* Image comparison */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Original */}
              <div className="bg-white rounded-xl shadow-lg p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Original</h3>
                <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                  <img
                    src={originalImage}
                    alt="Original"
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              </div>

              {/* Processed */}
              <div className="bg-white rounded-xl shadow-lg p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  Transparent PNG
                  {isProcessing && <span className="ml-2 text-gray-400">(processing...)</span>}
                </h3>
                <div
                  className="aspect-video rounded-lg overflow-hidden flex items-center justify-center"
                  style={{
                    backgroundImage: 'linear-gradient(45deg, #e0e0e0 25%, transparent 25%), linear-gradient(-45deg, #e0e0e0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e0e0e0 75%), linear-gradient(-45deg, transparent 75%, #e0e0e0 75%)',
                    backgroundSize: '20px 20px',
                    backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
                    backgroundColor: '#f0f0f0',
                  }}
                >
                  {isProcessing ? (
                    <svg className="animate-spin h-8 w-8 text-primary" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : processedImage ? (
                    <img
                      src={processedImage}
                      alt="Processed"
                      className="max-w-full max-h-full object-contain"
                    />
                  ) : null}
                </div>
              </div>
            </div>

            {/* Download button */}
            {processedImage && !isProcessing && (
              <div className="mt-6 text-center">
                <button
                  onClick={downloadImage}
                  className="inline-flex items-center gap-2 px-8 py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary-dark transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  Download Transparent PNG
                </button>
                <p className="text-sm text-gray-500 mt-2">
                  Use this signature in the Sign PDF tool
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <div className="bg-gray-100 py-4 text-center text-gray-500 text-sm">
        Upload a photo of your signature • Adjust threshold to remove background • Download as transparent PNG
      </div>
    </div>
  );
}
