// admin_panel/src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
// import './index.css'; // Si tu as un fichier CSS global

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);