'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

interface HeroSliderContextType {
  currentIndex: number;
  totalSlides: number;
  setTotalSlides: (count: number) => void;
  goToSlide: (index: number) => void;
  goToNext: () => void;
  goToPrev: () => void;
}

const HeroSliderContext = createContext<HeroSliderContextType | null>(null);

export function HeroSliderProvider({ children, autoPlayInterval = 5000 }: { children: ReactNode; autoPlayInterval?: number }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [totalSlides, setTotalSlides] = useState(0);

  const goToSlide = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  const goToNext = useCallback(() => {
    if (totalSlides > 0) {
      setCurrentIndex((prev) => (prev + 1) % totalSlides);
    }
  }, [totalSlides]);

  const goToPrev = useCallback(() => {
    if (totalSlides > 0) {
      setCurrentIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
    }
  }, [totalSlides]);

  useEffect(() => {
    if (autoPlayInterval <= 0 || totalSlides <= 1) return;

    const interval = setInterval(goToNext, autoPlayInterval);
    return () => clearInterval(interval);
  }, [autoPlayInterval, goToNext, totalSlides]);

  return (
    <HeroSliderContext.Provider value={{ currentIndex, totalSlides, setTotalSlides, goToSlide, goToNext, goToPrev }}>
      {children}
    </HeroSliderContext.Provider>
  );
}

export function useHeroSlider() {
  const context = useContext(HeroSliderContext);
  if (!context) {
    throw new Error('useHeroSlider must be used within a HeroSliderProvider');
  }
  return context;
}
