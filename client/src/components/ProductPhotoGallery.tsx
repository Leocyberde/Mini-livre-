/**
 * ProductPhotoGallery - Visualizador de fotos do produto em tela cheia
 * Navegação com setas e indicadores de posição.
 */
import { useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface ProductPhotoGalleryProps {
  images: string[];
  productName: string;
  isOpen: boolean;
  initialIndex?: number;
  onClose: () => void;
}

export default function ProductPhotoGallery({
  images,
  productName,
  isOpen,
  initialIndex = 0,
  onClose,
}: ProductPhotoGalleryProps) {
  const [current, setCurrent] = useState(initialIndex);

  if (!isOpen || images.length === 0) return null;

  const prev = () => setCurrent(i => (i - 1 + images.length) % images.length);
  const next = () => setCurrent(i => (i + 1) % images.length);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[10000] bg-black/95 flex flex-col items-center justify-center"
      onClick={handleBackdropClick}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
        data-testid="btn-close-gallery"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Counter */}
      <p className="absolute top-5 left-1/2 -translate-x-1/2 text-white/70 text-sm font-medium">
        {current + 1} / {images.length}
      </p>

      {/* Main image */}
      <div className="flex-1 flex items-center justify-center w-full px-16 py-12">
        <img
          src={images[current]}
          alt={`${productName} - foto ${current + 1}`}
          className="max-w-full max-h-full object-contain rounded-lg select-none"
          draggable={false}
        />
      </div>

      {/* Navigation arrows */}
      {images.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center text-white transition-colors"
            data-testid="btn-gallery-prev"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={next}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center text-white transition-colors"
            data-testid="btn-gallery-next"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Dot indicators */}
      {images.length > 1 && (
        <div className="absolute bottom-6 flex gap-2">
          {images.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrent(idx)}
              className={`w-2.5 h-2.5 rounded-full transition-all ${
                idx === current ? 'bg-white scale-110' : 'bg-white/40 hover:bg-white/60'
              }`}
              data-testid={`btn-gallery-dot-${idx}`}
            />
          ))}
        </div>
      )}

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div className="absolute bottom-12 flex gap-2 px-4">
          {images.map((src, idx) => (
            <button
              key={idx}
              onClick={() => setCurrent(idx)}
              className={`w-14 h-14 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 ${
                idx === current ? 'border-white opacity-100' : 'border-transparent opacity-50 hover:opacity-80'
              }`}
              data-testid={`btn-gallery-thumb-${idx}`}
            >
              <img src={src} alt="" className="w-full h-full object-cover" draggable={false} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
