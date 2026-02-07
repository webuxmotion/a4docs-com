const features = [
  {
    title: 'Add doc. Login after',
    description: 'You can also add new docs, when you do not loggined.',
  },
  {
    title: 'Like list',
    description: 'You can like docs, and this liked docs will be saved in your like list.',
  },
  {
    title: 'Comment blocks',
    description: 'You can comment any block in your document and public docs.',
  },
  {
    title: 'Share docs',
    description: 'You can make your docs private, public or shared by link',
  },
];

export default function PlatformFeatures() {
  return (
    <section className="bg-white py-16 lg:py-24">
      <div className="mx-auto max-w-5xl px-6 lg:px-8">
        {/* Section title */}
        <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-primary mb-12 lg:mb-16">
          Platform
          <br />
          features
        </h2>

        {/* Features list */}
        <div>
          {features.map((feature, index) => (
            <div
              key={index}
              className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 py-8 border-t border-gray-300"
            >
              <h3 className="text-xl md:text-2xl font-bold text-primary">
                {feature.title}
              </h3>
              <p className="text-primary text-base">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
