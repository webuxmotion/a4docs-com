'use client';

import { HeroSliderProvider } from '@/contexts/HeroSliderContext';
import Header from './Header';
import Hero from './Hero';

export default function HeroSection() {
  return (
    <HeroSliderProvider autoPlayInterval={5000}>
      <Header />
      <Hero />
    </HeroSliderProvider>
  );
}
