'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useHeroSlider } from '@/contexts/HeroSliderContext';

export default function Header() {
  const { user, logout, isLoading } = useAuth();
  const { currentIndex, totalSlides, goToSlide } = useHeroSlider();

  return (
    <header className="absolute top-0 left-0 right-0 z-10">
      <div className="flex h-20 items-center">
        {/* Left side - Blue background area */}
        <div className="flex items-center gap-8 bg-primary px-6 lg:px-12 h-full">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <span className="rounded-lg bg-white px-4 py-2 text-xl font-bold text-primary">
              A4Docs
            </span>
          </Link>

          {/* Add doc button */}
          <Link href="/create" className="flex items-center gap-3 text-white text-sm font-medium">
            Create PDF
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-primary font-bold text-2xl">
              +
            </span>
          </Link>

          {/* Sign PDF button */}
          <Link href="/sign" className="flex items-center gap-3 text-white text-sm font-medium">
            Sign PDF
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
              </svg>
            </span>
          </Link>

          {/* Auth buttons */}
          {isLoading ? (
            <div className="w-20 h-10 bg-white/20 rounded-full animate-pulse" />
          ) : user ? (
            <div className="flex items-center gap-4">
              <span className="text-white text-sm">
                Hi, {user.name}
              </span>
              <button
                onClick={logout}
                className="rounded-full bg-white/20 px-6 py-2.5 text-sm font-medium text-white hover:bg-white/30 transition-colors"
              >
                Log Out
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-accent px-8 py-3 text-sm font-medium text-primary hover:bg-accent-dark transition-colors"
            >
              Log In
            </Link>
          )}
        </div>

        {/* Right side - Gray/Image background area */}
        <div className="flex-1 flex items-center justify-between h-full bg-[#C8B6E2] px-6 lg:px-12">
          {/* Hamburger menu */}
          <button className="flex flex-col gap-1.5 p-2">
            <span className="block h-0.5 w-6 bg-white"></span>
            <span className="block h-0.5 w-6 bg-white"></span>
          </button>

          {/* Slider Dots indicator */}
          {totalSlides > 1 && (
            <div className="flex items-center gap-2">
              {Array.from({ length: totalSlides }).map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={`h-2.5 w-2.5 rounded-full transition-all duration-300 ${
                    index === currentIndex
                      ? 'bg-primary'
                      : 'bg-primary/40 hover:bg-primary/60'
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
