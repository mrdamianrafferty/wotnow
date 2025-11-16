import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';

export function TaskDebugPage() {
  return (
    <Card className="border-dashed border-muted-foreground/40 bg-muted/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <span role="img" aria-label="lady beetle">🐞</span>
          Task Diagnostics (Preview)
        </CardTitle>
        <Badge variant="secondary" className="w-fit">Developer Tool</Badge>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <p>
          Task debugging utilities are still being migrated into the new Grow experience. This placeholder
          keeps the information panel stable while we finish wiring the backend inspectors.
        </p>
        <p>
          Until the full toolset lands you can verify task payloads through the Activities tab and monitor
          network requests via your browser DevTools.
        </p>
      </CardContent>
    </Card>
  );
}
