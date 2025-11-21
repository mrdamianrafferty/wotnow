import React, { useState, useEffect, useCallback } from 'react';
import { Search, X, Filter, Globe, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  searchPlants,
  getPlantsByCategory,
  getPlantCategories,
  getAllNames,
  SUPPORTED_LANGUAGES,
  getCategoryLabel,
  getCategoryIcon,
  type PlantSearchResult,
  type PlantCategory,
  type SupportedLanguage,
} from '../../lib/grow/plantSearch';
import { useLanguage } from '../../context/LanguageContext';

interface PlantSearchDialogProps {
  open: boolean;
  onClose: () => void;
  onSelectPlant: (plant: PlantSearchResult) => void;
  title?: string;
  description?: string;
}

export function PlantSearchDialog({
  open,
  onClose,
  onSelectPlant,
  title = 'Add a Plant',
  description = 'Search for a plant to add to your garden',
}: PlantSearchDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PlantSearchResult[]>([]);
  const [categories, setCategories] = useState<PlantCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categoryPlants, setCategoryPlants] = useState<PlantSearchResult[]>([]);
  const [userLang, setUserLang] = useState<SupportedLanguage>('en');
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<'search' | 'browse'>('search');
  const { language: globalLanguage, setLanguage: setGlobalLanguage } = useLanguage();

  const loadCategories = useCallback(async () => {
    try {
      const cats = await getPlantCategories();
      setCategories(cats);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  }, []);

  const performSearch = useCallback(
    async (query: string) => {
      setIsSearching(true);
      try {
        const results = await searchPlants(query, {
          userLang,
          limit: 30,
        });
        setSearchResults(results);
      } catch (error) {
        console.error('Search failed:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    [userLang],
  );

  const loadCategoryPlants = useCallback(
    async (category: string) => {
      setIsSearching(true);
      try {
        const plants = await getPlantsByCategory(category, userLang);
        setCategoryPlants(plants);
      } catch (error) {
        console.error('Failed to load category plants:', error);
        setCategoryPlants([]);
      } finally {
        setIsSearching(false);
      }
    },
    [userLang],
  );

  useEffect(() => {
    if (globalLanguage in SUPPORTED_LANGUAGES) {
      setUserLang(globalLanguage as SupportedLanguage);
    } else if (userLang !== 'en') {
      setUserLang('en');
    }
  }, [globalLanguage, userLang]);

  useEffect(() => {
    if (open) {
      void loadCategories();
    }
  }, [open, loadCategories]);

  useEffect(() => {
    if (searchQuery.trim().length === 0) {
      setSearchResults([]);
      return;
    }

    const timer = window.setTimeout(() => {
      void performSearch(searchQuery);
    }, 300);

    return () => {
      window.clearTimeout(timer);
    };
  }, [searchQuery, userLang, performSearch]);

  useEffect(() => {
    if (activeTab === 'browse' && selectedCategory) {
      void loadCategoryPlants(selectedCategory);
    }
  }, [selectedCategory, activeTab, userLang, loadCategoryPlants]);

  const handleLanguageChange = (lang: string) => {
    const newLang = lang as SupportedLanguage;
    setUserLang(newLang);
    setGlobalLanguage(newLang);
  };

  const handleSelectPlant = (plant: PlantSearchResult) => {
    onSelectPlant(plant);
    onClose();
    setSearchQuery('');
    setSearchResults([]);
    setSelectedCategory(null);
  };

  const handleClose = () => {
    onClose();
    setSearchQuery('');
    setSearchResults([]);
    setSelectedCategory(null);
    setActiveTab('search');
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>{title}</DialogTitle>
              {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
            </div>

            <Select value={userLang} onValueChange={handleLanguageChange}>
              <SelectTrigger className="w-[140px]">
                <Globe className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => (
                  <SelectItem key={code} value={code}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'search' | 'browse')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="search">
              <Search className="w-4 h-4 mr-2" />
              Search
            </TabsTrigger>
            <TabsTrigger value="browse">
              <Filter className="w-4 h-4 mr-2" />
              Browse
            </TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                value={searchQuery}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(event.target.value)}
                placeholder="Search plants... (e.g., &quot;tomato&quot;, &quot;eggplant&quot;, &quot;cilantro&quot;)"
                className="pl-10 pr-10"
                autoFocus
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            <ScrollArea className="h-[400px]">
              {isSearching ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
                </div>
              ) : searchQuery.trim().length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>Start typing to search...</p>
                  <p className="text-sm mt-2">Search works in {SUPPORTED_LANGUAGES[userLang]}</p>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p>
                    No plants found for <span className="font-medium">{searchQuery}</span>
                  </p>
                  <p className="text-sm mt-2">Try a different search term</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {searchResults.map((plant) => (
                    <PlantResultCard key={plant.slug} plant={plant} onSelect={handleSelectPlant} />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="browse" className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              {categories.map((category) => (
                <button
                  type="button"
                  key={category.category}
                  onClick={() => setSelectedCategory(category.category)}
                  className={`
                    p-3 rounded-lg border-2 transition-all text-center
                    ${
                      selectedCategory === category.category
                        ? 'border-green-600 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }
                  `}
                >
                  <div className="text-2xl mb-1">{getCategoryIcon(category.category)}</div>
                  <div className="text-sm font-medium">{getCategoryLabel(category.category)}</div>
                  <div className="text-xs text-gray-500 mt-1">{category.plant_count} plants</div>
                </button>
              ))}
            </div>

            {selectedCategory && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium">
                    {getCategoryIcon(selectedCategory)} {getCategoryLabel(selectedCategory)}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setSelectedCategory(null)}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Clear
                  </button>
                </div>

                <ScrollArea className="h-[300px]">
                  {isSearching ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
                    </div>
                  ) : categoryPlants.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <p>No plants in this category</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {categoryPlants.map((plant) => (
                        <PlantResultCard key={plant.slug} plant={plant} onSelect={handleSelectPlant} />
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

interface PlantResultCardProps {
  plant: PlantSearchResult;
  onSelect: (plant: PlantSearchResult) => void;
}

function PlantResultCard({ plant, onSelect }: PlantResultCardProps) {
  const displayName = plant.display_name;
  const allNames = getAllNames(plant);
  const otherNames = allNames.filter((name) => name !== displayName);

  return (
    <button
      type="button"
      onClick={() => onSelect(plant)}
      className="w-full p-4 rounded-lg border border-gray-200 hover:border-green-600 hover:bg-green-50 transition-all text-left group"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-gray-900 group-hover:text-green-700">{displayName}</h4>
            {plant.category && (
              <Badge variant="secondary" className="text-xs">
                {getCategoryIcon(plant.category)} {getCategoryLabel(plant.category)}
              </Badge>
            )}
          </div>

          {plant.scientific_name && (
            <p className="text-sm text-gray-500 italic mt-1">{plant.scientific_name}</p>
          )}

          {otherNames.length > 0 && (
            <p className="text-xs text-gray-400 mt-2">
              Also: {otherNames.slice(0, 3).join(', ')}
              {otherNames.length > 3 ? ` +${otherNames.length - 3} more` : ''}
            </p>
          )}

          {plant.match_type === 'exact' && (
            <div className="mt-2">
              <Badge variant="default" className="text-xs bg-green-600">
                Exact match
              </Badge>
            </div>
          )}
        </div>

        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-green-600 flex-shrink-0" />
      </div>
    </button>
  );
}
