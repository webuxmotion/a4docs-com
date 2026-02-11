'use client';

import HeroSlider from './HeroSlider';

const heroSlides = [
  { src: '/hero-slide-1.png', alt: 'Create documents easily with A4Docs' },
  { src: '/hero-slide-2.png', alt: 'Share documents with friends' },
  { src: '/hero-slide-3.png', alt: 'Save the planet by going paperless' },
];

export default function Hero() {
  return (
    <section className="relative min-h-[700px] lg:min-h-[800px]">
      {/* Split background */}
      <div className="absolute inset-0 flex">
        {/* Left blue section - approximately 60% */}
        <div className="w-[60%] bg-primary"></div>
        {/* Right gray/purple section - approximately 40% */}
        <div className="w-[40%] bg-[#C8B6E2]"></div>
      </div>

      {/* Hero Slider - positioned from the top */}
      <div className="absolute top-0 right-0 w-[45%] h-full">
        <HeroSlider slides={heroSlides} />
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
