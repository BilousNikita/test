"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ArrowIcon, CloseIcon, ZoomIcon } from "@/components/ui/icons";

export interface GalleryImage {
  url: string;
  alt: string;
}

export function ProductGallery({ images, name }: { images: GalleryImage[]; name: string }) {
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const [lightbox, setLightbox] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => setActive(0), [images]);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(false);
      if (e.key === "ArrowRight") setActive((a) => (a + 1) % images.length);
      if (e.key === "ArrowLeft") setActive((a) => (a - 1 + images.length) % images.length);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [lightbox, images.length]);

  if (images.length === 0) return <div className="bg-subtle aspect-[4/5]" />;
  const current = images[Math.min(active, images.length - 1)]!;

  return (
    <div className="lg:grid lg:grid-cols-[72px_1fr] lg:gap-4">
      {/* thumbnails (desktop) */}
      <div className="hidden flex-col gap-3 lg:flex">
        {images.map((img, i) => (
          <button
            key={img.url}
            onClick={() => setActive(i)}
            aria-label={`Show image ${i + 1}`}
            aria-current={i === active}
            className={`bg-subtle relative aspect-[4/5] overflow-hidden transition-opacity ${i === active ? "ring-ink ring-1" : "opacity-60 hover:opacity-100"}`}
          >
            <Image src={img.url} alt="" fill sizes="72px" className="object-cover" />
          </button>
        ))}
      </div>

      {/* main image with hover zoom (desktop) */}
      <div
        className="bg-subtle relative hidden aspect-[4/5] cursor-zoom-in overflow-hidden lg:block"
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
        }}
        onMouseLeave={() => setZoom(null)}
        onClick={() => setLightbox(true)}
      >
        <Image
          src={current.url}
          alt={current.alt || name}
          fill
          priority
          sizes="(min-width: 1024px) 55vw, 100vw"
          className="object-cover transition-transform duration-200 ease-out"
          style={zoom ? { transform: "scale(2)", transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
        />
        <span className="bg-bg/80 pointer-events-none absolute end-4 bottom-4 flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-semibold tracking-widest uppercase">
          <ZoomIcon width={14} height={14} /> Zoom
        </span>
      </div>

      {/* swipeable gallery (mobile) */}
      <div className="lg:hidden">
        <div
          ref={scroller}
          className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none]"
          onScroll={(e) => {
            const el = e.currentTarget;
            setActive(Math.round(Math.abs(el.scrollLeft) / el.clientWidth));
          }}
        >
          {images.map((img, i) => (
            <button
              key={img.url}
              className="bg-subtle relative aspect-[4/5] w-full shrink-0 snap-center"
              onClick={() => {
                setActive(i);
                setLightbox(true);
              }}
              aria-label={`Open image ${i + 1} fullscreen`}
            >
              <Image
                src={img.url}
                alt={img.alt || name}
                fill
                priority={i === 0}
                sizes="(min-width: 1024px) 1px, 100vw"
                className="object-cover"
              />
            </button>
          ))}
        </div>
        <div className="mt-3 flex justify-center gap-1.5">
          {images.map((img, i) => (
            <span
              key={img.url}
              className={`h-1 transition-all ${i === active ? "bg-ink w-6" : "bg-line w-2"}`}
            />
          ))}
        </div>
      </div>

      {lightbox && (
        <div
          className="animate-fade-in bg-bg fixed inset-0 z-50 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-label="Image viewer"
        >
          <button
            className="absolute end-4 top-4 z-10 p-3"
            onClick={() => setLightbox(false)}
            aria-label="Close"
          >
            <CloseIcon />
          </button>
          {images.length > 1 && (
            <>
              <button
                className="absolute start-2 z-10 p-3"
                onClick={() => setActive((a) => (a - 1 + images.length) % images.length)}
                aria-label="Previous image"
              >
                <ArrowIcon className="rotate-180" />
              </button>
              <button
                className="absolute end-2 z-10 p-3"
                onClick={() => setActive((a) => (a + 1) % images.length)}
                aria-label="Next image"
              >
                <ArrowIcon />
              </button>
            </>
          )}
          <div className="relative h-full w-full max-w-4xl">
            <Image
              src={current.url}
              alt={current.alt || name}
              fill
              sizes="100vw"
              className="object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
