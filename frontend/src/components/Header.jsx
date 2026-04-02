import { Link } from "react-router-dom";
import VDLogo from '../assets/VD-Logo.png';

function Header() {
    return (
    <div className="Header">
      <header className="py-3 mb-4 border-bottom">
        <div className="text-center mb-3">
          <a href="/" className="d-flex align-items-center justify-content-center link-body-emphasis text-decoration-none">
            <img src={VDLogo} alt="VD Nails Logo" className="logo-image px-4" />
            <h1 className="mt-3 logo-text">VD Nails</h1>
          </a>
        </div>
        <ul className="nav nav-pills justify-content-center full-width-menu">
            <li className="nav-item">
              <Link to="/" className="nav-link">Home</Link>
            </li>
            <li className="nav-item">
              <Link to="/services" className="nav-link">Services</Link>
            </li>
            <li className="nav-item">
              <Link to="/eshop" className="nav-link">E-shop</Link>
            </li>
            <li className="nav-item">
              <Link to="/contact" className="nav-link">Contact Us</Link>
            </li>
        </ul>
      </header>
    </div>
  );
}

export default Header;