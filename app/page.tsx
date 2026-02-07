import Header from './components/Header';
import Hero from './components/Hero';
import PlatformFeatures from './components/PlatformFeatures';
import PublicDocs from './components/PublicDocs';
import Testimonial from './components/Testimonial';
import Footer from './components/Footer';

export default function Home() {
  return (
    <div className="min-h-screen">
      <Header />
      <Hero />
      <PlatformFeatures />
      <PublicDocs />
      <Testimonial />
      <Footer />
    </div>
  );
}
