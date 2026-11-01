import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, HashRouter } from "react-router-dom";
import App from "./App.jsx";
import "./index.css";

/* Vercel / Netlify get clean URLs via BrowserRouter.
   Double-clicking dist/index.html uses the file: protocol, where
   history routing cannot work — HashRouter keeps that path usable. */
const Router = window.location.protocol === "file:" ? HashRouter : BrowserRouter;

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Router>
      <App />
    </Router>
  </React.StrictMode>
);
