import { DocPage } from '@/components/call/DocPage';
import React from "react";
import Image from "next/image";

export default function HowWeDoIt() {
  return (
    <>
    <DocPage title="How we do it" description="Where Go Daisy gets its forecasts, and how it turns them into an answer.">

          {/* Placeholder for custom illustration */}
          <div className="w-full h-64 bg-base-300 rounded-lg mb-8 flex items-center justify-center">
            <Image
              src="/howwedo.webp"
              alt="Illustration of a person with many measuring devices watched by Bruno"
              width={400}
              height={256}
              className="object-contain h-full"
              priority
            />
          </div>

          <p className="mb-6 text-base-content leading-relaxed">
            At <strong>Go Daisy</strong>, we harness a wealth of data from widely respected APIs — Open-Meteo, the Norwegian Meteorological Institute and Stormglass — to gather detailed and specialist information about weather, marine conditions, astronomy, and even soil moisture.
          </p>

          <p className="mb-6 text-base-content leading-relaxed">
            But the data is just the start.
          </p>

          <p className="mb-6 text-base-content leading-relaxed">
            We dive deep into our community knowledge and trusted expert sources to understand the best possible matches between weather and environmental conditions and the activities you love — whether ideal or less-than-ideal days.
          </p>

          <p className="mb-6 text-base-content leading-relaxed">
            This nuanced understanding allows us to <strong>rank the best activities for any given day</strong>. While much of our data is freely available, no one else is transforming it into actionable insights in quite the way we do.
          </p>

          <p className="mb-6 text-base-content leading-relaxed">
            Take the ocean as an example. Anyone can find out if the wind is blowing. But Go Daisy calculates the combined effects of wind speed and gusts, wind direction, wave direction, swell size and direction, and wave period. This detailed blend tells you exactly <strong>how the waves will feel at any given beach</strong>, making your planning that much smarter and more fun.
          </p>

          <p className="mb-6 text-base-content leading-relaxed">
            In short, we gather great data, augment it with deep specialist insight, and give you simple, ranked recommendations for what to do today.
          </p>

          <p className="text-base-content italic">
            It’s data made truly useful so you can get outside, enjoy life, and spend time doing what matters most.
          </p>
    </DocPage>
    </>
  );
}

// Disable static generation
export async function getServerSideProps() {
  return { props: {} };
}
