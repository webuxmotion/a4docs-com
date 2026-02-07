import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-primary py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Contacts section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center mb-8">
          <h3 className="text-white font-bold text-lg">Contacts</h3>
          <a
            href="mailto:hello@gmail.com"
            className="text-white hover:text-accent transition-colors"
          >
            hello@gmail.com
          </a>
          <a
            href="tel:+380951234567"
            className="text-white hover:text-accent transition-colors md:text-right"
          >
            +38 095 123 45 67
          </a>
        </div>

        {/* Bottom section */}
        <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-white/20">
          {/* Logo */}
          <Link href="/" className="mb-4 md:mb-0">
            <span className="text-4xl font-black text-accent">
              A4D
            </span>
          </Link>

          {/* Copyright */}
          <p className="text-white text-sm">
            &copy; A4Docs
          </p>
        </div>
      </div>
    </footer>
  );
}
