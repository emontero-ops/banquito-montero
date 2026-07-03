import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

function Login({ onLogin }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('member');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) throw error;

      const user = data.user;
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError || !userProfile) {
        console.warn('Could not fetch user profile, using default role member', profileError);
        onLogin({ ...user, role: 'member' });
      } else {
        onLogin({ ...user, role: userProfile.role, name: userProfile.name });
      }
      navigate('/dashboard');
    } catch (error) {
      console.error('Login failed:', error);
      setError(error.message || 'Error de inicio de sesión');
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: { name: username, role: role },
          emailRedirectTo: 'https://emontero-ops.github.io/test-repo/',
        },
      });

      if (error) throw error;

      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (signInError) {
        setMessage('Registro exitoso. Por favor, intenta iniciar sesión manualmente.');
      } else {
        onLogin({ ...signInData.user, role: role, name: username });
        navigate('/dashboard');
      }
      setIsRegistering(false);
    } catch (error) {
      console.error('Registration failed:', error);
      setError(error.message || 'Error de registro');
    }
  };

  return (
    <div className="login-container">
      <h2>{isRegistering ? 'Registrarse' : 'Iniciar sesión'}</h2>
      {error && <div className="error">{error}</div>}
      {message && <div className="message">{message}</div>}
      <form onSubmit={isRegistering ? handleRegisterSubmit : handleLoginSubmit}>
        {isRegistering && (
          <div>
            <label>Nombre:</label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required />
          </div>
        )}
        <div>
          <label>Email:</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label>Contraseña:</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {isRegistering && (
          <div>
            <label>Rol:</label>
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="member">Miembro</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        )}
        <button type="submit">{isRegistering ? 'Registrarse' : 'Entrar'}</button>
      </form>
      <button className="toggle-button" onClick={() => setIsRegistering(!isRegistering)}>
        {isRegistering ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
      </button>
    </div>
  );
}

export default Login;