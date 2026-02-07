'use client';

import Link from 'next/link';

const publicDocs = [
  {
    title: 'Top 10 New Year comedies you should see',
    author: 'Jane Winsley',
    views: '5 433',
  },
  {
    title: 'Top 10 New Year comedies you should see',
    author: 'Jane Winsley',
    views: '5 433',
  },
  {
    title: 'Top 10 New Year comedies you should see',
    author: 'Jane Winsley',
    views: '5 433',
  },
  {
    title: 'Top 10 New Year comedies you should see',
    author: 'Jane Winsley',
    views: '5 433',
  },
];

export default function PublicDocs() {
  return (
    <section className="bg-section-blue py-16 lg:py-24">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start">
          {/* Left content */}
          <div className="lg:w-[280px] flex-shrink-0">
            <div className="flex items-start gap-6 mb-6">
              <h2 className="text-4xl sm:text-5xl font-bold text-primary leading-tight">
                Meet
                <br />
                public
                <br />
                docs
              </h2>

              {/* Navigation arrows */}
              <div className="flex items-center gap-4 pt-2">
                <button className="text-accent hover:text-accent-dark transition-colors">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2.5}
                    stroke="currentColor"
                    className="w-6 h-6"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
                    />
                  </svg>
                </button>
                <button className="text-accent hover:text-accent-dark transition-colors">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2.5}
                    stroke="currentColor"
                    className="w-6 h-6"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <p className="text-primary text-sm mb-6">
              Create documents, make them public and
              <br />
              enjoy likes, comments and thanks
            </p>

            <Link
              href="/public-docs"
              className="text-primary font-bold underline underline-offset-4 hover:text-primary-dark transition-colors"
            >
              See public docs
            </Link>
          </div>

          {/* Right content - Cards slider */}
          <div className="flex-1 overflow-hidden">
            <div className="flex gap-5" style={{ width: 'calc(100% + 150px)' }}>
              {publicDocs.map((doc, index) => (
                <div
                  key={index}
                  className="flex-shrink-0 w-[200px] lg:w-[220px] bg-white relative flex flex-col"
                  style={{ aspectRatio: '1 / 1.35' }}
                >
                  {/* Folded page corner */}
                  <div className="absolute top-0 right-0 w-0 h-0 border-l-[28px] border-l-transparent border-t-[28px] border-t-primary"></div>

                  {/* Card content */}
                  <div className="p-5 flex-1 flex flex-col">
                    <h3 className="text-primary font-bold text-lg lg:text-xl leading-tight pr-6">
                      {doc.title}
                    </h3>

                    <div className="mt-auto flex items-center justify-between">
                      <span className="text-gray-600 text-sm">{doc.author}</span>
                      <div className="flex items-center gap-1.5 text-primary text-sm">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                          className="w-5 h-5"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.64 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.64 0-8.573-3.007-9.963-7.178z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                        {doc.views}
                      </div>
                    </div>
                  </div>

                  {/* Green bottom bar */}
                  <div className="h-1.5 bg-accent"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
