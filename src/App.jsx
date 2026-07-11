import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';

import Login from './components/Login.jsx';
import Dashboard from './components/Dashboard.jsx';
import Profile from './components/Profile';
import SavingsGoals from './components/SavingsGoals.jsx';

function AppContent() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const loadProfile = async (sessionUser) => {
    if (!sessionUser) return null;
    try {
      const fetchPromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', sessionUser.id)
        .single();

      // Wait at most 1500ms for the database response to avoid getting stuck on loading screen
      const response = await Promise.race([
        fetchPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Profile fetch timeout')), 1500))
      ]);

      const { data: userProfile, error } = response;

      if (userProfile) {
        const fullUser = { ...sessionUser, role: userProfile.role, name: userProfile.name };
        setUser(fullUser);
        return fullUser;
      } else {
        console.warn('Profile not found, using basic info');
        setUser(sessionUser);
        return sessionUser;
      }
    } catch (e) {
      console.error('Error loading profile:', e);
      setUser(sessionUser);
      return sessionUser;
    }
  };

  useEffect(() => {
    let active = true;

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth event:', event);
      
      if (!active) return;

      try {
        if (session) {
          await loadProfile(session.user);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Auth handler error:', error);
      } finally {
        if (active) {
          setInitialized(true);
          setLoading(false);
        }
      }
    });

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  if (loading || !initialized) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0d0e12]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#d4af37]"></div>
          <p className="text-sm font-medium tracking-widest text-[#a0a5b5] uppercase">Cargando...</p>
        </div>
      </div>
    );
  }

  const isAuthPage = location.pathname === '/';

  // Protect routes: If not logged in and not on login page, redirect to login
  if (!user && !isAuthPage) {
    return <Navigate to="/" replace />;
  }

  // If logged in and on login page, redirect to dashboard
  if (user && isAuthPage) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    navigate('/', { replace: true });
  };

  return (
    <div className="App">
      <div style={{ position: 'fixed', bottom: '10px', right: '10px', fontSize: '12px', color: '#888', zIndex: 9999 }}>
        v{import.meta.env.VITE_APP_VERSION || '1.5.0'}
      </div>
      <Routes>
        <Route path="/" element={<Login onLogin={(sessionUser) => {
          setUser(sessionUser);
          navigate('/dashboard', { replace: true });
        }} />} />
        <Route
          path="/dashboard"
          element={user ? (
            <Dashboard user={user} onLogout={handleLogout} />
          ) : (
            <Navigate to="/" replace />
          )}
        />
        <Route
          path="/profile"
          element={user ? (
            <Profile user={user} onLogout={handleLogout} />
          ) : (
            <Navigate to="/" replace />
          )}
        />
        <Route
          path="/goals"
          element={user ? (
            <SavingsGoals user={user} onLogout={handleLogout} />
          ) : (
            <Navigate to="/" replace />
          )}
        />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <Router basename={import.meta.env.PROD ? '/test-repo' : ''}>
      <AppContent />
    </Router>
  );
}

export default App;
