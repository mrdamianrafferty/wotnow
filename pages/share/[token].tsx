import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useState } from 'react';
import {
  Calendar,
  MapPin,
  Fish,
  Sprout,
  Sun,
  Clock,
  ExternalLink,
  Share2,
  AlertTriangle,
} from 'lucide-react';
import {
  decodeShareToken,
  isTokenExpired,
  getExpiryMessage,
  getShareTitle,
  getShareDescription,
  getAppColor,
  getAppName,
  getAppUrl,
  type ShareData,
  type ShareApp,
} from '../../lib/share/shareToken';

interface SharePageProps {
  data: ShareData | null;
  error?: string;
}

/**
 * Get app-specific icon component
 */
function AppIcon({ app, className }: { app: ShareApp; className?: string }) {
  switch (app) {
    case 'godaisy':
      return <Sun className={className} />;
    case 'findr':
      return <Fish className={className} />;
    case 'growdaisy':
      return <Sprout className={className} />;
    default:
      return <Sun className={className} />;
  }
}

/**
 * Get CTA button text based on app
 */
function getCtaText(app: ShareApp): string {
  switch (app) {
    case 'godaisy':
      return 'Open in Go Daisy';
    case 'findr':
      return 'Open in Fish Findr';
    case 'growdaisy':
      return 'Open in Grow Daisy';
    default:
      return 'Open App';
  }
}

/**
 * Get the deep link path for the app
 */
function getDeepLinkPath(data: ShareData): string {
  switch (data.app) {
    case 'godaisy':
      return '/';
    case 'findr':
      return `/findr?rectangle=${data.rectangleCode}`;
    case 'growdaisy':
      return '/grow';
    default:
      return '/';
  }
}

export default function SharePage({ data, error }: SharePageProps) {
  const [copied, setCopied] = useState(false);

  // Handle copy to clipboard
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Error state
  if (error || !data) {
    return (
      <>
        <Head>
          <title>Share Link Not Found | Go Daisy</title>
          <meta name="robots" content="noindex" />
        </Head>
        <div className="min-h-screen bg-base-200 flex items-center justify-center p-4">
          <div className="card bg-base-100 shadow-xl max-w-md w-full">
            <div className="card-body text-center">
              <AlertTriangle className="h-12 w-12 text-warning mx-auto mb-4" />
              <h1 className="text-xl font-bold">Link Not Found</h1>
              <p className="text-base-content/70">
                {error || 'This share link is invalid or has expired.'}
              </p>
              <div className="card-actions justify-center mt-4">
                <Link href="/" className="btn btn-primary">
                  Go to Home
                </Link>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Check expiry
  const expired = isTokenExpired(data);
  const expiryMessage = getExpiryMessage(data);
  const title = getShareTitle(data);
  const description = getShareDescription(data);
  const appColor = getAppColor(data.app);
  const appName = getAppName(data.app);
  const appUrl = getAppUrl(data.app);
  const deepLinkPath = getDeepLinkPath(data);

  // Expired state
  if (expired) {
    return (
      <>
        <Head>
          <title>Link Expired | {appName}</title>
          <meta name="robots" content="noindex" />
        </Head>
        <div className="min-h-screen bg-base-200 flex items-center justify-center p-4">
          <div className="card bg-base-100 shadow-xl max-w-md w-full">
            <div className="card-body text-center">
              <Clock className="h-12 w-12 text-warning mx-auto mb-4" />
              <h1 className="text-xl font-bold">Link Expired</h1>
              <p className="text-base-content/70">
                This share link has expired. Share links are valid for 7 days.
              </p>
              <div className="card-actions justify-center mt-4">
                <Link href={deepLinkPath} className="btn btn-primary">
                  Open {appName}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>{title} | {appName}</title>
        <meta name="description" content={description} />

        {/* Open Graph */}
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={typeof window !== 'undefined' ? window.location.href : ''} />
        <meta property="og:site_name" content={appName} />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />

        {/* Theme color */}
        <meta name="theme-color" content={appColor} />
      </Head>

      <div className="min-h-screen bg-base-200 py-8 px-4">
        <div className="max-w-lg mx-auto space-y-6">
          {/* App branding */}
          <div className="flex items-center justify-center gap-2 text-base-content/70">
            <AppIcon app={data.app} className="h-5 w-5" />
            <span className="font-medium">{appName}</span>
          </div>

          {/* Main share card */}
          <div
            className="card bg-base-100 shadow-xl overflow-hidden"
            style={{ borderTop: `4px solid ${appColor}` }}
          >
            <div className="card-body">
              {/* Title */}
              <h1 className="card-title text-xl">{title}</h1>

              {/* Description */}
              <p className="text-base-content/70">{description}</p>

              {/* App-specific details */}
              <div className="bg-base-200 rounded-lg p-4 mt-4 space-y-3">
                {data.app === 'findr' && (
                  <>
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-primary shrink-0" />
                      <span>{data.regionName}</span>
                      <span className="text-base-content/50">({data.rectangleCode})</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-primary shrink-0" />
                      <span>{formatDisplayDate(data.date)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Fish className="h-4 w-4 text-info shrink-0" />
                      <span>{data.speciesName}</span>
                      <span className={`badge badge-sm ${
                        data.confidence >= 80 ? 'badge-success' :
                        data.confidence >= 60 ? 'badge-warning' :
                        'badge-error'
                      }`}>
                        {data.confidence}%
                      </span>
                    </div>
                  </>
                )}

                {data.app === 'godaisy' && (
                  <>
                    {data.location && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-primary shrink-0" />
                        <span>{data.location}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-primary shrink-0" />
                      <span>{formatDisplayDate(data.date)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Sun className="h-4 w-4 text-warning shrink-0" />
                      <span>{data.activityName}</span>
                      <span className={`badge badge-sm ${
                        data.score >= 80 ? 'badge-success' :
                        data.score >= 60 ? 'badge-warning' :
                        'badge-info'
                      }`}>
                        {data.score}%
                      </span>
                    </div>
                  </>
                )}

                {data.app === 'growdaisy' && (
                  <>
                    {data.location && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-primary shrink-0" />
                        <span>{data.location}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm">
                      <Sprout className="h-4 w-4 text-success shrink-0" />
                      <span>{data.taskTitle}</span>
                      <span className={`badge badge-sm ${
                        data.urgency === 'critical' ? 'badge-error' :
                        data.urgency === 'optimal' ? 'badge-warning' :
                        'badge-success'
                      }`}>
                        {data.urgency}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Expiry notice */}
              <p className="text-xs text-base-content/50 mt-2">
                {expiryMessage}
              </p>

              {/* Actions */}
              <div className="card-actions mt-6 flex-col sm:flex-row gap-2">
                <Link
                  href={deepLinkPath}
                  className="btn btn-primary flex-1"
                >
                  <ExternalLink className="h-4 w-4" />
                  {getCtaText(data.app)}
                </Link>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="btn btn-outline flex-1"
                >
                  <Share2 className="h-4 w-4" />
                  {copied ? 'Copied!' : 'Copy link'}
                </button>
              </div>
            </div>
          </div>

          {/* Trust strip */}
          <div className="text-center text-sm text-base-content/50">
            <p>
              Shared via{' '}
              <a
                href={appUrl}
                className="link link-primary"
                target="_blank"
                rel="noopener noreferrer"
              >
                {appName}
              </a>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * Format date for display
 */
function formatDisplayDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    }
    if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    }

    return date.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  } catch {
    return dateString;
  }
}

export const getServerSideProps: GetServerSideProps<SharePageProps> = async ({ params }) => {
  const token = params?.token;

  if (!token || typeof token !== 'string') {
    return {
      props: {
        data: null,
        error: 'Invalid share link',
      },
    };
  }

  const data = decodeShareToken(token);

  if (!data) {
    return {
      props: {
        data: null,
        error: 'Could not decode share link',
      },
    };
  }

  return {
    props: {
      data,
    },
  };
};
