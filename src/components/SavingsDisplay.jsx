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
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-text-h">Resumen de Ahorros</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <div className="p-4">
            <h3 className="text-sm font-medium text-text-light">Total Ahorrado</h3>
            <p className="mt-2 text-2xl font-bold text-text-h">${totalSavings.toFixed(2)}</p>
          </div>
        </div>
        <div className="card">
          <div className="p-4">
            <h3 className="text-sm font-medium text-text-light">Tu Ahorro</h3>
            <p className="mt-2 text-2xl font-bold text-text-h">${userSavings.toFixed(2)}</p>
          </div>
        </div>
        <div className="card">
          <div className="p-4">
            <h3 className="text-sm font-medium text-text-light">Tu Deuda</h3>
            <p className={`mt-2 text-2xl font-bold ${userDebt > 0 ? 'text-error' : 'text-success'}`}>
              ${userDebt.toFixed(2)}
            </p>
          </div>
        </div>
        <div className="card">
          <div className="p-4">
            <h3 className="text-sm font-medium text-text-light">Miembros</h3>
            <p className="mt-2 text-2xl font-bold text-text-h">{Object.keys(individualSavings).length} personas</p>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="p-4">
          <h3 className="text-lg font-semibold text-text-h mb-4">Últimas Transacciones</h3>
          {recentTransactions.length > 0 ? (
            <ul className="space-y-3">
              {recentTransactions.map(t => (
                <li key={t.id} className="flex items-start space-x-3 p-3 bg-surface/50 rounded-lg border border-border">
                  <div className="flex-shrink-0 h-8 w-8 rounded bg-accent/10 flex items-center justify-center">
                    {t.type === 'deposit' ? '+' : t.type === 'withdrawal' ? '-' : '→'}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex justify-between">
                      <p className="text-sm font-medium text-text-h">{getUserName(t.user_id)}</p>
                      <p className={`text-sm font-mono text-right ${t.type === 'withdrawal' || t.type === 'loan_given' ? 'text-error' : 'text-success'}`}>
                        {t.type === 'withdrawal' || t.type === 'loan_given' ? '-' : ''}${Math.abs(t.amount).toFixed(2)}
                      </p>
                    </div>
                    <p className="text-xs text-text-light line-clamp-1">
                      {t.description} {t.type === 'loan_received' && <span className="text-error font-medium">(Deuda)</span>}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-text-light text-center py-8">No hay transacciones aún</p>
          )}
        </div>
      </div>

      <div className="card">
        <div className="p-4">
          <h3 className="text-lg font-semibold text-text-h mb-4">Evolución del Ahorro Familiar</h3>
          <SavingsChart transactions={transactions} />
        </div>
      </div>
    </div>
  );
}

export default SavingsDisplay;