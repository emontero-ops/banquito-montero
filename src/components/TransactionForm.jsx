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
    
    // Validate related user for loan types
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
        // To avoid duplicate logic, ensure only one side initiates the pair.
        // For simplicity, let's assume 'loan_repayment' is initiated by the debtor.
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
  
  return (
    <form onSubmit={handleSubmit} className="transaction-form">
      <h3>{editingTransaction ? 'Editar Movimiento' : 'Registrar Movimiento'}</h3>
      {error && <div className="error">{error}</div>}
      
      {canSelectOtherUsers && (
        <div>
          <label>Usuario:</label>
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
          >
            {userOptions.map(user => (
              <option key={user.id} value={user.id}>
                {user.name} ({user.role === 'admin' ? 'Administrador' : 'Miembro'})
              </option>
            ))}
          </select>
        </div>
      )}
      
      <div>
        <label>Tipo:</label>
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
        >
          <option value="deposit">Depósito (Ahorro)</option>
          <option value="withdrawal">Retiro</option>
          <option value="loan_received">Préstamo Recibido</option>
          <option value="loan_given">Préstamo Otorgado</option>
          <option value="loan_repayment">Pago de Préstamo</option>
          <option value="loan_repayment_received">Recepción de Pago de Préstamo</option>
        </select>
      </div>
      
      {isLoanType && ( // Only show related user for loan types
        <div>
          <label>Usuario Relacionado:</label>
          <select
            value={relatedUserId}
            onChange={(e) => setRelatedUserId(e.target.value)}
            required={isLoanType}
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
      
      <div>
        <label>Monto ($):</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          min="0.01"
          step="0.01"
          required
        />
      </div>
      
      <div>
        <label>Descripción:</label>
        <select
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
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
      
      <div>
        <label>Fecha:</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
      </div>
      <button type="submit">
        {editingTransaction ? 'Guardar Cambios' : 'Registrar Movimiento'}
      </button>
      {!editingTransaction && (
        <button type="button" onClick={() => {
          setAmount('');
          setDescription('');
          setType('deposit');
          setSelectedUserId(currentUser.id);
          setRelatedUserId('');
          setError('');
        }}>
          Limpiar
        </button>
      )}
    </form>
  );
}

export default TransactionForm;