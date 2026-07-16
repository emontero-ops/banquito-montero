import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import HeaderNav from './HeaderNav';

function SavingsGoals({ user, onLogout }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  // ... rest of state

    name: '',
    targetAmount: '',
    currentAmount: '',
    targetDate: '',
    category: 'general'
  });
  const [editingGoalId, setEditingGoalId] = useState(null);
  const [error, setError] = useState('');

  const categories = [
    { value: 'general', label: 'General' },
    { value: 'emergency', label: 'Fondo de Emergencia' },
    { value: 'vacation', label: 'Vacaciones' },
    { value: 'education', label: 'Educación' },
    { value: 'home', label: 'Mejoras del Hogar' },
    { value: 'car', label: 'Vehículo' },
    { value: 'investment', label: 'Inversión' }
  ];

  // Load goals from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('savingsGoals');
    if (saved) {
      setGoals(JSON.parse(saved));
    }
  }, []);

  // Save goals to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('savingsGoals', JSON.stringify(goals));
  }, [goals]);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!newGoal.name.trim()) {
      setError('Por favor ingrese un nombre para la meta');
      return;
    }

    const targetAmount = parseFloat(newGoal.targetAmount) || 0;
    if (targetAmount <= 0) {
      setError('Por favor ingrese un monto objetivo válido');
      return;
    }

    if (!newGoal.targetDate) {
      setError('Por favor seleccione una fecha objetivo');
      return;
    }

    const currentAmount = parseFloat(newGoal.currentAmount) || 0;

    const goalData = {
      ...newGoal,
      targetAmount,
      currentAmount,
      id: Date.now(), // Simple ID generation
    };

    if (editingGoalId) {
      const updatedGoals = goals.map(goal =>
        goal.id === editingGoalId ? goalData : goal
      );
      setGoals(updatedGoals);
      setEditingGoalId(null);
    } else {
      setGoals([...goals, goalData]);
    }

    // Reset form
    setNewGoal({
      name: '',
      targetAmount: '',
      currentAmount: '',
      targetDate: '',
      category: 'general'
    });
    setError('');
  };

  const handleEditGoal = (goal) => {
    setEditingGoalId(goal.id);
    setNewGoal({
      name: goal.name,
      targetAmount: goal.targetAmount.toString(),
      currentAmount: goal.currentAmount.toString(),
      targetDate: goal.targetDate,
      category: goal.category
    });
  };

  const handleDeleteGoal = (id) => {
    setGoals(goals.filter(goal => goal.id !== id));
  };

  return (
    <div className={`savings-goals-page ${isMenuOpen ? 'menu-open' : ''}`}>
      <HeaderNav user={user} onLogout={onLogout} onMenuToggle={(isOpen) => setIsMenuOpen(isOpen)} />
      {error && <div className="error">{error}</div>}

      <form onSubmit={handleSubmit} className="goals-form">
        <div className="form-row">
          <div className="form-group">
            <label>Nombre de la Meta:</label>
            <input
              type="text"
              value={newGoal.name}
              onChange={(e) => setNewGoal({...newGoal, name: e.target.value})}
              placeholder="Ej: Fondo de emergencia, viaje a Europa"
              required
            />
          </div>

          <div className="form-group">
            <label>Categoría:</label>
            <select
              value={newGoal.category}
              onChange={(e) => setNewGoal({...newGoal, category: e.target.value})}
            >
              {categories.map(cat => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Monto Objetivo ($):</label>
            <input
              type="number"
              value={newGoal.targetAmount}
              onChange={(e) => setNewGoal({...newGoal, targetAmount: e.target.value})}
              min="0"
              step="0.01"
              required
            />
          </div>

          <div className="form-group">
            <label>Fecha Objetivo:</label>
            <input
              type="date"
              value={newGoal.targetDate}
              onChange={(e) => setNewGoal({...newGoal, targetDate: e.target.value})}
              required
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Monto Actual ($):</label>
            <input
              type="number"
              value={newGoal.currentAmount}
              onChange={(e) => setNewGoal({...newGoal, currentAmount: e.target.value})}
              min="0"
              step="0.01"
            />
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="submit-btn">
            {editingGoalId ? 'Actualizar Meta' : 'Agregar Meta'}
          </button>
          {!editingGoalId && (
            <button type="button" className="clear-btn" onClick={() => {
              setNewGoal({
                name: '',
                targetAmount: '',
                currentAmount: '',
                targetDate: '',
                category: 'general'
              });
              setError('');
            }}>
              Limpiar
            </button>
          )}
        </div>
      </form>

      {goals.length > 0 && (
        <div className="goals-list">
          <h3>Mis Metas</h3>
          <div className="goals-grid">
            {goals.map((goal, index) => {
              const progress = goal.targetAmount > 0 
                ? Math.min((goal.currentAmount / goal.targetAmount) * 100, 100)
                : 0;

              return (
                <div key={goal.id} className="goal-card">
                  <div className="goal-header">
                    <h3>{goal.name}</h3>
                    <span className="goal-category">{goal.category.charAt(0).toUpperCase() + goal.category.slice(1)}</span>
                  </div>

                  <div className="goal-progress">
                    <div className="progress-label">
                      {progress.toFixed(0)}% Completado
                    </div>
                    <div className="progress-bar-container">
                      <div className="progress-bar-bg"></div>
                      <div
                        className="progress-bar-fill"
                        style={{ width: `${progress}%` }}
                      >
                        {progress > 0 && (
                          <span className="progress-text">{progress.toFixed(0)}%</span>
                        )}
                      </div>
                    </div>
                    <div className="progress-details">
                      <span>${goal.currentAmount} de ${goal.targetAmount}</span>
                    </div>
                  </div>

                  <div className="goal-details">
                    <div className="goal-detail">
                      <span>Objetivo:</span>
                      <span>${goal.targetAmount}</span>
                    </div>
                    <div className="goal-detail">
                      <span>Actual:</span>
                      <span>${goal.currentAmount}</span>
                    </div>
                    <div className="goal-detail">
                      <span>Fecha objetivo:</span>
                      <span>{new Date(goal.targetDate).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="goal-actions">
                    <button
                      className="action-btn edit-btn"
                      onClick={() => handleEditGoal(goal)}
                    >
                      Editar
                    </button>
                    <button
                      className="action-btn delete-btn"
                      onClick={() => handleDeleteGoal(goal.id)}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {goals.length === 0 && (
        <div className="empty-state">
          <p>No hay metas de ahorro todavía</p>
          <p className="hint">Establezca su primera meta para comenzar a ahorrar hacia un objetivo específico</p>
        </div>
      )}
    </div>
  );
}

export default SavingsGoals;