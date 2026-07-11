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
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <div className="w-full max-w-xs space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-text-h">{isRegistering ? 'Crear cuenta' : 'Iniciar sesión'}</h1>
          <p className="text-text-light">Accede a tu cuenta de Ahorros Familiares</p>
        </div>
        
        {error && (
          <div className="rounded-lg border border-error/20 bg-error/10 px-4 py-3 text-sm text-error text-error">
            {error}
          </div>
        )}
        
        {message && (
          <div className="rounded-lg border border-success/20 bg-success/10 px-4 py-3 text-sm text-success text-success">
            {message}
          </div>
        )}
        
        <form className="space-y-4" onSubmit={isRegistering ? handleRegisterSubmit : handleLoginSubmit}>
          {isRegistering && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-text-h">Nombre:</label>
              <input 
                type="text" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                required
                className="block w-full rounded-lg border border-input bg-background px-3 py-2 text-text placeholder-text-light/50 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
              />
            </div>
          )}
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-text-h">Email:</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required
              className="block w-full rounded-lg border border-input bg-background px-3 py-2 text-text placeholder-text-light/50 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
            />
          </div>
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-text-h">Contraseña:</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required
              className="block w-full rounded-lg border border-input bg-background px-3 py-2 text-text placeholder-text-light/50 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
            />
          </div>
          
          {isRegistering && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-text-h">Rol:</label>
              <select 
                value={role} 
                onChange={(e) => setRole(e.target.value)}
                className="block w-full rounded-lg border border-input bg-background px-3 py-2 text-text placeholder-text-light/50 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
              >
                <option value="member">Miembro</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          )}
          
          <button 
            type="submit"
            className="w-full rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isRegistering ? 'Crear cuenta' : 'Iniciar sesión'}
          </button>
        </form>
        
        <button 
          onClick={() => setIsRegistering(!isRegistering)}
          className="w-full rounded-lg border border-input px-4 py-2 text-sm font-semibold text-text-h hover:bg-accent/10 hover:text-accent focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 transition-colors"
        >
          {isRegistering ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
        </button>
      </div>
    </div>
  );
}

export default Login;