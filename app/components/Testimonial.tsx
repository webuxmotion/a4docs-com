'use client';

import { useState, useEffect } from 'react';

const testimonials = [
  {
    quote: 'We deliver 100% and provide instant response to help you succeed.',
    author: 'Ann Batlers,',
    role: 'Content Manager at LALAJS',
  },
  {
    quote: 'A4Docs transformed how our team collaborates on documents. Simply amazing!',
    author: 'Mike Johnson,',
    role: 'Product Lead at TechCorp',
  },
  {
    quote: 'The best document platform I have ever used. Highly recommended for teams.',
    author: 'Sarah Chen,',
    role: 'CEO at StartupXYZ',
  },
];

// Dot colors in order
const dotColors = ['bg-primary', 'bg-accent', 'bg-primary-dark'];

export default function Testimonial() {
  const [currentSlide, setCurrentSlide] = useState(0);

  // Auto-play functionality
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % testimonials.length);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="bg-white py-16 lg:py-24 overflow-hidden">
      <div className="mx-auto max-w-5xl px-6 lg:px-8">
        {/* Dots indicator - top right */}
        <div className="flex justify-end mb-8">
          <div className="flex items-center gap-2">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`h-3 w-3 rounded-full transition-all duration-300 ${dotColors[index]} ${
                  index === currentSlide
                    ? 'scale-125 opacity-100'
                    : 'opacity-40 hover:opacity-70'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Quote mark */}
        <div className="text-section-blue text-[120px] lg:text-[150px] font-serif leading-none h-20 lg:h-24 overflow-visible">
          &rdquo;
        </div>

        {/* Slider container */}
        <div className="relative mt-8 overflow-hidden">
          <div
            className="flex transition-transform duration-500 ease-out"
            style={{ transform: `translateX(-${currentSlide * 100}%)` }}
          >
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="w-full flex-shrink-0 flex flex-col lg:flex-row lg:items-end gap-8 lg:gap-16"
              >
                {/* Quote text */}
                <blockquote className="text-2xl sm:text-3xl lg:text-4xl font-bold text-primary leading-tight italic lg:w-[60%] min-h-[120px] lg:min-h-[150px]">
                  {testimonial.quote}
                </blockquote>

                {/* Author */}
                <div className="lg:w-[40%]">
                  <p className="text-primary font-medium">
                    {testimonial.author}
                  </p>
                  <p className="text-gray-500 text-sm">
                    {testimonial.role}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
