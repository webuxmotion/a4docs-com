import HeroSection from './components/HeroSection';
import PlatformFeatures from './components/PlatformFeatures';
import PublicDocs from './components/PublicDocs';
import Testimonial from './components/Testimonial';
import Footer from './components/Footer';

export default function Home() {
  return (
    <div className="min-h-screen">
      <HeroSection />
      <PlatformFeatures />
      <PublicDocs />
      <Testimonial />
      <Footer />
    </div>
  );
}
