'use client';

import Link from 'next/link';

export default function Header() {
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

          {/* Log In button */}
          <Link
            href="/login"
            className="rounded-full bg-accent px-8 py-3 text-sm font-medium text-primary hover:bg-accent-dark transition-colors"
          >
            Log In
          </Link>
        </div>

        {/* Right side - Gray/Image background area */}
        <div className="flex-1 flex items-center justify-between h-full bg-[#C8B6E2] px-6 lg:px-12">
          {/* Hamburger menu */}
          <button className="flex flex-col gap-1.5 p-2">
            <span className="block h-0.5 w-6 bg-white"></span>
            <span className="block h-0.5 w-6 bg-white"></span>
          </button>

          {/* Dots indicator */}
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-primary"></span>
            <span className="h-2.5 w-2.5 rounded-full bg-accent"></span>
            <span className="h-2.5 w-2.5 rounded-full bg-white"></span>
          </div>
        </div>
      </div>
    </header>
  );
}
