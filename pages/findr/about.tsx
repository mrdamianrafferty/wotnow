// pages/findr/about.tsx

import Head from "next/head";
import Image from "next/image";
import FindrHeader from "../../components/findr/FindrHeader";
import FindrFooter from "../../components/FindrFooter";
import FindrBottomNav from "../../components/findr/FindrBottomNav";
import { TranslatedText } from "../../components/translation/TranslatedFishCard";

export default function FindrAboutPage() {
  return (
    <>
      <Head>
        <title>About - findr</title>
        <meta name="description" content="Learn about the team behind Findr and our mission to help anglers make smarter decisions." />
      </Head>

      <div data-theme="light" className="min-h-screen bg-base-100 text-base-content pb-16 md:pb-0">
        <FindrHeader />

        <main className="max-w-4xl mx-auto px-6 py-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-6"><TranslatedText text="About Findr" /></h1>

          <div className="prose prose-lg max-w-none">
            <div className="mb-8 flex flex-col items-center">
              <Image
                src="/bruno.jpeg"
                alt="Bruno enjoying the river"
                width={400}
                height={300}
                className="rounded-xl shadow-lg w-full max-w-md"
              />
              <span className="text-secondary mt-4 text-lg font-semibold"><TranslatedText text="Bruno, Chief Happiness Officer" /></span>
            </div>

            <p className="lead text-xl mb-8">
              <TranslatedText text="Findr is built by one developer and his trusty companion Bruno, with a passion for combining data science and fishing to create something genuinely useful." />
            </p>

            <section className="mb-12">
              <h2 className="text-3xl font-semibold mb-4"><TranslatedText text="The Origin Story" /></h2>
              <p>
                <TranslatedText text='Findr started as a simple question: "Why do fish bite better on some days than others?"' />
              </p>
              <p>
                <TranslatedText text="With access to increasingly sophisticated marine and weather data, it became clear that environmental conditions play a huge role in fish behavior. But this data was scattered across dozens of sources, wrapped in technical jargon, and impossible for everyday anglers to interpret." />
              </p>
              <p>
                <TranslatedText text="Findr was created to bridge that gap—taking complex oceanographic data and turning it into simple, actionable predictions that help you decide when and where to fish." />
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-3xl font-semibold mb-4"><TranslatedText text="Our Mission" /></h2>
              <p>
                <TranslatedText text="We believe fishing should be about enjoyment, not frustration. Findr helps you:" />
              </p>
              <ul className="space-y-2">
                <li><TranslatedText text="🎣 Plan better fishing trips based on science, not guesswork" /></li>
                <li><TranslatedText text="🌊 Understand marine conditions and how they affect fish behavior" /></li>
                <li><TranslatedText text="📚 Learn about species and their environmental preferences" /></li>
                <li><TranslatedText text="⏰ Save time by fishing when conditions are actually favorable" /></li>
                <li><TranslatedText text="🌍 Respect the environment through sustainable, informed fishing practices" /></li>
              </ul>
            </section>

            <section className="mb-12">
              <h2 className="text-3xl font-semibold mb-4"><TranslatedText text="The Team" /></h2>
              <p>
                <TranslatedText text="Our founder brings decades of experience from the BBC, UK government (DCMS), and cultural institutions like the Royal Botanic Gardens Kew and Southbank Centre. Originally a historian of navigation and exploration, they now apply that same curiosity to marine science and data." />
              </p>
              <p>
                <TranslatedText text="Bruno (the dog) provides moral support, reminds us to take breaks, and occasionally offers his opinion on new features (usually positive if treats are involved)." />
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-3xl font-semibold mb-4"><TranslatedText text="Built on Open Data" /></h2>
              <p>
                <TranslatedText text="Findr relies on publicly available scientific data from organizations like:" />
              </p>
              <ul className="space-y-1">
                <li><TranslatedText text="Copernicus Marine Service (EU)" /></li>
                <li><TranslatedText text="Norwegian Meteorological Institute" /></li>
                <li><TranslatedText text="FishBase & FAO" /></li>
                <li><TranslatedText text="NOAA & other marine research bodies" /></li>
              </ul>
              <p>
                <TranslatedText text="We're grateful to these organizations for making their data accessible, enabling projects like Findr to exist." />
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-3xl font-semibold mb-4"><TranslatedText text="The Go Daisy Connection" /></h2>
              <p>
                <TranslatedText text="Findr is part of the Go Daisy family—a suite of apps designed to help people get outside and enjoy life. While Go Daisy focuses on weather and activities, Findr zeroes in on the specific needs of anglers." />
              </p>
              <p>
                <TranslatedText text="Same philosophy: use data to create joyful, meaningful experiences. Different focus: getting fish on your line." />
              </p>
            </section>

            <div className="alert alert-info">
              <div>
                <p className="font-semibold"><TranslatedText text="Get in Touch" /></p>
                <p className="text-sm">
                  <TranslatedText text="Questions, feedback, or feature requests? Reach out at" />{" "}
                  <a href="mailto:hello@godaisy.com" className="link">
                    hello@godaisy.com
                  </a>
                </p>
              </div>
            </div>
          </div>
        </main>

        <FindrFooter />
        <FindrBottomNav />
      </div>
    </>
  );
}
