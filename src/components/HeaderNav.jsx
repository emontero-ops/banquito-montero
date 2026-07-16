import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function HeaderNav({ user, onLogout, onMenuToggle }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleNavigation = (path) => {
    setIsMenuOpen(false); // Close menu on navigation
    navigate(path);
  };

  const handleMenuToggle = () => {
    setIsMenuOpen(!isMenuOpen);
    if (onMenuToggle) {
      onMenuToggle(!isMenuOpen); // Notify parent of new state
    }
  };

  return (
    <>
      {/* Overlay para cerrar el menú al hacer clic fuera */}
      {isMenuOpen && (
        <div className="menu-overlay" onClick={() => setIsMenuOpen(false)}></div>
      )}

      {/* Top Header para el botón de menú en móvil */}
      <div className="top-header">
        <div className="navbar-header">
          <button className="menu-toggle" onClick={handleMenuToggle}>
            {isMenuOpen ? '✕' : '☰'} 
          </button>
          <h2>Banquito Montero</h2>
        </div>
      </div>

      {/* Navbar lateral */}
      <nav className={`navbar ${isMenuOpen ? 'open' : ''}`}>
        <div className="nav-links-container">
          <button onClick={() => handleNavigation('/dashboard')}>Dashboard</button>
          <button onClick={() => handleNavigation('/profile')}>Mi Perfil</button>
          <button onClick={() => handleNavigation('/goals')}>Metas</button>
          {/* Puedes añadir más enlaces aquí si es necesario */}
          <button className="logout-button" onClick={onLogout}>Cerrar sesión</button>
        </div>
      </nav>
    </>
  );
}

export default HeaderNav;
