// pages/findr/support.tsx

import Head from "next/head";
import { useEffect, useState } from "react";
import FindrHeader from "../../components/findr/FindrHeader";
import FindrFooter from "../../components/FindrFooter";
import FindrBottomNav from "../../components/findr/FindrBottomNav";
import { TranslatedText } from "../../components/translation/TranslatedFishCard";
import { GODAISY_TIP_PRODUCTS } from "../../lib/godaisy/tipProducts";
import type { PurchasesPackage } from "@revenuecat/purchases-capacitor";

// Disable static generation
export async function getServerSideProps() {
  return { props: { theme: "light" } };
}

export default function FindrSupportPage() {
  // Platform detection
  const [isIOSNative, setIsIOSNative] = useState(false);
  const [tipPackages, setTipPackages] = useState<PurchasesPackage[]>([]);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [tipError, setTipError] = useState<string | null>(null);
  const [tipSuccess, setTipSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (cancelled) return;
        const native = Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
        setIsIOSNative(native);

        if (native) {
          const { fetchOfferings } = await import("../../lib/grow/revenueCat");
          const offerings = await fetchOfferings();
          if (cancelled) return;
          if (offerings?.current?.availablePackages) {
            const tipIds = new Set(GODAISY_TIP_PRODUCTS.map((p) => p.id));
            const matched = offerings.current.availablePackages.filter((pkg) =>
              tipIds.has(pkg.product.identifier)
            );
            setTipPackages(matched);
          }
        }
      } catch {
        // Capacitor or RevenueCat not available — web fallback
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleTipPurchase = async (pkg: PurchasesPackage) => {
    try {
      setPurchasingId(pkg.product.identifier);
      setTipError(null);
      setTipSuccess(false);

      const { purchasePackage } = await import("../../lib/grow/revenueCat");
      const result = await purchasePackage(pkg);

      if (result) {
        setTipSuccess(true);
      }
      // null = user cancelled — do nothing
    } catch (err) {
      console.error("[Findr Support] Tip purchase failed:", err);
      setTipError(err instanceof Error ? err.message : "Purchase failed. Please try again.");
    } finally {
      setPurchasingId(null);
    }
  };

  return (
    <>
      <Head>
        <title>Support - findr</title>
        <meta
          name="description"
          content="Help support Findr's development. Keep the fish biting and the forecasts flowing!"
        />
        <meta property="og:title" content="Support Findr" />
        <meta
          property="og:description"
          content="Help support Findr's development. Keep the fish biting and the forecasts flowing!"
        />
        <meta property="og:image" content="/doggy.jpg" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Support Findr" />
        <meta
          name="twitter:description"
          content="Help support Findr's development. Keep the fish biting and the forecasts flowing!"
        />
        <meta name="twitter:image" content="/doggy.jpg" />
      </Head>

      <div data-theme="light" className="min-h-screen bg-base-100 text-base-content pb-16 lg:pb-0">
        <FindrHeader />

        <main className="max-w-4xl mx-auto px-6 py-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-6"><TranslatedText text="Support Findr" /></h1>

          <div className="prose prose-lg max-w-none">
            <p className="lead text-xl mb-8">
              <TranslatedText text="Findr is a passion project built to help anglers make smarter decisions based on real environmental data. Your support helps keep it running and growing!" />
            </p>

            <section className="mb-12">
              <h2 className="text-3xl font-semibold mb-4"><TranslatedText text="Why Support Findr?" /></h2>
              <ul className="space-y-2">
                <li><TranslatedText text="Covers costs for marine and weather data APIs" /></li>
                <li><TranslatedText text="Keeps servers running and predictions flowing" /></li>
                <li><TranslatedText text="Funds ongoing species data research and improvements" /></li>
                <li><TranslatedText text="Supports continued development of new features" /></li>
                <li><TranslatedText text="Keeps the developer (and Bruno the dog) in biscuits" /></li>
              </ul>
            </section>

            {/* Patreon — web only */}
            {!isIOSNative && (
              <section className="mb-12">
                <h2 className="text-3xl font-semibold mb-4"><TranslatedText text="Join the Findr Community" /></h2>
                <div className="card bg-primary text-primary-content p-6 mb-6">
                  <h3 className="text-2xl font-bold mb-2"><TranslatedText text="Become a Patreon" /></h3>
                  <p className="mb-4">
                    <TranslatedText text="Get exclusive early access to new features, monthly development updates, and have a say in what gets built next." />
                  </p>
                  <a
                    href="https://patreon.com/GoDaisy?utm_medium=unknown&utm_source=join_link&utm_campaign=creatorshare_creator&utm_content=copyLink"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary btn-wide"
                  >
                    <TranslatedText text="Join on Patreon" />
                  </a>
                </div>
              </section>
            )}

            {/* Tip Jar */}
            <section className="mb-12">
              <h2 className="text-3xl font-semibold mb-4"><TranslatedText text="Tip Jar" /></h2>

              {isIOSNative ? (
                <>
                  <p className="mb-4">
                    <TranslatedText text="Leave a one-off tip to help keep Findr running. Every contribution helps!" />
                  </p>

                  {tipSuccess && (
                    <div className="alert alert-success text-sm mb-4">
                      <span><TranslatedText text="Thank you for the tip! You're a legend." /></span>
                    </div>
                  )}
                  {tipError && (
                    <div className="alert alert-error text-sm mb-4">
                      <span>{tipError}</span>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-4">
                    {tipPackages.length > 0 ? (
                      tipPackages.map((pkg) => {
                        const product = GODAISY_TIP_PRODUCTS.find(
                          (p) => p.id === pkg.product.identifier
                        );
                        return (
                          <button
                            key={pkg.product.identifier}
                            className="btn btn-outline"
                            disabled={!!purchasingId}
                            onClick={() => handleTipPurchase(pkg)}
                          >
                            {purchasingId === pkg.product.identifier ? (
                              <span className="loading loading-spinner loading-sm" />
                            ) : (
                              <span>{product?.emoji ?? ''} {product?.label ?? pkg.product.title}</span>
                            )}
                            <span className="ml-2 font-semibold">
                              {pkg.product.priceString}
                            </span>
                          </button>
                        );
                      })
                    ) : (
                      GODAISY_TIP_PRODUCTS.map((product) => (
                        <button
                          key={product.id}
                          className="btn btn-outline btn-disabled"
                          disabled
                        >
                          <span>{product.emoji} {product.label}</span>
                          <span className="ml-2 font-semibold">
                            &euro;{product.defaultPriceEur}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </>
              ) : (
                <>
                  <p className="mb-4">
                    <TranslatedText text="Tips are available in the Findr iOS app." />
                  </p>
                  <a
                    className="link link-primary"
                    href="https://apps.apple.com/app/id6755045700"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <TranslatedText text="Get it on the App Store" />
                  </a>
                </>
              )}
            </section>

            <section className="mb-12">
              <h2 className="text-3xl font-semibold mb-4"><TranslatedText text="Every Little Helps" /></h2>
              <p>
                <TranslatedText text="Whether you're a regular supporter or just want to buy us a virtual coffee, we're genuinely grateful. Findr is built by a tiny team (one human, one dog), and your support makes a real difference in keeping this project alive and kicking." />
              </p>
            </section>

            <div className="alert alert-info">
              <div>
                <p className="font-semibold"><TranslatedText text="Questions about supporting Findr?" /></p>
                <p className="text-sm">
                  <TranslatedText text="Get in touch at" />{" "}
                  <a href="mailto:hello@fishfindr.eu" className="link">
                    hello@fishfindr.eu
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
