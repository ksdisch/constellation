import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

const root = document.getElementById('phone-root');
if (!root) throw new Error('#phone-root not found');
// StrictMode stays ON (F-54): it double-invokes updaters/effects in dev, which
// is exactly what catches side effects smuggled into setState updaters (F-22).
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
);
