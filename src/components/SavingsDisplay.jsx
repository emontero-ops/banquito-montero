import React from 'react';
import SavingsChart from './SavingsChart';

function SavingsDisplay({ user, totalSavings, individualSavings, individualDebts = {}, transactions, allProfiles = [] }) {
  const userSavings = individualSavings[user.id] || 0;
  const userDebt = individualDebts[user.id] || 0;
  
  // Get recent transactions (last 5)
  const recentTransactions = [...transactions].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5);

  const getUserName = (userId) => {
    const foundUser = allProfiles.find(p => p.id === userId);
    return foundUser ? foundUser.name : 'Desconocido';
  };

  return (
    <div className="savings-display">
      <h2>Resumen de Ahorros</h2>
      
      <div className="metrics">
        <div className="metric-card">
          <h3>Total Ahorrado</h3>
          <p>${totalSavings.toFixed(2)}</p>
        </div>
        <div className="metric-card">
          <h3>Tu Ahorro</h3>
          <p>${userSavings.toFixed(2)}</p>
        </div>
        <div className="metric-card">
          <h3>Tu Deuda</h3>
          <p style={{ color: userDebt > 0 ? '#e53e3e' : '#38a169', fontWeight: userDebt > 0 ? 'bold' : 'normal' }}>
            ${userDebt.toFixed(2)}
          </p>
        </div>
        <div className="metric-card">
          <h3>Miembros</h3>
          <p>{Object.keys(individualSavings).length} personas</p>
        </div>
      </div>
      
      <div className="recent-transactions">
        <h3>Últimas Transacciones</h3>
        {recentTransactions.length > 0 ? (
          <ul>
            {recentTransactions.map(t => (
              <li key={t.id} className={t.type === 'withdrawal' || t.type === 'loan_given' ? 'withdrawal' : 'deposit'}>
                <strong>{getUserName(t.user_id)}:</strong> 
                <span className="amount">{t.type === 'withdrawal' || t.type === 'loan_given' ? '-' : ''}${Math.abs(t.amount)}</span>
                <span>({new Date(t.created_at).toLocaleDateString()})</span>
                <br />
                <small>{t.description} {t.type === 'loan_received' && <span style={{color: '#e53e3e', fontWeight: 'bold'}}>(Deuda)</span>}</small>
              </li>
            ))}
          </ul>
        ) : (
          <p>No hay transacciones aún</p>
        )}
      </div>
      
      <div className="chart-section">
        <h3>Evolución del Ahorro Familiar</h3>
        <SavingsChart transactions={transactions} />
      </div>
    </div>
  );
}

export default SavingsDisplay;