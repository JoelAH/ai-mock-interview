import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Hide splash screen once React mounts
function hideSplash() {
  const splash = document.getElementById('splash');
  if (splash) {
    splash.classList.add('hidden');
    setTimeout(() => splash.remove(), 300);
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Hide splash after a short delay to ensure first paint
requestAnimationFrame(() => {
  requestAnimationFrame(hideSplash);
});
