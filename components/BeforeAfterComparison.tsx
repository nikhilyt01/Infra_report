'use client';

import { useState } from 'react';
import { Camera, ImageIcon, ZoomIn, X, ChevronLeft, ChevronRight } from 'lucide-react';

interface BeforeAfterComparisonProps {
  beforeImages: string[];
  afterImages: string[];
  resolvedAt?: string;
  resolutionNote?: string;
}

export default function BeforeAfterComparison({
  beforeImages,
  afterImages,
  resolvedAt,
  resolutionNote,
}: BeforeAfterComparisonProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  if (!afterImages || afterImages.length === 0) return null;

  const openLightbox = (images: string[], startIndex: number) => {
    setLightboxImages(images);
    setLightboxIndex(startIndex);
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
    setLightboxImages([]);
    setLightboxIndex(0);
  };

  const navigateLightbox = (dir: -1 | 1) => {
    setLightboxIndex((prev) => {
      const next = prev + dir;
      if (next < 0) return lightboxImages.length - 1;
      if (next >= lightboxImages.length) return 0;
      return next;
    });
  };

  // Keyboard nav
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') navigateLightbox(-1);
    if (e.key === 'ArrowRight') navigateLightbox(1);
  };

  const ImageGrid = ({
    images,
    label,
    labelColor,
    icon: Icon,
  }: {
    images: string[];
    label: string;
    labelColor: string;
    icon: any;
  }) => (
    <div className="flex-1 space-y-2.5">
      <div className={`flex items-center gap-1.5 text-xs font-bold ${labelColor}`}>
        <Icon className="w-3.5 h-3.5" />
        <span>{label}</span>
        <span className="text-[10px] font-normal text-muted-foreground ml-1">
          ({images.length} {images.length === 1 ? 'photo' : 'photos'})
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {images.map((img, idx) => (
          <div
            key={idx}
            onClick={() => openLightbox(images, idx)}
            className="relative aspect-video rounded-lg overflow-hidden border border-border/80 bg-secondary/50 cursor-pointer group shadow-xs hover:shadow-md hover:border-primary/50 transition-all"
          >
            <img
              src={img}
              alt={`${label} #${idx + 1}`}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
              <ZoomIn className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
            </div>
            <span className="absolute bottom-1 left-1 bg-black/70 text-white text-[9px] font-mono px-1.5 py-0.5 rounded">
              #{idx + 1}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <>
      <div className="space-y-4">
        {/* Before / After header */}
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Camera className="w-3.5 h-3.5 text-primary" />
            <span>Before / After Comparison</span>
          </h3>
          {resolvedAt && (
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
              Resolved on{' '}
              {new Date(resolvedAt).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          )}
        </div>

        {/* Side-by-side on desktop, stacked on mobile */}
        <div className="flex flex-col md:flex-row gap-4">
          {beforeImages.length > 0 && (
            <ImageGrid
              images={beforeImages}
              label="Before (Original)"
              labelColor="text-rose-600 dark:text-rose-400"
              icon={ImageIcon}
            />
          )}

          {/* Divider */}
          {beforeImages.length > 0 && (
            <>
              {/* Vertical on desktop */}
              <div className="hidden md:flex items-center">
                <div className="w-[2px] h-full bg-border/60 rounded-full relative">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background border border-border/80 rounded-full p-1">
                    <ChevronRight className="w-3 h-3 text-emerald-500" />
                  </div>
                </div>
              </div>
              {/* Horizontal on mobile */}
              <div className="flex md:hidden items-center justify-center">
                <div className="h-[2px] w-full bg-border/60 rounded-full relative">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background border border-border/80 rounded-full p-1">
                    <ChevronRight className="w-3 h-3 text-emerald-500 rotate-90" />
                  </div>
                </div>
              </div>
            </>
          )}

          <ImageGrid
            images={afterImages}
            label="After (Resolved)"
            labelColor="text-emerald-600 dark:text-emerald-400"
            icon={Camera}
          />
        </div>

        {/* Resolution note */}
        {resolutionNote && (
          <div className="p-3 bg-emerald-500/5 border border-emerald-500/15 rounded-lg">
            <p className="text-[11px] text-foreground/80 leading-relaxed">
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">Resolution note: </span>
              {resolutionNote}
            </p>
          </div>
        )}
      </div>

      {/* Fullscreen Lightbox */}
      {lightboxOpen && lightboxImages.length > 0 && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center"
          onClick={closeLightbox}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          role="dialog"
          aria-modal="true"
        >
          {/* Close button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 z-[101] w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Counter */}
          <div className="absolute top-4 left-4 z-[101] text-white/70 text-sm font-mono bg-black/40 px-3 py-1 rounded-full">
            {lightboxIndex + 1} / {lightboxImages.length}
          </div>

          {/* Navigation arrows */}
          {lightboxImages.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigateLightbox(-1);
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-[101] w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigateLightbox(1);
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-[101] w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}

          {/* Image */}
          <div
            className="max-w-[90vw] max-h-[85vh] relative"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightboxImages[lightboxIndex]}
              alt={`Photo ${lightboxIndex + 1}`}
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
            />
          </div>
        </div>
      )}
    </>
  );
}
