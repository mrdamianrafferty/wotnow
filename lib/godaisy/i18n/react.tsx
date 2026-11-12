/**
 * The language, for components.
 *
 * `GdLangProvider` is set once per page from the language the SERVER rendered
 * in; `useGdLocale` hands any component under it the locale to read from, and
 * defaults to English where there is no provider (a component rendered alone,
 * in a test).
 *
 * `useGdLang` is the page's half of the rule in `./lang`: it mirrors the
 * person's own setting into the cookie the server reads and, when the server
 * guessed differently (a first visit with no cookie yet, an account setting
 * that arrived late), asks for the page again once.
 *
 * @module lib/godaisy/i18n/react
 */

import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/router';
import { getUserLanguage } from '@/lib/user/language';
import { isLang, writeLangCookie } from './lang';
import { localeOf, tr_ } from './index';
import type { LangCode, Locale, TKey } from './types';

const Ctx = createContext<LangCode>('en');

export function GdLangProvider({ lang, children }: { lang: LangCode; children: ReactNode }) {
  return <Ctx.Provider value={lang}>{children}</Ctx.Provider>;
}

export const useGdLangCode = (): LangCode => useContext(Ctx);

/** The locale, and a `t` that fills its templates. */
export function useGdLocale(): { L: Locale; lang: LangCode; t: (key: TKey, vars?: Record<string, string | number>) => string } {
  const lang = useContext(Ctx);
  const L = localeOf(lang);
  return { L, lang, t: (key, vars) => tr_(L, key, vars) };
}

/** Languages already asked for in this tab, so a browser that refuses cookies cannot loop. */
const asked = new Set<string>();

export function useGdLang(serverLang: LangCode): LangCode {
  const router = useRouter();
  const path = router.asPath;
  useEffect(() => {
    const sync = () => {
      const want = getUserLanguage();
      if (!isLang(want)) return;
      writeLangCookie(want);
      if (want !== serverLang && !asked.has(`${path}|${want}`)) {
        asked.add(`${path}|${want}`);
        void router.replace(path, undefined, { scroll: false });
      }
    };
    sync();
    window.addEventListener('languageChanged', sync);
    return () => window.removeEventListener('languageChanged', sync);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverLang, path]);
  return serverLang;
}
