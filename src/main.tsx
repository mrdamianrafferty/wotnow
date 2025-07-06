// src/main.tsx
import React from 'react';
import { createRoot } from 'react-dom/client';

// ← add this so Tailwind (and any other global styles) actually load:
import './index.css';

import App from './App';
import { UserPreferencesProvider } from './context/UserPreferencesContext';

console.log('🎬 main.tsx running');
console.log('Root container:', document.getElementById('root'));

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <UserPreferencesProvider>
      <App />
    </UserPreferencesProvider>
  </React.StrictMode>
);