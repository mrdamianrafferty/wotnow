import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface WeatherCarouselProps {
  title: string;
  description?: string;
  items: React.ReactNode[];
  className?: string;
  itemWidth?: number;
  controlsAriaLabel?: string;
}

export function WeatherCarousel({
  title,
  description,
  items,
  className = '',
  itemWidth = 200,
  controlsAriaLabel,
}: WeatherCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollBack, setCanScrollBack] = useState(false);
  const [canScrollForward, setCanScrollForward] = useState(false);

  const updateScrollState = useCallback(() => {
    const container = scrollRef.current;
    if (!container) return;
    const { scrollLeft, scrollWidth, clientWidth } = container;
    setCanScrollBack(scrollLeft > 8);
    setCanScrollForward(scrollLeft + clientWidth < scrollWidth - 8);
  }, []);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    updateScrollState();
    container.addEventListener('scroll', updateScrollState);
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateScrollState) : null;
    observer?.observe(container);
    return () => {
      container.removeEventListener('scroll', updateScrollState);
      observer?.disconnect();
    };
  }, [updateScrollState]);

  useEffect(() => {
    updateScrollState();
  }, [items.length, updateScrollState]);

  const handleScroll = (direction: 'forward' | 'back') => {
    const container = scrollRef.current;
    if (!container) return;
    const delta = direction === 'forward' ? itemWidth * 2 : -itemWidth * 2;
    container.scrollBy({ left: delta, behavior: 'smooth' });
  };

  return (
    <div className={`card bg-base-200/40 border border-base-200/80 shadow-sm space-y-3 ${className}`}>
      <div className="card-body gap-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">{title}</h2>
            {description ? <p className="text-xs text-base-content/60">{description}</p> : null}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn btn-circle btn-ghost btn-sm"
              onClick={() => handleScroll('back')}
              aria-label={controlsAriaLabel ? `${controlsAriaLabel} previous` : 'Scroll backward'}
              disabled={!canScrollBack}
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              className="btn btn-circle btn-ghost btn-sm"
              onClick={() => handleScroll('forward')}
              aria-label={controlsAriaLabel ? `${controlsAriaLabel} next` : 'Scroll forward'}
              disabled={!canScrollForward}
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
        <div
          ref={scrollRef}
          className="carousel carousel-center w-full space-x-2 overflow-x-auto scroll-smooth pb-2"
        >
          {items.map((item, index) => (
            <div key={index} className="carousel-item w-[200px] max-w-[75vw]">
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default WeatherCarousel;
