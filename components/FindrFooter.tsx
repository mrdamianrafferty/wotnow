// components/FindrFooter.tsx
import Link from 'next/link';
import Image from 'next/image';
import { TranslatedText } from './translation/TranslatedFishCard';

export default function FindrFooter() {
  const year = new Date().getFullYear();

  return (
    <footer data-theme="corporate" className="w-full bg-base-200 text-base-content">
      <div className="footer max-w-7xl mx-auto p-10 grid grid-cols-1 md:grid-cols-3 gap-8">
        <aside className="space-y-2">
          <Image src="/little-daisy.png" alt="findr by Go Daisy" width={40} height={40} style={{ width: 40, height: 40 }} />
          <div className="text-2xl font-bold">findr</div>
          <p className="text-sm text-gray-600">
            <TranslatedText text="by" />{" "}
            <a href="https://godaisy.io" target="_blank" rel="noopener noreferrer" className="hover:underline text-sky-700 font-medium">
              Go Daisy
            </a>
          </p>
        </aside>

        <div className="grid grid-cols-2 gap-6">
          <nav className="grid grid-flow-row gap-2" aria-label="Support links">
            <Link href="/findr/support" className="block text-gray-900 hover:underline hover:text-primary"><TranslatedText text="Support findr" /></Link>
            <Link href="/findr/how-it-works" className="block text-gray-900 hover:underline hover:text-primary"><TranslatedText text="How it works" /></Link>
            <Link href="/findr/about" className="block text-gray-900 hover:underline hover:text-primary"><TranslatedText text="About findr" /></Link>
          </nav>

          <nav className="grid grid-flow-row gap-2" aria-label="Legal links">
            <Link href="/findr/terms" className="block text-gray-900 hover:underline hover:text-primary"><TranslatedText text="Terms of use" /></Link>
            <Link href="/findr/privacy" className="block text-gray-900 hover:underline hover:text-primary"><TranslatedText text="Privacy policy" /></Link>
            <Link href="/findr/cookies" className="block text-gray-900 hover:underline hover:text-primary"><TranslatedText text="Cookie policy" /></Link>
          </nav>
        </div>

        <nav className="md:text-right">
          <p className="text-sm text-gray-600"><TranslatedText text="Find your sole, mate" /></p>
          <p className="text-xs text-gray-500">© {year} Go Daisy. <TranslatedText text="All rights reserved." /></p>
        </nav>
      </div>
    </footer>
  );
}
