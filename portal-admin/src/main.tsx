import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import favicon from "./favicon.png";

const link = document.querySelector<HTMLLinkElement>("link[rel=icon]") || document.head.appendChild(Object.assign(document.createElement("link"), { rel: "icon" }));
link.type = "image/png";
link.href = favicon;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
