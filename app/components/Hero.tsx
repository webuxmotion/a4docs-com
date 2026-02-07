'use client';

import Image from 'next/image';
import { useState } from 'react';

export default function Hero() {
  const [imageError, setImageError] = useState(false);

  return (
    <section className="relative min-h-[700px] lg:min-h-[800px]">
      {/* Split background */}
      <div className="absolute inset-0 flex">
        {/* Left blue section - approximately 60% */}
        <div className="w-[60%] bg-primary"></div>
        {/* Right gray/purple section - approximately 40% */}
        <div className="w-[40%] bg-[#C8B6E2]"></div>
      </div>

      {/* Hero Image - positioned from the top */}
      <div className="absolute top-0 right-0 w-[45%] h-full">
        {!imageError ? (
          <Image
            src="/hero-image.jpg"
            alt="Happy person using A4Docs"
            fill
            className="object-cover object-top"
            priority
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-white/20">
            <div className="text-center text-primary/60">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1}
                stroke="currentColor"
                className="w-24 h-24 mx-auto mb-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
                />
              </svg>
              <p className="text-sm">Add hero-image.jpg to /public</p>
            </div>
          </div>
        )}
      </div>

      {/* Main Heading */}
      <div className="relative z-[1] pt-32 lg:pt-40 px-6 lg:px-12">
        <div className="w-[55%]">
          <h1 className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-black leading-[0.95]">
            <span className="text-accent italic block">SAVE</span>
            <span className="text-accent italic block">PLANET.</span>
            <span className="text-white block">CREATE DOCS</span>
            <span className="text-white block pl-16 lg:pl-32">ONLINE</span>
          </h1>
        </div>
      </div>

      {/* Subtitle text - positioned at bottom of blue section */}
      <div className="absolute bottom-12 left-0 w-[55%] px-6 lg:px-12 z-[1]">
        <p className="text-white text-lg text-right">
          Save what you want with A4Docs
          <br />
          and share with friends
          <br />
          in easy way.
        </p>
      </div>
    </section>
  );
}
