
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { NotificationProvider } from './contexts/NotificationContext.tsx';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Could not find root element");

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <NotificationProvider>
      <App />
    </NotificationProvider>
  </React.StrictMode>
);
