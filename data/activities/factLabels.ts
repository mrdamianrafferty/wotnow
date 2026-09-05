/**
 * FactTile labels, translated.
 *
 * The call shows exactly three facts, derived per sport per day from whichever
 * inputs actually decided the verdict. The values are numbers and units, which
 * need no translation; the LABELS do, and they are the last untranslated strings
 * on the call screen.
 *
 * These are keyed on the condition vocabulary used across `data/activities/*.ts`
 * — the 18 keys that appear in `perfectConditions` / `goodConditions` /
 * `fairConditions` / `poorConditions`. Translate once per key here, never per
 * verdict: a label is a fixed term of art, and sending it through DeepL on every
 * render would be both wasteful and inconsistent.
 *
 * Written by hand, not machine-translated. They are two or three words at 11px
 * in small-caps, where a literal translation reads as a mistake — `gust` is
 * `Böe` in German, not `Windstoß`; `soilMoisture` is `Ground`, not `Soil
 * moisture`, because the tile is 100px wide.
 *
 * NOTE ON DUPLICATE KEYS — the data has two pairs that mean the same thing:
 *   `clouds` / `cloudCover`          (31 and 96 uses)
 *   `airTemperature` / `temperature` (53 and 312 uses)
 * Both members of each pair are mapped here so nothing renders blank, but they
 * should be consolidated in the data. `temperatureMin` (4 uses) may be dead —
 * it has no handler in the scoring path.
 */

import type { SupportedLanguageCode } from '@/lib/i18n/translate';

/** Every condition key used across data/activities. */
export type FactKey =
  | 'temperature'
  | 'airTemperature'
  | 'temperatureMin'
  | 'windSpeed'
  | 'gust'
  | 'windDirection'
  | 'windRelative'
  | 'precipitation'
  | 'humidity'
  | 'cloudCover'
  | 'clouds'
  | 'visibility'
  | 'waveHeight'
  | 'swellPeriod'
  | 'waterTemperature'
  | 'soilMoisture'
  | 'snowDepthCm'
  | 'snowfallRateMmH';

type Row = Record<SupportedLanguageCode, string>;

export const FACT_LABELS: Record<FactKey, Row> = {
  temperature:      { en: 'Temp',       es: 'Temp.',        fr: 'Temp.',        pt: 'Temp.',            de: 'Temp.',        it: 'Temp.',        nl: 'Temp.',      pl: 'Temp.',          sv: 'Temp.',       tr: 'Sıcaklık' },
  airTemperature:   { en: 'Air',        es: 'Aire',         fr: 'Air',          pt: 'Ar',               de: 'Luft',         it: 'Aria',         nl: 'Lucht',      pl: 'Powietrze',      sv: 'Luft',        tr: 'Hava' },
  temperatureMin:   { en: 'Low',        es: 'Mín.',         fr: 'Min.',         pt: 'Mín.',             de: 'Min.',         it: 'Min.',         nl: 'Min.',       pl: 'Min.',           sv: 'Min.',        tr: 'En düşük' },
  windSpeed:        { en: 'Wind',       es: 'Viento',       fr: 'Vent',         pt: 'Vento',            de: 'Wind',         it: 'Vento',        nl: 'Wind',       pl: 'Wiatr',          sv: 'Vind',        tr: 'Rüzgâr' },
  gust:             { en: 'Gust',       es: 'Racha',        fr: 'Rafale',       pt: 'Rajada',           de: 'Böe',          it: 'Raffica',      nl: 'Windstoot',  pl: 'Poryw',          sv: 'Byvind',      tr: 'Ani rüzgâr' },
  windDirection:    { en: 'Direction',  es: 'Dirección',    fr: 'Direction',    pt: 'Direção',          de: 'Richtung',     it: 'Direzione',    nl: 'Richting',   pl: 'Kierunek',       sv: 'Riktning',    tr: 'Yön' },
  windRelative:     { en: 'To shore',   es: 'A la costa',   fr: 'Au rivage',    pt: 'À costa',          de: 'Zur Küste',    it: 'Alla riva',    nl: 'T.o.v. kust', pl: 'Do brzegu',     sv: 'Mot land',    tr: 'Kıyıya göre' },
  precipitation:    { en: 'Rain',       es: 'Lluvia',       fr: 'Pluie',        pt: 'Chuva',            de: 'Regen',        it: 'Pioggia',      nl: 'Regen',      pl: 'Deszcz',         sv: 'Regn',        tr: 'Yağış' },
  humidity:         { en: 'Humidity',   es: 'Humedad',      fr: 'Humidité',     pt: 'Humidade',         de: 'Feuchte',      it: 'Umidità',      nl: 'Vocht',      pl: 'Wilgotność',     sv: 'Fukt',        tr: 'Nem' },
  cloudCover:       { en: 'Cloud',      es: 'Nubes',        fr: 'Nuages',       pt: 'Nuvens',           de: 'Bewölkung',    it: 'Nuvole',       nl: 'Bewolking',  pl: 'Zachmurzenie',   sv: 'Moln',        tr: 'Bulut' },
  clouds:           { en: 'Cloud',      es: 'Nubes',        fr: 'Nuages',       pt: 'Nuvens',           de: 'Bewölkung',    it: 'Nuvole',       nl: 'Bewolking',  pl: 'Zachmurzenie',   sv: 'Moln',        tr: 'Bulut' },
  visibility:       { en: 'Visibility', es: 'Visibilidad',  fr: 'Visibilité',   pt: 'Visibilidade',     de: 'Sicht',        it: 'Visibilità',   nl: 'Zicht',      pl: 'Widoczność',     sv: 'Sikt',        tr: 'Görüş' },
  waveHeight:       { en: 'Swell',      es: 'Oleaje',       fr: 'Houle',        pt: 'Ondulação',        de: 'Welle',        it: 'Onda',         nl: 'Golf',       pl: 'Fala',           sv: 'Våg',         tr: 'Dalga' },
  swellPeriod:      { en: 'Period',     es: 'Periodo',      fr: 'Période',      pt: 'Período',          de: 'Periode',      it: 'Periodo',      nl: 'Periode',    pl: 'Okres',          sv: 'Period',      tr: 'Periyot' },
  waterTemperature: { en: 'Sea',        es: 'Mar',          fr: 'Mer',          pt: 'Mar',              de: 'Wasser',       it: 'Mare',         nl: 'Zee',        pl: 'Woda',           sv: 'Vatten',      tr: 'Deniz' },
  soilMoisture:     { en: 'Ground',     es: 'Suelo',        fr: 'Sol',          pt: 'Solo',             de: 'Boden',        it: 'Terreno',      nl: 'Bodem',      pl: 'Grunt',          sv: 'Mark',        tr: 'Zemin' },
  snowDepthCm:      { en: 'Snow',       es: 'Nieve',        fr: 'Neige',        pt: 'Neve',             de: 'Schnee',       it: 'Neve',         nl: 'Sneeuw',     pl: 'Śnieg',          sv: 'Snö',         tr: 'Kar' },
  snowfallRateMmH:  { en: 'Snowfall',   es: 'Nevada',       fr: 'Chutes',       pt: 'Queda de neve',    de: 'Schneefall',   it: 'Nevicata',     nl: 'Sneeuwval',  pl: 'Opad śniegu',    sv: 'Snöfall',     tr: 'Kar yağışı' },
};

/**
 * The label for a fact, in the reader's language.
 * Falls back to English, then to the key itself, so a new condition key added to
 * data/activities renders something legible rather than nothing.
 */
export function factLabel(key: string, lang: SupportedLanguageCode): string {
  const row = FACT_LABELS[key as FactKey];
  if (!row) return key;
  return row[lang] ?? row.en;
}

/** Facts the call may show but that are not condition keys — derived, not scored. */
export const DERIVED_FACT_LABELS: Record<string, Row> = {
  bestWindow: { en: 'Best',     es: 'Mejor',    fr: 'Idéal',    pt: 'Melhor',   de: 'Beste',    it: 'Meglio',   nl: 'Beste',    pl: 'Najlepiej', sv: 'Bäst',     tr: 'En iyi' },
  nextYes:    { en: 'Next yes', es: 'Próximo',  fr: 'Prochain', pt: 'Próximo',  de: 'Nächster', it: 'Prossimo', nl: 'Volgende', pl: 'Następny',  sv: 'Nästa',    tr: 'Sonraki' },
  lowWater:   { en: 'Low water', es: 'Bajamar', fr: 'Basse mer', pt: 'Baixa-mar', de: 'Niedrigwasser', it: 'Bassa marea', nl: 'Laagwater', pl: 'Odpływ', sv: 'Lågvatten', tr: 'Alçak su' },
  highWater:  { en: 'High water', es: 'Pleamar', fr: 'Pleine mer', pt: 'Preia-mar', de: 'Hochwasser', it: 'Alta marea', nl: 'Hoogwater', pl: 'Przypływ', sv: 'Högvatten', tr: 'Yüksek su' },
};
