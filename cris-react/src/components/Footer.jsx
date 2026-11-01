import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { USE_MOCK, isFailureForced, setFailureForced } from "../services/api";

export default function Footer() {
  const [failing, setFailing] = useState(false);

  useEffect(() => {
    setFailing(isFailureForced());
  }, []);

  const toggle = () => {
    const next = !failing;
    setFailureForced(next);
    setFailing(next);
  };

  return (
    <footer>
      <div className="wrap foot">
        <div className="l">
          © {new Date().getFullYear()} Cris Fu · Built with a bit of stubbornness
          {/* demo switch: makes every mock request fail so the error state is visible */}
          {USE_MOCK && (
            <button className="mock-switch" onClick={toggle} title="Toggle a failing mock API">
              <i className={failing ? "bad" : "ok"} />
              mock API: {failing ? "failing" : "healthy"}
            </button>
          )}
        </div>
        <div className="links">
          <a href="#">GitHub</a>
          <Link to="/contact">Email</Link>
          <Link to="/blog">RSS</Link>
        </div>
      </div>
    </footer>
  );
}
