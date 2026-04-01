import React from 'react';
import ReactDOM from 'react-dom/client';
import { AuthProvider } from './context/AuthContext';
import { CityProvider } from './context/CityContext';
import AppRouter from './router/AppRouter';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <CityProvider>
        <AppRouter />
      </CityProvider>
    </AuthProvider>
  </React.StrictMode>
);
