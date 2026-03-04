// pages/support.tsx

import Head from "next/head";
import { useEffect, useState } from "react";
import AppHeader from "../components/AppHeader";
import Footer from "../components/footer";
import { useUIText } from "../hooks/useUIText";
import { GODAISY_TIP_PRODUCTS } from "../lib/godaisy/tipProducts";
import type { TipPackage } from "../lib/grow/revenueCat";
import {
  Heart,
  Coffee,
  Beer,
  Flower2,
  Eye,
  EyeOff,
  Users,
  ShieldCheck,
  HelpCircle,
  ChevronDown,
  Smartphone,
  ExternalLink,
  PartyPopper,
  AlertCircle,
  Loader2,
} from "lucide-react";

// Disable static generation
export async function getServerSideProps() {
  return { props: { theme: "light" } };
}

/** Map product IDs to Lucide icons and accent colours */
const TIP_ICON_MAP: Record<string, { icon: typeof Coffee; accent: string; bg: string }> = {
  godaisy_tip_coffee: { icon: Coffee, accent: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
  godaisy_tip_pint:   { icon: Beer,   accent: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200" },
  godaisy_tip_boost:  { icon: Flower2, accent: "text-pink-700", bg: "bg-pink-50 border-pink-200" },
};

export default function SupportPage() {
  // Platform detection
  const [isIOSNative, setIsIOSNative] = useState(false);
  const [tipPackages, setTipPackages] = useState<TipPackage[]>([]);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [tipError, setTipError] = useState<string | null>(null);
  const [tipSuccess, setTipSuccess] = useState(false);
  const [tipDebug, setTipDebug] = useState('JS:v7 loading...');
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (cancelled) return;
        const native = Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
        setIsIOSNative(native);

        if (!native) {
          setTipDebug('JS:v7 not-native');
          return;
        }

        setTipDebug('JS:v7 fetchTipPackages (StoreKit2 direct)...');
        const { fetchTipPackages } = await import("../lib/grow/revenueCat");

        const fetchResult = await Promise.race([
          fetchTipPackages().then(pkgs => ({ status: 'ok' as const, pkgs })),
          new Promise<{ status: 'timeout' }>(r => setTimeout(() => r({ status: 'timeout' }), 10000)),
        ]);

        if (fetchResult.status === 'timeout') {
          setTipDebug('JS:v7 fetchTipPackages TIMEOUT (10s)');
          return;
        }

        if (cancelled) return;
        const pkgs = fetchResult.pkgs;
        const tipIds = new Set(GODAISY_TIP_PRODUCTS.map((p) => p.id));
        const matched = pkgs.filter((pkg) => tipIds.has(pkg.identifier));
        setTipDebug(
          `JS:v7 done | pkgs:${pkgs.length} matched:${matched.length}`
        );
        setTipPackages(matched);
      } catch (err) {
        setTipDebug(`JS:v7 ERROR: ${err instanceof Error ? err.message : String(err)}`);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleTipPurchase = async (pkg: TipPackage) => {
    try {
      setPurchasingId(pkg.identifier);
      setTipError(null);
      setTipSuccess(false);

      const { purchaseTip } = await import("../lib/grow/revenueCat");
      const purchased = await purchaseTip(pkg.identifier);

      if (purchased) {
        setTipSuccess(true);
      }
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

      <div data-theme="light" className="min-h-screen bg-gray-50">
        <AppHeader onOpenHomeDialog={() => {}} onOpenCoastDialog={() => {}} />

        <main className="max-w-2xl mx-auto px-4 py-8 space-y-8">
          {/* Hero */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-br from-sky-500 to-blue-600 px-6 py-8 text-white">
              <div className="flex items-center gap-3 mb-3">
                <Heart className="h-7 w-7 shrink-0" />
                <h1 className="text-2xl font-bold">{heroHeading}</h1>
              </div>
              <p className="text-blue-100 leading-relaxed text-[15px]">{heroText}</p>
            </div>
            <div className="flex gap-2 px-6 py-3 bg-gray-50 border-t border-gray-100">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-full px-3 py-1">
                <Users className="h-3.5 w-3.5" /> Community-first
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-full px-3 py-1">
                <EyeOff className="h-3.5 w-3.5" /> No paywalls
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-full px-3 py-1">
                <Heart className="h-3.5 w-3.5" /> Indie &amp; friendly
              </span>
            </div>
          </section>

          {/* Support options */}
          <div className={`grid gap-6 ${!isIOSNative ? 'sm:grid-cols-2' : ''}`}>
            {/* Patreon card — web only */}
            {!isIOSNative && (
              <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <ExternalLink className="h-5 w-5 text-orange-600" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900">{patreonHeading}</h2>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed mb-4 flex-1">{patreonText}</p>
                <a
                  className="inline-flex items-center justify-center gap-2 w-full px-4 py-3 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-xl transition-colors"
                  href="https://patreon.com/GoDaisy?utm_medium=unknown&utm_source=join_link&utm_campaign=creatorshare_creator&utm_content=copyLink"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4" />
                  {patreonButton}
                </a>
              </section>
            )}

            {/* Tip Jar card */}
            <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="p-2 bg-pink-100 rounded-lg">
                  <Heart className="h-5 w-5 text-pink-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">{appleTipHeading}</h2>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed mb-4">{appleTipText}</p>

              {/* iOS native: StoreKit IAP buttons */}
              {isIOSNative ? (
                <div className="space-y-3">
                  {tipSuccess && (
                    <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl">
                      <PartyPopper className="h-5 w-5 text-green-600 shrink-0" />
                      <p className="text-sm font-medium text-green-800">
                        Thank you for the tip! You&apos;re a legend.
                      </p>
                    </div>
                  )}
                  {tipError && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                      <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
                      <p className="text-sm text-red-800">{tipError}</p>
                    </div>
                  )}

                  {tipPackages.length > 0 ? (
                    tipPackages.map((pkg) => {
                      const product = GODAISY_TIP_PRODUCTS.find(
                        (p) => p.id === pkg.identifier
                      );
                      const style = TIP_ICON_MAP[pkg.identifier];
                      const Icon = style?.icon ?? Coffee;

                      return (
                        <button
                          key={pkg.identifier}
                          className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all
                            ${style?.bg ?? 'bg-gray-50 border-gray-200'}
                            ${purchasingId ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-md active:scale-[0.98]'}`}
                          disabled={!!purchasingId}
                          onClick={() => handleTipPurchase(pkg)}
                        >
                          <div className={`p-2.5 bg-white rounded-lg shadow-sm ${style?.accent ?? 'text-gray-600'}`}>
                            {purchasingId === pkg.identifier ? (
                              <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                              <Icon className="h-5 w-5" />
                            )}
                          </div>
                          <div className="flex-1 text-left">
                            <div className="font-semibold text-gray-900">
                              {product?.label ?? pkg.title}
                            </div>
                            <div className="text-xs text-gray-500">One-off tip</div>
                          </div>
                          <div className="text-lg font-bold text-gray-900">
                            {pkg.priceString}
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <div className="text-center py-6">
                      <Loader2 className="h-6 w-6 text-gray-400 animate-spin mx-auto mb-2" />
                      <p className="text-sm text-gray-500">Loading tip jar...</p>
                      <button
                        onClick={() => setShowDebug(!showDebug)}
                        className="mt-2 text-xs text-gray-400 underline"
                      >
                        {showDebug ? 'Hide' : 'Show'} debug info
                      </button>
                      {showDebug && (
                        <p className="mt-1 text-xs font-mono text-gray-400">{tipDebug}</p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                /* Web: show message + App Store link */
                <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <Smartphone className="h-5 w-5 text-blue-600 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900">
                      Tips are available in the Go Daisy iOS app.
                    </p>
                    <a
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium underline"
                      href="https://apps.apple.com/app/id6755695873"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Download on the App Store
                    </a>
                  </div>
                </div>
              )}
            </section>
          </div>

          {/* Transparency */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">{transparencyHeading}</h2>
            </div>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <Eye className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                <span className="text-sm text-gray-700 leading-relaxed">{transparencyOptional}</span>
              </li>
              <li className="flex items-start gap-3">
                <Eye className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                <span className="text-sm text-gray-700 leading-relaxed">{transparencyNoGating}</span>
              </li>
              <li className="flex items-start gap-3">
                <Eye className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                <span className="text-sm text-gray-700 leading-relaxed">{transparencyUpdates}</span>
              </li>
            </ul>
          </section>

          {/* FAQ */}
          <section>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="p-2 bg-violet-100 rounded-lg">
                <HelpCircle className="h-5 w-5 text-violet-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">{faqHeading}</h2>
            </div>

            <div className="space-y-2">
              {[
                { q: faqQ1, a: faqA1, open: true },
                { q: faqQ2, a: faqA2, open: false },
                { q: faqQ3, a: faqA3, open: false },
              ].map((faq, i) => (
                <details
                  key={i}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm group"
                  open={faq.open || undefined}
                >
                  <summary className="flex items-center justify-between px-5 py-4 cursor-pointer list-none select-none">
                    <span className="text-sm font-medium text-gray-900 pr-4">{faq.q}</span>
                    <ChevronDown className="h-4 w-4 text-gray-400 shrink-0 transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="px-5 pb-4">
                    <p className="text-sm text-gray-600 leading-relaxed">{faq.a}</p>
                  </div>
                </details>
              ))}
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
}
