import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { GlobalLoader } from './components/GlobalLoader';
import 'bootstrap/dist/css/bootstrap.min.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import './layout-utilities.css';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GlobalLoader />
    <App />
  </React.StrictMode>
);
