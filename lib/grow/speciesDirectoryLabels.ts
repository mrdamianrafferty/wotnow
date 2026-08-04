import type { GrowPathCode } from '@/lib/grow/i18n';
import { DEFAULT_DIRECTORY_LABELS, type SpeciesDirectoryLabels } from '@/components/grow/SpeciesDirectoryView';

// Curated (not machine-translated) UI strings for the species directory chrome.
// DeepL mistranslates "Plant" (botanical) as an industrial plant/factory in several
// languages when given no context, so these small, fixed strings are hand-written.
type StaticLabels = {
  heading: string;
  introTemplate: string; // use {count}
  searchPlaceholder: string;
  allCategories: string;
  categoryLabels: Record<string, string>;
  showingTemplate: string; // use {shown} and {total}
  noResults: string;
};

const STATIC_LABELS: Partial<Record<GrowPathCode, StaticLabels>> = {
  fr: {
    heading: 'Répertoire des plantes',
    introTemplate: 'Parcourez {count} plantes — cliquez sur une espèce pour des conseils de culture, le calendrier et l’entretien.',
    searchPlaceholder: 'Rechercher une plante...',
    allCategories: 'Toutes les catégories',
    categoryLabels: {
      tree: 'Arbres',
      vegetable: 'Légumes',
      herb: 'Herbes aromatiques',
      ornamental: 'Plantes ornementales',
      'fruit-tree': 'Arbres fruitiers',
      shrub: 'Arbustes',
      vine: 'Plantes grimpantes',
      fruit: 'Fruits',
    },
    showingTemplate: '{shown} sur {total} plantes',
    noResults: 'Aucune plante ne correspond à votre recherche.',
  },
  es: {
    heading: 'Directorio de plantas',
    introTemplate: 'Explora {count} plantas — toca cualquier especie para consejos de cultivo, calendario y cuidados.',
    searchPlaceholder: 'Buscar plantas...',
    allCategories: 'Todas las categorías',
    categoryLabels: {
      tree: 'Árboles',
      vegetable: 'Hortalizas',
      herb: 'Hierbas aromáticas',
      ornamental: 'Ornamentales',
      'fruit-tree': 'Árboles frutales',
      shrub: 'Arbustos',
      vine: 'Trepadoras',
      fruit: 'Frutas',
    },
    showingTemplate: '{shown} de {total} plantas',
    noResults: 'Ninguna planta coincide con tu búsqueda.',
  },
  de: {
    heading: 'Pflanzenverzeichnis',
    introTemplate: 'Durchstöbere {count} Pflanzen — tippe auf eine Art für Anbautipps, Zeitplan und Pflege.',
    searchPlaceholder: 'Pflanzen suchen...',
    allCategories: 'Alle Kategorien',
    categoryLabels: {
      tree: 'Bäume',
      vegetable: 'Gemüse',
      herb: 'Kräuter',
      ornamental: 'Zierpflanzen',
      'fruit-tree': 'Obstbäume',
      shrub: 'Sträucher',
      vine: 'Kletterpflanzen',
      fruit: 'Obst',
    },
    showingTemplate: '{shown} von {total} Pflanzen',
    noResults: 'Keine Pflanzen entsprechen deiner Suche.',
  },
  it: {
    heading: 'Elenco delle piante',
    introTemplate: 'Sfoglia {count} piante — tocca una specie per consigli di coltivazione, tempistiche e cura.',
    searchPlaceholder: 'Cerca piante...',
    allCategories: 'Tutte le categorie',
    categoryLabels: {
      tree: 'Alberi',
      vegetable: 'Ortaggi',
      herb: 'Erbe aromatiche',
      ornamental: 'Piante ornamentali',
      'fruit-tree': 'Alberi da frutto',
      shrub: 'Arbusti',
      vine: 'Rampicanti',
      fruit: 'Frutta',
    },
    showingTemplate: '{shown} di {total} piante',
    noResults: 'Nessuna pianta corrisponde alla tua ricerca.',
  },
  pt: {
    heading: 'Diretório de plantas',
    introTemplate: 'Explore {count} plantas — toque numa espécie para dicas de cultivo, calendário e cuidados.',
    searchPlaceholder: 'Pesquisar plantas...',
    allCategories: 'Todas as categorias',
    categoryLabels: {
      tree: 'Árvores',
      vegetable: 'Hortícolas',
      herb: 'Ervas aromáticas',
      ornamental: 'Ornamentais',
      'fruit-tree': 'Árvores de fruto',
      shrub: 'Arbustos',
      vine: 'Trepadeiras',
      fruit: 'Frutas',
    },
    showingTemplate: '{shown} de {total} plantas',
    noResults: 'Nenhuma planta corresponde à sua pesquisa.',
  },
  nl: {
    heading: 'Plantenoverzicht',
    introTemplate: 'Blader door {count} planten — tik op een soort voor kweekadvies, planning en verzorging.',
    searchPlaceholder: 'Planten zoeken...',
    allCategories: 'Alle categorieën',
    categoryLabels: {
      tree: 'Bomen',
      vegetable: 'Groenten',
      herb: 'Kruiden',
      ornamental: 'Sierplanten',
      'fruit-tree': 'Fruitbomen',
      shrub: 'Struiken',
      vine: 'Klimplanten',
      fruit: 'Fruit',
    },
    showingTemplate: '{shown} van {total} planten',
    noResults: 'Geen planten komen overeen met je zoekopdracht.',
  },
  pl: {
    heading: 'Katalog roślin',
    introTemplate: 'Przeglądaj {count} roślin — dotknij gatunku, aby zobaczyć porady dotyczące uprawy, harmonogram i pielęgnację.',
    searchPlaceholder: 'Szukaj roślin...',
    allCategories: 'Wszystkie kategorie',
    categoryLabels: {
      tree: 'Drzewa',
      vegetable: 'Warzywa',
      herb: 'Zioła',
      ornamental: 'Rośliny ozdobne',
      'fruit-tree': 'Drzewa owocowe',
      shrub: 'Krzewy',
      vine: 'Pnącza',
      fruit: 'Owoce',
    },
    showingTemplate: '{shown} z {total} roślin',
    noResults: 'Żadna roślina nie pasuje do wyszukiwania.',
  },
};

export function getSpeciesDirectoryLabels(lang: GrowPathCode): SpeciesDirectoryLabels {
  const s = STATIC_LABELS[lang];
  if (!s) return DEFAULT_DIRECTORY_LABELS;

  return {
    heading: s.heading,
    intro: (count: number) => s.introTemplate.replace('{count}', String(count)),
    searchPlaceholder: s.searchPlaceholder,
    allCategories: s.allCategories,
    categoryLabels: s.categoryLabels,
    showing: (shown: number, total: number) => s.showingTemplate.replace('{shown}', String(shown)).replace('{total}', String(total)),
    noResults: s.noResults,
  };
}
