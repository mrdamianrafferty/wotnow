/**
 * The few interface strings on the localised species landing page
 * (`/grow/[lang]/species/[slug]`).
 *
 * Static rather than run through `<TranslatedText>`: that follows the visitor's
 * saved language preference, but this page's language comes from the URL, and a
 * first-time visitor (or a crawler) arrives on `/fr/` with an English preference.
 * Reading from the URL's own language keeps the page in one language.
 */
import type { GrowPathCode } from './i18n';

export interface LocalisedPageStrings {
  grow: string;
  plants: string;
  relatedPlants: string;
  viewFullGuide: string;
}

const STRINGS: Record<GrowPathCode, LocalisedPageStrings> = {
  en: { grow: 'Grow', plants: 'Plants', relatedPlants: 'Related plants', viewFullGuide: 'View full growing guide →' },
  fr: { grow: 'Jardin', plants: 'Plantes', relatedPlants: 'Plantes similaires', viewFullGuide: 'Voir le guide de culture complet →' },
  es: { grow: 'Jardín', plants: 'Plantas', relatedPlants: 'Plantas relacionadas', viewFullGuide: 'Ver la guía de cultivo completa →' },
  de: { grow: 'Garten', plants: 'Pflanzen', relatedPlants: 'Ähnliche Pflanzen', viewFullGuide: 'Vollständige Anbauanleitung ansehen →' },
  it: { grow: 'Giardino', plants: 'Piante', relatedPlants: 'Piante correlate', viewFullGuide: 'Vedi la guida completa alla coltivazione →' },
  pt: { grow: 'Jardim', plants: 'Plantas', relatedPlants: 'Plantas relacionadas', viewFullGuide: 'Ver o guia de cultivo completo →' },
  nl: { grow: 'Tuin', plants: 'Planten', relatedPlants: 'Verwante planten', viewFullGuide: 'Bekijk de volledige kweekgids →' },
  pl: { grow: 'Ogród', plants: 'Rośliny', relatedPlants: 'Podobne rośliny', viewFullGuide: 'Zobacz pełny poradnik uprawy →' },
};

export function localisedPageStrings(lang: GrowPathCode): LocalisedPageStrings {
  return STRINGS[lang] ?? STRINGS.en;
}
