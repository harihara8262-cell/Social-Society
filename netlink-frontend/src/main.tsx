import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './App.tsx';
import { NetProvider } from './context/NetContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <NetProvider>
      <App />
    </NetProvider>
  </StrictMode>
);
