import { createRoot } from 'react-dom/client';
import { App } from './App';

const root = document.getElementById('phone-root');
if (!root) throw new Error('#phone-root not found');
createRoot(root).render(<App />);
