/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import ReactDOM from 'react-dom/client';
import './app/globals.css';
import App from './app/App';
import ErrorBoundary from '@/shared/components/ErrorBoundary';
import { initAppTheme } from '@/shared/lib/theme';
import { SfxProvider } from '@/shared/context/SfxProvider';
import { getManifest } from '@config';
import { disposeAllIntegrations, initAllIntegrations } from '../integrations/registry';

const manifest = getManifest();
document.documentElement.dataset.display = manifest.display?.mode ?? 'mupi';
initAppTheme(manifest.theme);

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    disposeAllIntegrations();
  });
}

void initAllIntegrations(manifest).then(() => {
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <SfxProvider>
          <App />
        </SfxProvider>
      </ErrorBoundary>
    </React.StrictMode>,
  );
});
