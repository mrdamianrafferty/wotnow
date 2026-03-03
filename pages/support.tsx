// pages/support.tsx

import Head from "next/head";
import { useEffect, useState } from "react";
import AppHeader from "../components/AppHeader";
import Footer from "../components/footer";
import { useUIText } from "../hooks/useUIText";
import { GODAISY_TIP_PRODUCTS } from "../lib/godaisy/tipProducts";
import type { PurchasesPackage } from "@revenuecat/purchases-capacitor";

// Disable static generation
export async function getServerSideProps() {
  return { props: { theme: "light" } };
}

export default function SupportPage() {
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
          const { fetchOfferings } = await import("../lib/grow/revenueCat");
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

      const { purchasePackage } = await import("../lib/grow/revenueCat");
      const result = await purchasePackage(pkg);

      if (result) {
        setTipSuccess(true);
      }
      // null = user cancelled — do nothing
    } catch (err) {
      console.error("[Support] Tip purchase failed:", err);
      setTipError(err instanceof Error ? err.message : "Purchase failed. Please try again.");
    } finally {
      setPurchasingId(null);
    }
  };

  // Translation hooks
  const pageTitle = useUIText('support.label.support_go_daisy_14', 'Support Go Daisy');
  const metaDescription = useUIText('support.paragraph.join_the_go_daisy_community_on_15',
    'Join the Go Daisy community on Patreon or tip via Apple. Help cover weather data, hosting, and keep Damian — and Bruno — in biscuits.');

  const heroHeading = useUIText('support.heading.keep_go_daisy_blooming_21', 'Keep Go Daisy Blooming');
  const heroText = useUIText('support.paragraph.hero_description',
    'Go Daisy isn\'t just an app — it\'s a small, friendly community of people who prefer doing to doom-scrolling. If our forecasts and nudges helped you rally mates, discover a cracking day out, or dodge a downpour, you can support the project and keep it blooming.');

  const badgeCommunity = useUIText('support.badge.community_first', 'Community-first');
  const badgeNoPaywalls = useUIText('support.label.no_paywalls_24', 'No paywalls');
  const badgeIndie = useUIText('support.label.indie_friendly_26', 'Indie & friendly');

  const patreonHeading = useUIText('support.heading.join_us_on_patreon_30', 'Join us on Patreon');
  const patreonText = useUIText('support.paragraph.patreon_description',
    'Be part of the gang who keep Go Daisy buzzing — with early peeks at features, gentle nudges to get outside, and the odd behind-the-scenes chuckle.');
  const patreonButton = useUIText('support.button.support_via_patreon', 'Support via Patreon');

  const appleTipHeading = useUIText('support.heading.tip_jar', 'Tip Jar');
  const appleTipText = useUIText('support.paragraph.tip_jar_description',
    'Quick, simple, one-off thanks. No perks, just a pat on the back (and a biscuit for Bruno).');

  const transparencyHeading = useUIText('support.heading.transparency', 'Transparency');
  const transparencyOptional = useUIText('support.paragraph.memberships_optional',
    'Memberships and tips are optional and non-refundable — a thank-you, not a transaction.');
  const transparencyNoGating = useUIText('support.paragraph.no_features_are_gated_behind_s_38',
    'No features are gated behind support. Everyone gets the same forecast.');
  const transparencyUpdates = useUIText('support.paragraph.patreon_updates_and_progress_n_39',
    'Patreon updates and progress notes are shared with supporters; feature launches land for all users.');

  const faqHeading = useUIText('support.heading.frequently_asked_questions_40', 'Frequently asked questions');

  const faqQ1 = useUIText('support.paragraph.does_support_unlock_features__41', 'Does support unlock features?');
  const faqA1 = useUIText('support.paragraph.afraid_not_support_keeps_the_l_42',
    'Afraid not. Support keeps the lights on and the data flowing, but features roll out to everyone.');

  const faqQ2 = useUIText('support.paragraph.can_i_cancel_any_time__43', 'Can I cancel any time?');
  const faqA2 = useUIText('support.paragraph.yes_patreon_manages_billing_yo_44',
    'Yes — Patreon manages billing. You can switch tiers or cancel whenever you like. Tips are one-off.');

  const faqQ3 = useUIText('support.paragraph.other_ways_to_help__45', 'Other ways to help?');
  const faqA3 = useUIText('support.paragraph.tell_a_friend_start_a_plan_or__46',
    'Tell a friend, start a plan, or share your favourite Go Daisy moment. Word of mouth is golden.');

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={metaDescription} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:image" content="/doggy.jpg" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={metaDescription} />
        <meta name="twitter:image" content="/doggy.jpg" />
      </Head>

      {/* THEME SCOPE — everything inside uses DaisyUI "light" regardless of the rest of the site */}
      <div data-theme="light" className="min-h-screen bg-base-100 text-base-content">
        <AppHeader onOpenHomeDialog={() => {}} onOpenCoastDialog={() => {}} />

        <main className="container mx-auto max-w-3xl px-4 py-10 space-y-10">
          {/* Hero */}
          <div className="card bg-base-200 shadow-sm">
            <div className="card-body space-y-4">
              <h2 className="card-title text-3xl text-base-content">{heroHeading}</h2>
              <p className="leading-relaxed text-base-content">{heroText}</p>
              <div className="flex flex-wrap gap-2 text-xs opacity-80 text-base-content">
                <span className="badge badge-outline">{badgeCommunity}</span>
                <span className="badge badge-outline">{badgeNoPaywalls}</span>
                <span className="badge badge-outline">{badgeIndie}</span>
              </div>
            </div>
          </div>

          {/* Support options */}
          <div className="grid gap-6 sm:grid-cols-2">
            {/* Patreon card — web only */}
            {!isIOSNative && (
              <div className="card bg-base-200">
                <div className="card-body space-y-3">
                  <h2 className="card-title text-lg text-base-content">{patreonHeading}</h2>
                  <p className="text-base-content">{patreonText}</p>
                  <a
                    className="btn btn-primary"
                    href="https://patreon.com/GoDaisy?utm_medium=unknown&utm_source=join_link&utm_campaign=creatorshare_creator&utm_content=copyLink"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {patreonButton}
                  </a>
                </div>
              </div>
            )}

            {/* Tip Jar card */}
            <div className="card bg-base-200">
              <div className="card-body space-y-3">
                <h2 className="card-title text-lg text-base-content">{appleTipHeading}</h2>
                <p className="text-base-content">{appleTipText}</p>

                {/* iOS native: RevenueCat IAP buttons */}
                {isIOSNative ? (
                  <>
                    {tipSuccess && (
                      <div className="alert alert-success text-sm">
                        <span>Thank you for the tip! You&apos;re a legend.</span>
                      </div>
                    )}
                    {tipError && (
                      <div className="alert alert-error text-sm">
                        <span>{tipError}</span>
                      </div>
                    )}
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
                  </>
                ) : (
                  /* Web: show message + App Store link */
                  <div className="space-y-3">
                    <p className="text-sm text-base-content">
                      Tips are available in the Go Daisy iOS app.
                    </p>
                    <a
                      className="btn btn-outline btn-sm"
                      href="https://apps.apple.com/app/id6755695873"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Download on the App Store
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Transparency */}
          <div className="card bg-base-200">
            <div className="card-body">
              <h2 className="card-title text-lg text-base-content">{transparencyHeading}</h2>
              <ul className="list-disc pl-5 space-y-2 text-sm text-base-content">
                <li>{transparencyOptional}</li>
                <li>{transparencyNoGating}</li>
                <li>{transparencyUpdates}</li>
              </ul>
            </div>
          </div>

          {/* FAQ */}
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-base-content">{faqHeading}</h2>

            <div className="collapse collapse-arrow bg-base-200">
              <input type="checkbox" defaultChecked />
              <div className="collapse-title text-base font-medium text-base-content">{faqQ1}</div>
              <div className="collapse-content">
                <p className="text-base-content">{faqA1}</p>
              </div>
            </div>

            <div className="collapse collapse-arrow bg-base-200">
              <input type="checkbox" />
              <div className="collapse-title text-base font-medium text-base-content">{faqQ2}</div>
              <div className="collapse-content">
                <p className="text-base-content">{faqA2}</p>
              </div>
            </div>

            <div className="collapse collapse-arrow bg-base-200">
              <input type="checkbox" />
              <div className="collapse-title text-base font-medium text-base-content">{faqQ3}</div>
              <div className="collapse-content">
                <p className="text-base-content">{faqA3}</p>
              </div>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
}
