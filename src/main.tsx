import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

const theme = JSON.parse(localStorage.getItem('productivity-dashboard-storage') || '{}')?.state?.themeMode || 'dark';
document.documentElement.className = theme;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)