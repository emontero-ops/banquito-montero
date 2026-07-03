import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient'; // Importa supabase

function UserProfile({ user, onLogout }) { // Recibe user y onLogout como props
  const [editingName, setEditingName] = useState(false);
  const [userName, setUserName] = useState(user?.user_metadata?.name || user?.email || 'Usuario');
  const [userEmail, setUserEmail] = useState(user?.email || 'usuario@ejemplo.com');
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    JSON.parse(localStorage.getItem('notificationsEnabled') || 'true')
  );
  const [themePreference, setThemePreference] = useState(
    localStorage.getItem('themePreference') || 'light'
  );
  const [error, setError] = useState('');

  useEffect(() => {
    // Sincroniza el nombre y email con el prop user
    setUserName(user?.user_metadata?.name || user?.email || 'Usuario');
    setUserEmail(user?.email || 'usuario@ejemplo.com');
  }, [user]);

  const handleSaveName = async () => {
    if (!user) {
      setError('Usuario no autenticado.');
      return;
    }
    setError('');
    try {
      const { error } = await supabase.auth.updateUser({
        data: { name: userName },
      });

      if (error) throw error;

      setEditingName(false);
      // Supabase maneja el estado de la sesión, no necesitamos localStorage extra
    } catch (error) {
      console.error('Error al actualizar el nombre:', error);
      setError('Error al actualizar el nombre: ' + error.message);
    }
  };

  const handleToggleNotifications = (checked) => {
    setNotificationsEnabled(checked);
    localStorage.setItem('notificationsEnabled', JSON.stringify(checked));
  };

  const handleThemeChange = (e) => {
    setThemePreference(e.target.value);
    localStorage.setItem('themePreference', e.target.value);
    document.documentElement.setAttribute('data-theme', e.target.value);
  };

  return (
    <div className="user-profile-container">
      <div className="profile-header">
        <h2>Mi Perfil</h2>
        <p>Configura tu información y preferencias</p>
      </div>

      <div className="profile-card">
        <div className="profile-info-section">
          <div className="info-row">
            <label>Nombre de usuario:</label>
            {editingName ? (
              <div className="edit-field">
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  autoFocus
                  className="name-input"
                />
                <div className="edit-actions">
                  <button className="save-btn" onClick={handleSaveName}>Guardar</button>
                  <button className="cancel-btn" onClick={() => setEditingName(false)}>Cancelar</button>
                </div>
              </div>
            ) : (
              <div>
                <span className="info-value">{userName}</span>
                <button className="edit-btn" onClick={() => setEditingName(true)}>Editar</button>
              </div>
            )}
          </div>

          <div className="info-row">
            <label>Correo electrónico:</label>
            <span className="info-value">{userEmail}</span>
            <small className="info-hint">(gestionado por Supabase)</small>
          </div>
        </div>
      </div>

      <div className="preferences-card">
        <h3>Preferencias</h3>
        
        <div className="preference-item">
          <label className="preference-label">
            <input
              type="checkbox"
              checked={notificationsEnabled}
              onChange={(e) => handleToggleNotifications(e.target.checked)}
            />
            Recibir notificaciones por transacciones importantes
          </label>
        </div>

        <div className="preference-item">
          <label>Tema de la aplicación:</label>
          <div className="theme-selector">
            <label>
              <input
                type="radio"
                value="light"
                checked={themePreference === 'light'}
                onChange={handleThemeChange}
              />
              Claro
            </label>
            <label>
              <input
                type="radio"
                value="dark"
                checked={themePreference === 'dark'}
                onChange={handleThemeChange}
              />
              Oscuro
            </label>
            <label>
              <input
                type="radio"
                value="auto"
                checked={themePreference === 'auto'}
                onChange={handleThemeChange}
              />
              Automático
            </label>
          </div>
        </div>
      </div>

      <div className="account-actions">
        <button className="logout-btn" onClick={onLogout}>
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}

export default UserProfile;
