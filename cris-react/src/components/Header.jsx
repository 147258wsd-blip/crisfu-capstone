import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const LINKS = [
  { to: "/projects", label: "Work" },
  { to: "/blog", label: "Blog" },
  { to: "/debate", label: "Debate" },
  { to: "/contact", label: "Contact" },
];

export default function Header() {
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const close = () => setOpen(false);

  return (
    <header className={scrolled ? "scrolled" : undefined}>
      <div className="wrap nav">
        <Link className="brand" to="/" onClick={close}>
          <span className="mark">CF</span>
          <span>
            crisfu<span className="dot">.</span>dev
          </span>
        </Link>

        <nav className="nav-links">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} className={({ isActive }) => (isActive ? "active" : undefined)}>
              {l.label}
            </NavLink>
          ))}
          {/* auth-aware entry point: "Sign in" or the signed-in name */}
          <Link className="nav-cta" to={user ? "/admin" : "/login"} title={user ? `Signed in as ${user.email}` : undefined}>
            {user ? user.name : "Sign in"}
          </Link>
        </nav>

        <button
          className="nav-toggle"
          aria-label="Menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "×" : "≡"}
        </button>
      </div>

      <div className={"mobile-menu" + (open ? " open" : "")}>
        {LINKS.map((l) => (
          <NavLink key={l.to} to={l.to} onClick={close}>
            {l.label}
          </NavLink>
        ))}
        <NavLink to={user ? "/admin" : "/login"} onClick={close}>
          {user ? user.name : "Sign in"}
        </NavLink>
      </div>
    </header>
  );
}
