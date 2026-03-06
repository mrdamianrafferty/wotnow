import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { GrowLayout } from '../../../components/grow/GrowLayout';
import { getGuidanceForType, getAllGuidanceSlugs } from '../../../lib/grow/alertGuidance';
import { getSignalIcon, getAlertTheme } from '../../../components/grow/LocalSignalsCard';
import { ArrowLeft, BookOpen } from 'lucide-react';
import type { GetStaticPaths, GetStaticProps } from 'next';
import type { AlertGuidance } from '../../../lib/grow/alertGuidance';

interface GuidancePageProps {
  guidance: AlertGuidance;
}

export const getStaticPaths: GetStaticPaths = async () => {
  const slugs = getAllGuidanceSlugs();
  return {
    paths: slugs.map((type) => ({ params: { type } })),
    fallback: false,
  };
};

export const getStaticProps: GetStaticProps<GuidancePageProps> = async ({ params }) => {
  const type = params?.type as string;
  const guidance = getGuidanceForType(type);

  if (!guidance) {
    return { notFound: true };
  }

  return { props: { guidance } };
};

export default function GuidancePage({ guidance }: GuidancePageProps) {
  const router = useRouter();
  const theme = getAlertTheme(guidance.slug);
  const Icon = getSignalIcon(guidance.slug);

  return (
    <>
      <Head>
        <title>{guidance.title} | Grow Daisy</title>
        <meta name="description" content={guidance.subtitle} />
      </Head>
      <GrowLayout title="Guidance">
        <div className="container mx-auto px-4 py-6 max-w-2xl">
          {/* Back link */}
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          {/* Header */}
          <div className={`rounded-xl border border-l-4 ${theme.borderColor} ${theme.bgColor} p-4 mb-6`}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-white/70">
                <Icon className={`h-6 w-6 ${theme.iconColor}`} />
              </div>
              <div>
                <h1 className={`text-xl font-bold ${theme.accentColor}`}>{guidance.title}</h1>
                <p className={`text-sm ${theme.accentColor} opacity-75`}>{guidance.subtitle}</p>
              </div>
            </div>
          </div>

          {/* Sections */}
          <div className="space-y-6">
            {guidance.sections.map((section, i) => (
              <div key={i}>
                <h2 className="text-base font-semibold text-foreground mb-2">
                  {section.heading}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {section.body}
                </p>
              </div>
            ))}
          </div>

          {/* Related topics */}
          {guidance.relatedTypes.length > 0 && (
            <div className="mt-8 pt-6 border-t">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1">
                <BookOpen className="h-3 w-3" />
                Related guides
              </h3>
              <div className="flex flex-wrap gap-2">
                {guidance.relatedTypes.map((relType) => {
                  const relGuidance = getGuidanceForType(relType);
                  if (!relGuidance) return null;
                  const relTheme = getAlertTheme(relType);
                  const RelIcon = getSignalIcon(relType);
                  return (
                    <Link
                      key={relType}
                      href={`/grow/guidance/${relType}`}
                      className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-l-4 ${relTheme.borderColor} ${relTheme.bgColor} hover:opacity-80 transition-opacity`}
                    >
                      <RelIcon className={`h-4 w-4 ${relTheme.iconColor}`} />
                      <span className={`text-sm font-medium ${relTheme.accentColor}`}>
                        {relGuidance.title}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </GrowLayout>
    </>
  );
}
