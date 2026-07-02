import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { registerServiceWorker } from './lib/push';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Registra el Service Worker en segundo plano. Solo deja listo el canal de
// push; NO pide permiso de notificaciones (eso pasa cuando el usuario lo activa
// desde su perfil).
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void registerServiceWorker();
  });
}
