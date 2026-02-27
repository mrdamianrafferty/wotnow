// pages/findr/how-it-works.tsx

import Head from "next/head";
import FindrHeader from "../../components/findr/FindrHeader";
import FindrFooter from "../../components/FindrFooter";
import FindrBottomNav from "../../components/findr/FindrBottomNav";
import { TranslatedText } from "../../components/translation/TranslatedFishCard";

export default function FindrHowItWorksPage() {
  return (
    <>
      <Head>
        <title>How It Works - findr</title>
        <meta name="description" content="Learn how Findr combines marine data, species biology, and environmental conditions to predict fishing success." />
      </Head>

      <div data-theme="light" className="min-h-screen bg-base-100 text-base-content pb-16 lg:pb-0">
        <FindrHeader />

        <main className="max-w-4xl mx-auto px-6 py-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-6"><TranslatedText text="How Findr Works" /></h1>

          <div className="prose prose-lg max-w-none">
            <p className="lead text-xl mb-8">
              <TranslatedText text="Findr uses real-time marine and weather data combined with species-specific biology to give you science-backed fishing predictions." />
            </p>

            <section className="mb-12">
              <h2 className="text-3xl font-semibold mb-4"><TranslatedText text="🌊 The Data Behind the Magic" /></h2>
              <p><TranslatedText text="Findr pulls from multiple authoritative sources:" /></p>
              <ul className="space-y-2">
                <li><TranslatedText text="Copernicus Marine Service: Sea temperature, salinity, currents, chlorophyll, and oxygen levels" /></li>
                <li><TranslatedText text="Met.no: Weather forecasts including wind, waves, and atmospheric conditions" /></li>
                <li><TranslatedText text="FishBase & FAO: Species biology, habitat preferences, and behavioral patterns" /></li>
                <li><TranslatedText text="Tide Data: Tidal states and their influence on fish feeding behavior" /></li>
              </ul>
            </section>

            <section className="mb-12">
              <h2 className="text-3xl font-semibold mb-4"><TranslatedText text="🐟 Species-Specific Intelligence" /></h2>
              <p><TranslatedText text="Every fish species in Findr has detailed environmental preferences:" /></p>
              <div className="grid md:grid-cols-2 gap-4 mt-4">
                <div className="card bg-base-200 p-4">
                  <h3 className="font-semibold mb-2"><TranslatedText text="Temperature Range" /></h3>
                  <p className="text-sm"><TranslatedText text="Optimal and tolerable water temperature ranges for feeding" /></p>
                </div>
                <div className="card bg-base-200 p-4">
                  <h3 className="font-semibold mb-2"><TranslatedText text="Salinity Preferences" /></h3>
                  <p className="text-sm"><TranslatedText text="Species-specific salinity requirements and tolerances" /></p>
                </div>
                <div className="card bg-base-200 p-4">
                  <h3 className="font-semibold mb-2"><TranslatedText text="Depth Zones" /></h3>
                  <p className="text-sm"><TranslatedText text="Where each species typically feeds at different times" /></p>
                </div>
                <div className="card bg-base-200 p-4">
                  <h3 className="font-semibold mb-2"><TranslatedText text="Feeding Patterns" /></h3>
                  <p className="text-sm"><TranslatedText text="How tides, light, and currents affect feeding behavior" /></p>
                </div>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-3xl font-semibold mb-4"><TranslatedText text="🎯 The Bite Score" /></h2>
              <p>
                <TranslatedText text="Findr's Bite Score (0-100) combines all environmental factors with species biology to predict fishing success. Higher scores mean conditions closely match what the species prefers for active feeding." />
              </p>
              <div className="alert alert-info mt-4">
                <div>
                  <p className="font-semibold"><TranslatedText text="How to Read Bite Scores:" /></p>
                  <ul className="text-sm mt-2 space-y-1">
                    <li><TranslatedText text="🔥 90-100: Exceptional conditions - prime time!" /></li>
                    <li><TranslatedText text="✅ 75-89: Very good conditions" /></li>
                    <li><TranslatedText text="👍 60-74: Good conditions worth trying" /></li>
                    <li><TranslatedText text="🤔 40-59: Fair conditions - patience needed" /></li>
                    <li><TranslatedText text="⚠️ Below 40: Poor conditions - consider waiting" /></li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-3xl font-semibold mb-4"><TranslatedText text="📊 Confidence Levels" /></h2>
              <p>
                <TranslatedText text="Each prediction includes a confidence score showing data reliability. Predictions near shore with complete data coverage get higher confidence scores than offshore or data-sparse areas." />
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-3xl font-semibold mb-4"><TranslatedText text="🔬 Continuous Improvement" /></h2>
              <p>
                <TranslatedText text="Findr's predictions improve over time as we:" />
              </p>
              <ul className="space-y-2">
                <li><TranslatedText text="Add more species with detailed biological profiles" /></li>
                <li><TranslatedText text="Incorporate angler feedback and catch reports" /></li>
                <li><TranslatedText text="Refine algorithms based on real-world results" /></li>
                <li><TranslatedText text="Expand data coverage to new regions" /></li>
              </ul>
            </section>

            <div className="alert alert-success">
              <div>
                <p className="font-semibold"><TranslatedText text="Remember" /></p>
                <p className="text-sm">
                  <TranslatedText text="Findr is a tool to help you make informed decisions. Local knowledge, experience, and proper technique still matter most. Use Findr to maximize your chances when conditions align!" />
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
