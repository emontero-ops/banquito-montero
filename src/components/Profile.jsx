import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient'; // Importa supabase

function Profile({ user }) {
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    birthDate: '',
    address: '',
    occupation: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Load user data on mount
  useEffect(() => {
    const fetchProfile = async () => {
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching profile:', error);
          setError('Error al cargar el perfil');
        } else if (data) {
          setProfileData({
            name: data.name || '',
            email: data.email || user.email || '',
            phone: data.phone || '',
            birthDate: data.birthDate || '',
            address: data.address || '',
            occupation: data.occupation || ''
          });
        }
      }
    };
    fetchProfile();
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!user) {
      setError('Usuario no autenticado.');
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update(profileData) // profileData ya tiene el email, name, etc.
        .eq('id', user.id);

      if (error) {
        throw error;
      }

      setSuccess('Perfil actualizado correctamente');
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
      setError(error.message || 'Error al actualizar el perfil');
    }
  };

  return (
    <div className="profile-page">
      <div className="top-navbar">
        <h2>Mi Perfil</h2>
        <div className="nav-links">
          <button onClick={() => navigate(-1)}>← Volver</button>
          <button onClick={() => navigate('/dashboard')}>Dashboard</button>
          <button onClick={() => navigate('/goals')}>Metas</button>
        </div>
      </div>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      <div className="profile-container">
        <div className="profile-header">
          <h2>Información Personal</h2>
        </div>

        <form onSubmit={handleSubmit} className="profile-form">
          <div className="form-row">
            <div className="form-group">
              <label>Nombre completo:</label>
              <input
                type="text"
                value={profileData.name}
                onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                required
              />
            </div>

            <div className="form-group">
              <label>Correo electrónico:</label>
              <input
                type="email"
                value={profileData.email}
                onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Teléfono:</label>
              <input
                type="tel"
                value={profileData.phone}
                onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
              />
            </div>

            <div className="form-group">
              <label>Fecha de nacimiento:</label>
              <input
                type="date"
                value={profileData.birthDate}
                onChange={(e) => setProfileData({...profileData, birthDate: e.target.value})}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Dirección:</label>
              <input
                type="text"
                value={profileData.address}
                onChange={(e) => setProfileData({...profileData, address: e.target.value})}
                required
              />
            </div>

            <div className="form-group">
              <label>Ocupación:</label>
              <input
                type="text"
                value={profileData.occupation}
                onChange={(e) => setProfileData({...profileData, occupation: e.target.value})}
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="submit-btn">
              Guardar Cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Profile;