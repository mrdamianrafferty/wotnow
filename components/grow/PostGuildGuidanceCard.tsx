import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Sprout, Droplets, Eye, X } from 'lucide-react';

interface PostGuildGuidanceCardProps {
  bedName: string;
  plantCount: number;
  guildName: string;
  onDismiss: () => void;
}

export function PostGuildGuidanceCard({
  bedName,
  plantCount,
  guildName,
  onDismiss,
}: PostGuildGuidanceCardProps) {
  const [visible, setVisible] = useState(true);

  // Auto-dismiss after 30 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onDismiss();
    }, 30_000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 p-4">
      <Card className="w-full max-w-md animate-in slide-in-from-bottom-4 duration-300">
        <CardHeader className="pb-3 relative">
          <button
            onClick={() => {
              setVisible(false);
              onDismiss();
            }}
            className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
          <CardTitle className="flex items-center gap-2 text-green-700">
            <Sprout className="h-5 w-5" />
            {bedName} is ready!
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {plantCount} plants from your {guildName} have been planted.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm font-medium text-green-800">Next steps:</p>
          <div className="space-y-2">
            <div className="flex items-start gap-2 text-sm">
              <Sprout className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
              <span>Space plants according to the placement tips in each role group</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <Droplets className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
              <span>Water deeply after planting to help roots settle in</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <Eye className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
              <span>Check weekly for the first month — guilds take time to establish</span>
            </div>
          </div>
          <Button
            onClick={() => {
              setVisible(false);
              onDismiss();
            }}
            className="w-full bg-green-600 hover:bg-green-700 mt-2"
          >
            Got it, let&apos;s grow!
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
