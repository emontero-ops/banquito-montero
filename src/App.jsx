import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient'; 

import Login from './components/Login.jsx';
import Dashboard from './components/Dashboard.jsx';
import Profile from './components/Profile';
import SavingsGoals from './components/SavingsGoals.jsx';

const APP_VERSION = "0.1.0";

function AppContent() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  const loadProfile = async (sessionUser) => {
    if (!sessionUser) return;
    const { data: userProfile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', sessionUser.id)
      .single();

    if (userProfile) {
      setUser({ ...sessionUser, role: userProfile.role, name: userProfile.name });
    } else {
      console.warn('Profile not found, using basic info');
      setUser(sessionUser);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        loadProfile(session.user);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session) loadProfile(session.user);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  const handleLogin = (sessionUser) => {
    setUser(sessionUser);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    navigate('/');
  };

  return (
    <div className="App">
      <div style={{ position: 'fixed', bottom: '10px', right: '10px', fontSize: '12px', color: '#888', zIndex: 9999 }}>
        v{APP_VERSION}
      </div>
      <Routes>
        <Route path="/" element={<Login onLogin={handleLogin} />} />
        <Route
          path="/dashboard"
          element={user ? (
            <Dashboard user={user} onLogout={handleLogout} />
          ) : (
            <Login onLogin={handleLogin} />
          )}
        />
        <Route
          path="/profile"
          element={user ? (
            <Profile user={user} onLogout={handleLogout} />
          ) : (
            <Login onLogin={handleLogin} />
          )}
        />
        <Route
          path="/goals"
          element={user ? (
            <SavingsGoals user={user} onLogout={handleLogout} />
          ) : (
            <Login onLogin={handleLogin} />
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
