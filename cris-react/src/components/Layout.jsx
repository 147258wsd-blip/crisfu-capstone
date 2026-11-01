import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Background from "./Background";
import Header from "./Header";
import Footer from "./Footer";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    // instant, otherwise the CSS `scroll-behavior:smooth` animates a full-page jump
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);
  return null;
}

export default function Layout() {
  return (
    <>
      <ScrollToTop />
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Background />
      <Header />
      <main id="main" tabIndex={-1}>
        <Outlet />
      </main>
      <Footer />
    </>
  );
}
