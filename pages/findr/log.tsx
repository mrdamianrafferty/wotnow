import React from 'react';
import { Sparkles, Upload } from 'lucide-react';
import { useCatchLogger } from '../../hooks/useCatchLogger';
import { usePendingCatchSync } from '../../utils/usePendingCatchSync';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Camera, Image as ImageIcon, Fish } from 'lucide-react';
import SEO from '../../components/SEO';

/**
 * Streamlined Catch Logging Entry Point
 *
 * 3 simple options:
 * 1. Log with existing photo
 * 2. Take a photo (camera) - commented out for now
 * 3. Log without photo (quickest)
 *
 * Goal: 10-second catch logging from app open to saved catch
 */
export default function CatchLogEntryPage() {
  const router = useRouter();
  // Use the same logCatch as the log flows
  const { logCatch } = useCatchLogger();
  const { pending, syncing, error, lastSync } = usePendingCatchSync(logCatch);

  return (
    <>
      <SEO
        title="Log Your Catch - Findr"
        description="Quick and easy catch logging with smart species detection"
      />

      <div className="min-h-screen bg-base-200">
        {/* Pending upload UI */}
        {pending.length > 0 && (
          <div className="alert alert-info flex items-center gap-2 justify-center mb-4">
            <Upload className="h-5 w-5" />
            <span>
              {syncing
                ? `Uploading ${pending.length} pending catch${pending.length > 1 ? 'es' : ''}...`
                : `${pending.length} catch${pending.length > 1 ? 'es are' : ' is'} pending upload. Will sync when online.`}
            </span>
            {error && <span className="text-error ml-2">{error}</span>}
            {lastSync && !syncing && (
              <span className="ml-2 text-xs text-base-content/60">Last sync: {new Date(lastSync).toLocaleTimeString()}</span>
            )}
          </div>
        )}
        {/* Header */}
        <div className="bg-base-100 border-b border-base-300">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <Link href="/findr" className="btn btn-ghost btn-sm">
                ← Back
              </Link>
              <h1 className="text-xl font-bold">Log Your Catch</h1>
              <div className="w-20"></div> {/* Spacer for centering */}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <div className="space-y-4">

            {/* Option 1: With Photo */}
            <button
              onClick={() => router.push('/findr/log/with-photo')}
              className="w-full card bg-base-100 hover:bg-base-200 transition-all hover:shadow-lg cursor-pointer"
            >
              <div className="card-body">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-primary" />
                  </div>
                  <div className="flex-1 text-left">
                    <h2 className="card-title text-lg">With Photo</h2>
                    <p className="text-sm text-base-content/60">
                      Upload an existing photo from your gallery
                    </p>
                  </div>
                  <div className="text-base-content/40">
                    →
                  </div>
                </div>
              </div>
            </button>

            {/* Option 2: Take Photo (PWA Camera) */}
            <button
              onClick={() => router.push('/findr/log/take-photo')}
              className="w-full card bg-base-100 hover:bg-base-200 transition-all hover:shadow-lg cursor-pointer"
            >
              <div className="card-body">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0 w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center">
                    <Camera className="w-8 h-8 text-secondary" />
                  </div>
                  <div className="flex-1 text-left">
                    <h2 className="card-title text-lg">Take Photo</h2>
                    <p className="text-sm text-base-content/60">
                      Use your camera to capture your catch
                    </p>
                  </div>
                  <div className="text-base-content/40">
                    →
                  </div>
                </div>
              </div>
            </button>

            {/* Option 3: Without Photo (Quickest) */}
            <button
              onClick={() => router.push('/findr/log/quick')}
              className="w-full card bg-primary text-primary-content hover:bg-primary-focus transition-all hover:shadow-lg cursor-pointer"
            >
              <div className="card-body">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0 w-16 h-16 rounded-full bg-primary-content/20 flex items-center justify-center">
                    <Fish className="w-8 h-8 text-primary-content" />
                  </div>
                  <div className="flex-1 text-left">
                    <h2 className="card-title text-lg">Quick Log</h2>
                    <p className="text-sm text-primary-content/80">
                      Fastest option - no photo required
                    </p>
                    <div className="badge badge-sm bg-primary-content/20 text-primary-content border-0 mt-1">
                      Recommended
                    </div>
                  </div>
                  <div className="text-primary-content/60">
                    →
                  </div>
                </div>
              </div>
            </button>

          </div>

          {/* Helper text */}
          <div className="text-center mt-8 text-sm text-base-content/60">
            <p>Quick logging takes less than 10 seconds</p>
          </div>
        </div>
      </div>
    </>
  );
}
