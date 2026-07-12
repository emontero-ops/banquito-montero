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
          emailRedirectTo: 'https://emontero-ops.github.io/banquito-montero/',
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
    <div className="App">
      <div className="login-container">
        <div className="login-header">
          <h2>{isRegistering ? 'Crear cuenta' : 'Iniciar sesión'}</h2>
          <p>Accede a tu cuenta de Ahorros Familiares</p>
        </div>
        
        {error && (
          <div className="error">
            {error}
          </div>
        )}
        
        {message && (
          <div className="success">
            {message}
          </div>
        )}
        
        <form className="login-form" onSubmit={isRegistering ? handleRegisterSubmit : handleLoginSubmit}>
          {isRegistering && (
            <div className="form-group">
              <label htmlFor="username">Nombre:</label>
              <input 
                type="text" 
                id="username"
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                required
                className="form-input"
              />
            </div>
          )}
          
          <div className="form-group">
            <label htmlFor="email">Email:</label>
            <input 
              type="email" 
              id="email"
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required
              className="form-input"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Contraseña:</label>
            <input 
              type="password" 
              id="password"
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required
              className="form-input"
            />
          </div>
          
          <button type="submit" className="btn-primary">
            {isRegistering ? 'Crear cuenta' : 'Iniciar sesión'}
          </button>
        </form>
        
        <button 
          onClick={() => setIsRegistering(!isRegistering)}
          className="btn-secondary"
        >
          {isRegistering ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
        </button>
      </div>
    </div>
  );
}

export default Login;