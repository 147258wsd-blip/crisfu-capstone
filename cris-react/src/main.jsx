import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, HashRouter } from "react-router-dom";
import App from "./App.jsx";
import "./index.css";

/* Vercel / Netlify / GitHub Pages get clean URLs via BrowserRouter.
   Double-clicking dist/index.html uses the file: protocol, where
   history routing cannot work — HashRouter keeps that path usable. */
const Router = window.location.protocol === "file:" ? HashRouter : BrowserRouter;

/* When the site is hosted under a sub-path (GitHub Pages project sites live at
   /<repo>/), Vite injects that prefix into import.meta.env.BASE_URL. React
   Router needs the same prefix, minus the trailing slash, or every route
   resolves one level too high and lands on the 404 page. */
const base = import.meta.env.BASE_URL.replace(/\/+$/, "") || "/";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Router basename={base === "/" ? undefined : base}>
      <App />
    </Router>
  </React.StrictMode>
);
