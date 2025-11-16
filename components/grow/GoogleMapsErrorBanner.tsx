import React, { useEffect, useState } from 'react';
import { AlertCircle, X, ExternalLink } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Button } from '../ui/button';

interface ExtendedWindow extends Window {
  __googleMapsPermissionError?: boolean;
}

const hasGoogleMapsPermissionError = () => {
  const extendedWindow = window as ExtendedWindow;
  return Boolean(extendedWindow.__googleMapsPermissionError);
};

export function GoogleMapsErrorBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const dismissed = sessionStorage.getItem('googleMapsErrorDismissed');
    if (dismissed) {
      setIsDismissed(true);
      return;
    }

    let errorDetected = false;
    let checkCount = 0;
    const maxChecks = 15;

    const checkInterval = window.setInterval(() => {
      checkCount += 1;

      const hasErrorFlag = hasGoogleMapsPermissionError();
      const errorElements = document.querySelectorAll('div');
      const hasMapError = Array.from(errorElements).some((element) => {
        const text = element.textContent || '';
        return (
          text.includes('RefererNotAllowedMapError') ||
          text.includes('referer-not-allowed-map-error') ||
          text.includes('Your site URL to be authorized')
        );
      });

      if ((hasErrorFlag || hasMapError) && !errorDetected) {
        errorDetected = true;
        setShowBanner(true);
        window.clearInterval(checkInterval);
      }

      if (checkCount >= maxChecks) {
        window.clearInterval(checkInterval);
      }
    }, 1000);

    return () => {
      window.clearInterval(checkInterval);
    };
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    setShowBanner(false);
    sessionStorage.setItem('googleMapsErrorDismissed', 'true');
  };

  const handleOpenConsole = () => {
    alert('Press F12 (Windows/Linux) or Cmd+Option+I (Mac) to open Developer Console and see detailed instructions');
  };

  if (!showBanner || isDismissed) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 p-4 bg-background/95 backdrop-blur-sm border-b shadow-lg">
      <Alert variant="destructive" className="relative">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle className="pr-8">Google Maps Configuration Required</AlertTitle>
        <AlertDescription className="space-y-3">
          <p className="text-sm">Google Maps autocomplete and map features need API configuration.</p>

          <div className="text-sm space-y-1">
            <p className="font-medium">✅ These features work now:</p>
            <ul className="list-disc list-inside pl-2 space-y-0.5 text-xs">
              <li>Current Location (GPS)</li>
              <li>Manual location entry</li>
              <li>Recent locations</li>
              <li>All weather features</li>
            </ul>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <Button size="sm" variant="outline" onClick={handleOpenConsole} className="h-8 text-xs">
              View Setup Instructions
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.open('https://console.cloud.google.com/google/maps-apis/credentials', '_blank')}
              className="h-8 text-xs flex items-center gap-1"
            >
              Open Google Console
              <ExternalLink className="h-3 w-3" />
            </Button>
          </div>

          <p className="text-xs text-muted-foreground pt-1">
            💡 Fix takes 5 minutes • See /CURRENT_ERROR_FIX.md for step-by-step guide
          </p>
        </AlertDescription>

        <Button variant="ghost" size="sm" onClick={handleDismiss} className="absolute top-2 right-2 h-6 w-6 p-0">
          <X className="h-4 w-4" />
        </Button>
      </Alert>
    </div>
  );
}
