import React from 'react';
import { Globe, Check } from 'lucide-react';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { getSupportedLanguages } from '../../lib/user/language';
import { useLanguage } from '../../context/LanguageContext';
import { cn } from '../ui/utils';

const LANGUAGE_FLAGS: Record<string, string> = {
  en: '',
  es: '🇪🇸',
  fr: '🇫🇷',
  pt: '🇵🇹',
  de: '🇩🇪',
  it: '🇮🇹',
  nl: '🇳🇱',
  pl: '🇵🇱',
  tr: '🇹🇷',
  sv: '🇸🇪',
};

interface GrowLanguageSelectorProps {
  className?: string;
  buttonVariant?: 'ghost' | 'outline';
}

export function GrowLanguageSelector({ className, buttonVariant = 'ghost' }: GrowLanguageSelectorProps) {
  const { language, setLanguage } = useLanguage();
  const supportedLanguages = React.useMemo(() => getSupportedLanguages(), []);
  const current = supportedLanguages.find(lang => lang.code === language) ?? supportedLanguages[0];

  const renderTriggerIcon = () => {
    if (language === 'en') {
      return <Globe className="h-4 w-4" aria-hidden />;
    }
    return (
      <span className="text-base" aria-hidden>
        {LANGUAGE_FLAGS[language] || '🌐'}
      </span>
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={buttonVariant}
          size="sm"
          className={cn('flex items-center gap-2 px-2 sm:px-3', className)}
        >
          {renderTriggerIcon()}
          <span className="text-xs font-medium uppercase tracking-wide">
            {current?.code ?? 'en'}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[220px]">
        {supportedLanguages.map(lang => (
          <DropdownMenuItem
            key={lang.code}
            onSelect={event => {
              event.preventDefault();
              setLanguage(lang.code);
            }}
            className="flex items-center gap-3"
          >
            {lang.code === 'en' ? (
              <Globe className="h-4 w-4" aria-hidden />
            ) : (
              <span className="text-lg leading-none" aria-hidden>
                {LANGUAGE_FLAGS[lang.code] || '🌐'}
              </span>
            )}
            <div className="flex flex-col items-start">
              <span className="text-sm font-medium">{lang.nativeName}</span>
              <span className="text-xs text-muted-foreground">{lang.name}</span>
            </div>
            {language === lang.code && <Check className="ml-auto h-4 w-4 text-green-600" aria-hidden />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
