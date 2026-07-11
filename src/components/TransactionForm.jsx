import React, { useState, useEffect } from 'react';
import { calculateUserSavings, calculateUserDebt } from '../utils/balanceCalculations';

function TransactionForm({ onAddTransaction, currentUser, allProfiles = [], editingTransaction, onEditTransaction, transactions }) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [type, setType] = useState('deposit'); // deposit, withdrawal, loan_received, loan_given, loan_repayment, loan_repayment_received
  const [selectedUserId, setSelectedUserId] = useState(currentUser.id);
  const [relatedUserId, setRelatedUserId] = useState(''); // New state for related user in loan transactions
  const [error, setError] = useState('');
  const [showLoanSuggestion, setShowLoanSuggestion] = useState(false);

  // Determine if user can select other users (only admin)
  const canSelectOtherUsers = currentUser.role === 'admin';
  const userOptions = canSelectOtherUsers ? allProfiles : [currentUser];
  // Options for related user, excluding the currently selected user for the transaction
  const relatedUserOptions = allProfiles.filter(p => p.id !== selectedUserId);

  // Initialize form with editing transaction data if provided
  useEffect(() => {
    if (editingTransaction) {
      setAmount(Math.abs(editingTransaction.amount).toString());
      setDescription(editingTransaction.description);
      setDate(editingTransaction.created_at ? editingTransaction.created_at.split('T')[0] : new Date().toISOString().split('T')[0]);
      setType(editingTransaction.type || 'deposit'); // Use actual type from editing transaction
      setSelectedUserId(editingTransaction.user_id);
      setRelatedUserId(editingTransaction.related_user_id || '');
    } else {
      // Reset to current user when not editing
      setSelectedUserId(currentUser.id);
      setRelatedUserId('');
      setType('deposit');
      setAmount('');
      setDescription('');
      setDate(new Date().toISOString().split('T')[0]);
      setError('');
    }
  }, [editingTransaction, currentUser.id]);

  // Listen to type and amount changes to suggest loan option
  useEffect(() => {
    if (type === 'withdrawal' && amount) {
      const amountNum = parseFloat(amount);
      const userSavings = calculateUserSavings(selectedUserId, transactions);
      if (!isNaN(amountNum) && amountNum > userSavings) {
        setShowLoanSuggestion(true);
      } else {
        setShowLoanSuggestion(false);
      }
    } else {
      setShowLoanSuggestion(false);
    }
  }, [amount, type, selectedUserId, transactions]);

  // Set description automatically based on type
  useEffect(() => {
    const defaultDescriptions = {
      deposit: 'Ahorro mensual',
      withdrawal: 'Retiro',
      loan_received: 'Préstamo recibido',
      loan_given: 'Préstamo otorgado',
      loan_repayment: 'Pago de préstamo',
      loan_repayment_received: 'Recepción de pago de préstamo',
    };
    if (type && defaultDescriptions[type] && (description === '' || Object.values(defaultDescriptions).includes(description))) {
      setDescription(defaultDescriptions[type]);
    } else if (!type || !defaultDescriptions[type]) {
      setDescription(''); // Clear if type is not a default
    }
  }, [type]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const amountNum = parseFloat(amount);

    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      setError('Por favor ingrese un monto válido');
      return;
    }

    if (!description.trim()) {
      setError('Por favor ingrese una descripción');
      return;
    }

    // Find selected user
    const selectedUser = allProfiles.find(p => p.id === selectedUserId);
    if (!selectedUser) {
      setError('Usuario no válido');
      return;
    }

    // Define isLoanType for use in validation and later
    const isLoanType = ['loan_received', 'loan_given', 'loan_repayment', 'loan_repayment_received'].includes(type);
    if (isLoanType && !relatedUserId) {
      setError('Por favor, seleccione un usuario relacionado para la transacción de préstamo.');
      return;
    }
    const selectedRelatedUser = isLoanType ? allProfiles.find(p => p.id === relatedUserId) : null;
    if (isLoanType && !selectedRelatedUser) {
      setError('Usuario relacionado no válido.');
      return;
    }

    // Calculate user's current savings and debt for validation
    const userCurrentSavings = calculateUserSavings(selectedUserId, transactions);
    const userCurrentDebt = calculateUserDebt(selectedUserId, transactions);

    let transactionsToProcess = [];

    // --- Specific Logic for each Transaction Type ---
    if (type === 'deposit') {
      const finalAmount = amountNum;
      transactionsToProcess.push({
        id: crypto.randomUUID(),
        user_id: selectedUser.id,
        user_name: selectedUser.name,
        amount: finalAmount,
        description: description.trim(),
        type: 'deposit',
        created_at: date
      });
    } else if (type === 'withdrawal') {
      if (amountNum > userCurrentSavings) {
        setError(`Fondos insuficientes. Su ahorro actual es $${userCurrentSavings.toFixed(2)}. No se puede retirar ${amountNum}.`);
        return;
      } else {
        transactionsToProcess.push({
          id: crypto.randomUUID(),
          user_id: selectedUser.id,
          user_name: selectedUser.name,
          amount: -amountNum, // Negative for withdrawal
          description: description.trim(),
          type: 'withdrawal',
          created_at: date
        });
      }
    } else if (type === 'loan_received') {
      // User (selectedUser) receives a loan from relatedUser
      transactionsToProcess.push({
        id: crypto.randomUUID(),
        user_id: selectedUser.id,
        user_name: selectedUser.name,
        amount: amountNum,
        description: description.trim(),
        type: 'loan_received',
        created_at: date,
        related_user_id: selectedRelatedUser.id,
        related_user_name: selectedRelatedUser.name,
        is_paid: false // Loans are initially unpaid
      });
      // Also add a 'loan_given' transaction for the relatedUser
      transactionsToProcess.push({
        id: crypto.randomUUID(),
        user_id: selectedRelatedUser.id,
        user_name: selectedRelatedUser.name,
        amount: -amountNum, // Negative as it's a credit for the lender
        description: `Préstamo otorgado a ${selectedUser.name}`,
        type: 'loan_given',
        created_at: date,
        related_user_id: selectedUser.id,
        related_user_name: selectedUser.name,
        is_paid: false
      });
    } else if (type === 'loan_given') {
      // User (selectedUser) gives a loan to relatedUser
      if (amountNum > userCurrentSavings) {
        setError(`Fondos insuficientes para otorgar el préstamo. Su ahorro actual es $${userCurrentSavings.toFixed(2)}.`);
        return;
      }
      transactionsToProcess.push({
        id: crypto.randomUUID(),
        user_id: selectedUser.id,
        user_name: selectedUser.name,
        amount: -amountNum, // Negative as it's a credit for the lender
        description: description.trim(),
        type: 'loan_given',
        created_at: date,
        related_user_id: selectedRelatedUser.id,
        related_user_name: selectedRelatedUser.name,
        is_paid: false
      });
      // Also add a 'loan_received' transaction for the relatedUser
      transactionsToProcess.push({
        id: crypto.randomUUID(),
        user_id: selectedRelatedUser.id,
        user_name: selectedRelatedUser.name,
        amount: amountNum,
        description: `Préstamo recibido de ${selectedUser.name}`,
        type: 'loan_received',
        created_at: date,
        related_user_id: selectedUser.id,
        related_user_name: selectedUser.name,
        is_paid: false
      });
    } else if (type === 'loan_repayment') {
      // User (selectedUser) pays back a loan to relatedUser
      transactionsToProcess.push({
        id: crypto.randomUUID(),
        user_id: selectedUser.id,
        user_name: selectedUser.name,
        amount: -amountNum, // Negative as it's money leaving to pay
        description: description.trim(),
        type: 'loan_repayment',
        created_at: date,
        related_user_id: selectedRelatedUser.id,
        related_user_name: selectedRelatedUser.name,
        // is_paid: Should be handled by backend or a separate process that checks total repayment vs original loan
      });
      // Also add a 'loan_repayment_received' transaction for the relatedUser
      transactionsToProcess.push({
        id: crypto.randomUUID(),
        user_id: selectedRelatedUser.id,
        user_name: selectedRelatedUser.name,
        amount: amountNum, // Positive as it's money received
        description: `Pago de préstamo recibido de ${selectedUser.name}`,
        type: 'loan_repayment_received',
        created_at: date,
        related_user_id: selectedUser.id,
        related_user_name: selectedUser.name,
        // is_paid: As above
      });
    } else if (type === 'loan_repayment_received') {
      // User (selectedUser) receives a loan repayment from relatedUser
      // This is essentially the same as loan_repayment but from the other perspective.
      // To avoid duplicate logic, we assume 'loan_repayment' is initiated by the debtor.
      // If 'loan_repayment_received' is chosen, it should also create its pair.
      transactionsToProcess.push({
        id: crypto.randomUUID(),
        user_id: selectedUser.id,
        user_name: selectedUser.name,
        amount: amountNum, // Positive as money is received
        description: description.trim(),
        type: 'loan_repayment_received',
        created_at: date,
        related_user_id: selectedRelatedUser.id,
        related_user_name: selectedRelatedUser.name,
      });
      // Also add a 'loan_repayment' transaction for the relatedUser (the one paying)
      transactionsToProcess.push({
        id: crypto.randomUUID(),
        user_id: selectedRelatedUser.id,
        user_name: selectedRelatedUser.name,
        amount: -amountNum, // Negative as money is leaving
        description: `Pago de préstamo a ${selectedUser.name}`,
        type: 'loan_repayment',
        created_at: date,
        related_user_id: selectedUser.id,
        related_user_name: selectedUser.name,
      });
    }

    // Add or edit transactions
    if (editingTransaction) {
      // For editing, we assume only single transactions are edited, not loan groups
      onEditTransaction(transactionsToProcess[0]);
    } else {
      // onAddTransaction now expects an array of transactions, even if it's just one
      onAddTransaction(transactionsToProcess);
    }

    // Reset form
    setAmount('');
    setDescription('');
    setType('deposit');
    setSelectedUserId(currentUser.id);
    setRelatedUserId(''); // Reset related user
    setError('');
    setShowLoanSuggestion(false);
  };

  // Define isLoanType at the component level for both handleSubmit and JSX rendering
  const isLoanType = ['loan_received', 'loan_given', 'loan_repayment', 'loan_repayment_received'].includes(type);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-2xl font-bold text-text-h">
        {editingTransaction ? 'Editar Movimiento' : 'Registrar Movimiento'}
      </h2>
      {error && (
        <div className="rounded-lg border border-error/20 bg-error/10 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      {canSelectOtherUsers && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-text-h">Usuario:</label>
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="block w-full rounded-lg border border-input bg-background px-3 py-2 text-text placeholder-text-light/50 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
          >
            {userOptions.map(user => (
              <option key={user.id} value={user.id}>
                {user.name} ({user.role === 'admin' ? 'Administrador' : 'Miembro'})
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="space-y-2">
        <label className="block text-sm font-medium text-text-h">Tipo:</label>
        <select
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            // Auto-suggest description based on type, but only if description is empty or matches previous suggestion
            const newType = e.target.value;
            const defaultDescriptions = {
              deposit: 'Ahorro mensual',
              withdrawal: 'Retiro',
              loan_received: 'Préstamo recibido',
              loan_given: 'Préstamo otorgado',
              loan_repayment: 'Pago de préstamo',
              loan_repayment_received: 'Recepción de pago de préstamo',
            };
            if (defaultDescriptions[newType] && (description === '' || Object.values(defaultDescriptions).includes(description))) {
              setDescription(defaultDescriptions[newType]);
            } else if (!defaultDescriptions[newType]) {
              setDescription('');
            }
          }}
          className="block w-full rounded-lg border border-input bg-background px-3 py-2 text-text placeholder-text-light/50 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
        >
          <option value="deposit">Depósito (Ahorro)</option>
          <option value="withdrawal">Retiro</option>
          <option value="loan_received">Préstamo Recibido</option>
          <option value="loan_given">Préstamo Otorgado</option>
          <option value="loan_repayment">Pago de Préstamo</option>
          <option value="loan_repayment_received">Recepción de Pago de Préstamo</option>
        </select>
      </div>

      {isLoanType && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-text-h">Usuario Relacionado:</label>
          <select
            value={relatedUserId}
            onChange={(e) => setRelatedUserId(e.target.value)}
            required={isLoanType}
            className="block w-full rounded-lg border border-input bg-background px-3 py-2 text-text placeholder-text-light/50 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
          >
            <option value="">Seleccione</option>
            {relatedUserOptions.map(user => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="space-y-2">
        <label className="block text-sm font-medium text-text-h">Monto ($):</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          min="0.01"
          step="0.01"
          required
          className="block w-full rounded-lg border border-input bg-background px-3 py-2 text-text placeholder-text-light/50 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-text-h">Descripción:</label>
        <select
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          className="block w-full rounded-lg border border-input bg-background px-3 py-2 text-text placeholder-text-light/50 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
        >
          <option value="">Seleccione una descripción</option>
          <option value="Ahorro semanal">Ahorro semanal</option>
          <option value="Ahorro quincenal">Ahorro quincenal</option>
          <option value="Ahorro mensual">Ahorro mensual</option>
          <option value="Extraordinario">Extraordinario</option>
          <option value="Préstamo recibido">Préstamo recibido</option>
          <option value="Préstamo otorgado">Préstamo otorgado</option>
          <option value="Pago de préstamo">Pago de préstamo</option>
          <option value="Recepción de pago de préstamo">Recepción de pago de préstamo</option>
          <option value="Retiro">Retiro</option>
        </select>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-text-h">Fecha:</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          className="block w-full rounded-lg border border-input bg-background px-3 py-2 text-text placeholder-text-light/50 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
        />
      </div>

      <div className="space-y-4">
        <button
          type="submit"
          className="w-full rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {editingTransaction ? 'Guardar Cambios' : 'Registrar Movimiento'}
        </button>
        {!editingTransaction && (
          <button
            type="button"
            onClick={() => {
              setAmount('');
              setDescription('');
              setType('deposit');
              setSelectedUserId(currentUser.id);
              setRelatedUserId('');
              setError('');
              setShowLoanSuggestion(false);
            }}
            className="w-full rounded-lg border border-input px-4 py-2 text-sm font-semibold text-text-h hover:bg-accent/10 hover:text-accent focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 transition-colors"
          >
            Limpiar
          </button>
        )}
      </div>
    </form>
  );
}

export default TransactionForm;