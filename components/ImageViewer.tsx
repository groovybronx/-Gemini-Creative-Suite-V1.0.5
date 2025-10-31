
import React, { useEffect, useCallback, useState, useRef } from 'react';
import DownloadIcon from './icons/DownloadIcon';
import ChevronLeftIcon from './icons/ChevronLeftIcon';
import ChevronRightIcon from './icons/ChevronRightIcon';

interface ImageViewerProps {
  images: string[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (newIndex: number) => void;
}

const ImageViewer: React.FC<ImageViewerProps> = ({ images, currentIndex, onClose, onNavigate }) => {
  const imageUrl = images[currentIndex];

  const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const lastMousePosition = useRef({ x: 0, y: 0 });
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      onNavigate(currentIndex - 1);
    }
  }, [currentIndex, onNavigate]);

  const handleNext = useCallback(() => {
    if (currentIndex < images.length - 1) {
      onNavigate(currentIndex + 1);
    }
  }, [currentIndex, images.length, onNavigate]);

  useEffect(() => {
    setTransform({ scale: 1, x: 0, y: 0 });
  }, [currentIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        handlePrevious();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handlePrevious, handleNext, onClose]);

  const handleDownload = async () => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gemini-creative-suite-image.${blob.type.split('/')[1] || 'png'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to download image:", error);
    }
  };
  
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomSpeed = 0.1;
    const minScale = 1;
    const maxScale = 8;

    const newScale = transform.scale - e.deltaY * zoomSpeed;
    const clampedScale = Math.max(minScale, Math.min(maxScale, newScale));

    if (clampedScale <= 1) {
      setTransform({ scale: 1, x: 0, y: 0 });
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const mouseRelativeToCenter = {
      x: mouseX - rect.width / 2,
      y: mouseY - rect.height / 2,
    };

    const newX = mouseRelativeToCenter.x - ((mouseRelativeToCenter.x - transform.x) / transform.scale) * clampedScale;
    const newY = mouseRelativeToCenter.y - ((mouseRelativeToCenter.y - transform.y) / transform.scale) * clampedScale;

    // Clamp the new position
    const image = imageRef.current;
    let finalX = newX;
    let finalY = newY;
    if (image) {
      const cW = container.offsetWidth;
      const cH = container.offsetHeight;
      const iW = image.offsetWidth;
      const iH = image.offsetHeight;

      const sW = iW * clampedScale;
      const sH = iH * clampedScale;

      const maxX = Math.max(0, (sW - cW) / 2);
      const maxY = Math.max(0, (sH - cH) / 2);

      finalX = Math.max(-maxX, Math.min(maxX, newX));
      finalY = Math.max(-maxY, Math.min(maxY, newY));
    }
    
    setTransform({ scale: clampedScale, x: finalX, y: finalY });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (transform.scale > 1) {
      e.preventDefault();
      setIsDragging(true);
      lastMousePosition.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;

    const deltaX = e.clientX - lastMousePosition.current.x;
    const deltaY = e.clientY - lastMousePosition.current.y;
    lastMousePosition.current = { x: e.clientX, y: e.clientY };

    setTransform(prev => {
      const image = imageRef.current;
      const container = containerRef.current;
      if (!image || !container) return prev;

      const newX = prev.x + deltaX;
      const newY = prev.y + deltaY;

      const cW = container.offsetWidth;
      const cH = container.offsetHeight;
      const iW = image.offsetWidth;
      const iH = image.offsetHeight;

      const sW = iW * prev.scale;
      const sH = iH * prev.scale;

      const maxX = Math.max(0, (sW - cW) / 2);
      const maxY = Math.max(0, (sH - cH) / 2);

      const clampedX = Math.max(-maxX, Math.min(maxX, newX));
      const clampedY = Math.max(-maxY, Math.min(maxY, newY));

      return { ...prev, x: clampedX, y: clampedY };
    });
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        ref={containerRef}
        className="relative w-full h-full"
        onClick={(e) => e.stopPropagation()}
        onWheel={handleWheel}
      >
        {/* Main Image */}
        <img
          ref={imageRef}
          src={imageUrl}
          alt={`Generated Content ${currentIndex + 1}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={handleMouseUpOrLeave}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            maxWidth: '85vw',
            maxHeight: '90vh',
            userSelect: 'none',
            transform: `translate(-50%, -50%) translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
            cursor: transform.scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'auto',
            transition: isDragging ? 'none' : 'transform 0.1s ease-out',
          }}
          className="object-contain rounded-lg shadow-2xl"
        />

        {/* Top Controls */}
        <div className="absolute top-2 right-2 flex items-center gap-2">
          {images.length > 1 && (
            <span className="bg-black/50 text-white text-sm font-semibold py-1 px-3 rounded-full">
              {currentIndex + 1} / {images.length}
            </span>
          )}
          <button
            onClick={onClose}
            className="bg-component-bg text-text-primary rounded-full p-2 hover:bg-gray-600 transition-colors"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Navigation Arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full p-2 hover:bg-black/70 disabled:opacity-30 disabled:cursor-not-allowed transition"
              aria-label="Previous image"
            >
              <ChevronLeftIcon className="w-8 h-8" />
            </button>
            <button
              onClick={handleNext}
              disabled={currentIndex === images.length - 1}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full p-2 hover:bg-black/70 disabled:opacity-30 disabled:cursor-not-allowed transition"
              aria-label="Next image"
            >
              <ChevronRightIcon className="w-8 h-8" />
            </button>
          </>
        )}

        {/* Download Button */}
        <button
          onClick={handleDownload}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-accent-khaki text-white rounded-full p-3 hover:bg-opacity-90 transition-opacity flex items-center gap-2"
          aria-label="Download Image"
        >
          <DownloadIcon className="w-6 h-6" />
          <span className="font-semibold">Download</span>
        </button>
      </div>
    </div>
  );
};

export default ImageViewer;
