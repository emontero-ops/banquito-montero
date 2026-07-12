import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import TransactionForm from './TransactionForm';
import SavingsDisplay from './SavingsDisplay';
import TransactionHistory from './TransactionHistory';
import { supabase } from '../supabaseClient'; // Importa supabase

function Dashboard({ user, onLogout }) {
  const [transactions, setTransactions] = useState([]);
  const [editingTransactionId, setEditingTransactionId] = useState(null);
  const [allProfiles, setAllProfiles] = useState([]); // Nuevo estado para todos los perfiles
  const [isMenuOpen, setIsMenuOpen] = useState(false); // Estado para controlar la visibilidad del menú
  const navigate = useNavigate();

  // Process transaction with automatic debt payment logic
  const processTransactionWithDebtPayment = async (newTransaction, currentProfiles, currentTransactions) => {
    // If it's not a deposit, just return it as-is
    if (newTransaction.type !== 'deposit') {
      return [newTransaction];
    }

    // Find the current user's profile
    const userProfile = currentProfiles.find(p => p.id === newTransaction.user_id);
    if (!userProfile) {
      // If we can't find the profile, just return the transaction as-is
      return [newTransaction];
    }

    // Calculate current savings and debts for this user
    const savings = {};
    const debts = {};

    currentProfiles.forEach(p => {
      savings[p.id] = 0;
      debts[p.id] = 0;
    });

    currentTransactions.forEach(t => {
      const tUserId = t.user_id || t.userId;
      if (!tUserId) return;

      if (t.type === 'deposit') {
        savings[tUserId] = (savings[tUserId] || 0) + t.amount;
      } else if (t.type === 'withdrawal') {
        savings[tUserId] = (savings[tUserId] || 0) - Math.abs(t.amount);
      } else if (t.type === 'loan_received') {
        debts[tUserId] = (debts[tUserId] || 0) + t.amount;
      } else if (t.type === 'loan_given') {
        debts[tUserId] = (debts[tUserId] || 0) - Math.abs(t.amount);
      } else if (t.type === 'loan_repayment') {
        debts[tUserId] = (debts[tUserId] || 0) + t.amount; // t.amount is negative
      } else if (t.type === 'loan_repayment_received') {
        debts[tUserId] = (debts[tUserId] || 0) + t.amount; // t.amount is positive
      }
    });

    const userSavings = savings[newTransaction.user_id] || 0;
    const userDebtRaw = debts[newTransaction.user_id] || 0;
    const userDebt = Math.max(0, userDebtRaw); // Ensure debt is never negative

    // If no debt, just return the deposit as-is
    if (userDebt <= 0) {
      return [newTransaction];
    }

    // If deposit amount is less than or equal to debt, use it all to pay debt
    if (newTransaction.amount <= userDebt) {
      // Create a loan repayment transaction (negative amount)
      const repaymentTransaction = {
        ...newTransaction,
        type: 'loan_repayment',
        amount: -newTransaction.amount, // Negative for repayment
        description: `Pago de préstamo automático (${newTransaction.amount})`
      };
      return [repaymentTransaction];
    }

    // If deposit amount is greater than debt, split it:
    // 1. Pay off the debt completely
    // 2. Put the remainder as a regular deposit (savings)
    const remainder = newTransaction.amount - userDebt;
    
    const transactionsToCreate = [];
    
    // 1. Loan repayment transaction (pay off debt)
    if (userDebt > 0) {
      const repaymentTransaction = {
        ...newTransaction,
        type: 'loan_repayment',
        amount: -userDebt, // Negative for repayment
        description: `Pago de préstamo automático (${userDebt})`
      };
      transactionsToCreate.push(repaymentTransaction);
    }
    
    // 2. Remaining deposit (if any)
    if (remainder > 0) {
      const depositTransaction = {
        ...newTransaction,
        type: 'deposit',
        amount: remainder,
        description: newTransaction.description || `Ahorro (excedente después de pagar deuda: ${remainder})`
      };
      transactionsToCreate.push(depositTransaction);
    }
    
    return transactionsToCreate;
  };

  // Sync profile balances with transactions in Supabase
  const syncProfileBalances = async (currentProfiles, currentTransactions) => {
    const savings = {};
    const debts = {};

    currentProfiles.forEach(p => {
      savings[p.id] = 0;
      debts[p.id] = 0;
    });

    currentTransactions.forEach(t => {
      const tUserId = t.user_id || t.userId;
      if (!tUserId) return;
      
      if (t.type === 'deposit') {
        savings[tUserId] = (savings[tUserId] || 0) + t.amount;
      } else if (t.type === 'withdrawal') {
        savings[tUserId] = (savings[tUserId] || 0) - Math.abs(t.amount); // Ensure withdrawal is subtracted
      } else if (t.type === 'loan_received') {
        debts[tUserId] = (debts[tUserId] || 0) + t.amount;
      } else if (t.type === 'loan_given') {
        debts[tUserId] = (debts[tUserId] || 0) - Math.abs(t.amount); // Ensure deduction is consistent
      } else if (t.type === 'loan_repayment') {
        // Loan repayment decreases debt (negative amount means paying what you owe)
        debts[tUserId] = (debts[tUserId] || 0) + t.amount; // t.amount is negative for repayment
      } else if (t.type === 'loan_repayment_received') {
        // When you receive a loan repayment, your lending/credit decreases
        debts[tUserId] = (debts[tUserId] || 0) - t.amount; // t.amount is positive for repayment received
      }
    });

    for (const p of currentProfiles) {
      const currentSavings = savings[p.id] || 0;
      const currentDebtRaw = debts[p.id] || 0; // This is loan_recibidos - loan_otorgados
      const currentDebt = Math.max(0, currentDebtRaw); // Ensure debt is never negative

      if (p.saldo_ahorrado !== currentSavings || p.deuda_total !== currentDebt) {
        await supabase
          .from('profiles')
          .update({
            saldo_ahorrado: currentSavings,
            deuda_total: currentDebt
          })
          .eq('id', p.id);
      }
    }
  };

  useEffect(() => {
    const initData = async () => {
      if (!user) return;

      // Fetch profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, role, saldo_ahorrado, deuda_total');
      
      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        return;
      }
      setAllProfiles(profilesData);

      // Fetch transactions
      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .select('*');
      
      if (txError) {
        console.error('Error fetching transactions:', txError);
      } else {
        setTransactions(txData);
        // Auto-sync balances on mount
        await syncProfileBalances(profilesData, txData);
        
        // Refresh profiles to get fresh data after potential sync
        const { data: refreshedProfiles } = await supabase
          .from('profiles')
          .select('id, name, role, saldo_ahorrado, deuda_total');
        if (refreshedProfiles) {
          setAllProfiles(refreshedProfiles);
        }
      }
    };

    initData();
  }, [user]);

    // Calculate individual savings and debts
  const individualSavings = {}; // Solo depósitos y retiros
  const individualDebts = {};   // Préstamos recibidos menos préstamos otorgados

  allProfiles.forEach(u => {
    individualSavings[u.id] = 0;
    individualDebts[u.id] = 0;
  });

  transactions.forEach(t => {
    const tUserId = t.user_id || t.userId;
    if (!tUserId) return;
  
    if (t.type === 'deposit') {
      individualSavings[tUserId] = (individualSavings[tUserId] || 0) + t.amount;
    } else if (t.type === 'withdrawal') {
      individualSavings[tUserId] = (individualSavings[tUserId] || 0) + t.amount; // t.amount is negative
    } else if (t.type === 'loan_received') {
      // Loan received increases debt, does not affect net available savings
      individualDebts[tUserId] = (individualDebts[tUserId] || 0) + t.amount;
    } else if (t.type === 'loan_given') {
      // Loan given decreases debt (or increases credit), does not affect net available savings
      individualDebts[tUserId] = (individualDebts[tUserId] || 0) - Math.abs(t.amount); // t.amount is negative
    } else if (t.type === 'loan_repayment') {
      // Loan repayment decreases debt (negative amount)
      individualDebts[tUserId] = (individualDebts[tUserId] || 0) + t.amount; // t.amount is negative
    } else if (t.type === 'loan_repayment_received') {
      // Receiving a loan repayment decreases what others owe you (negative impact on your debt/credit)
      individualDebts[tUserId] = (individualDebts[tUserId] || 0) + t.amount; // t.amount is positive
    }
  });

  // Net available savings per user = individual savings - individual debt
  const netSavingsPerUser = {};
  Object.keys(individualSavings).forEach(id => {
    netSavingsPerUser[id] = (individualSavings[id] || 0) - (individualDebts[id] || 0);
  });

  const totalSavings = Object.values(netSavingsPerUser).reduce((sum, val) => sum + val, 0);

  const handleAddTransaction = async (newTransactions) => {
    console.log("Enviando a Supabase:", newTransactions);
    
    // Ensure we're working with an array
    const transactionsArray = Array.isArray(newTransactions) ? newTransactions : [newTransactions];
    
    // Process each transaction with automatic debt payment logic for deposits
    const allProcessedTransactions = [];
    for (const transaction of transactionsArray) {
      const processedTransactions = await processTransactionWithDebtPayment(transaction, allProfiles, [...transactions, ...allProcessedTransactions]);
      allProcessedTransactions.push(...processedTransactions);
    }

    const { data, error } = await supabase
      .from('transactions')
      .insert(allProcessedTransactions)
      .select();

    if (error) {
      console.error('Error detallado:', error);
      alert('Error al guardar: ' + error.message);
    } else if (data && Array.isArray(data)) {
      console.log("Respuesta de Supabase:", data);
      const updatedTransactions = [...transactions, ...data];
      setTransactions(updatedTransactions);
      await syncProfileBalances(allProfiles, updatedTransactions);
    }
  };

  const handleEditTransaction = async (updatedTransaction) => {
    const { data, error } = await supabase
      .from('transactions')
      .update(updatedTransaction)
      .eq('id', updatedTransaction.id)
      .select();

    if (error) {
      console.error('Error updating transaction:', error);
    } else if (data) {
      const updatedTransactions = transactions.map(t =>
        t.id === updatedTransaction.id ? data[0] : t
      );
      setTransactions(updatedTransactions);
      await syncProfileBalances(allProfiles, updatedTransactions);
      setEditingTransactionId(null);
    }
  };

  const handleDeleteTransaction = async (transactionId) => {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', transactionId);

    if (error) {
      console.error('Error deleting transaction:', error);
    } else {
      const updatedTransactions = transactions.filter(t => t.id !== transactionId);
      setTransactions(updatedTransactions);
      await syncProfileBalances(allProfiles, updatedTransactions);
    }
  };

  const editTransaction = transactions.find(
    t => t.id === editingTransactionId
  );

  return (
    <div className={`dashboard ${isMenuOpen ? 'menu-open' : ''}`}>
      <div className="top-header">
        <div className="navbar-header">
          <button className="menu-toggle" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? '✕' : '☰'} 
          </button>
          <h2>Banquito Montero</h2>
        </div>
      </div>
      <nav className="navbar">
        <div className="nav-links-container">
          <button onClick={onLogout}>Cerrar sesión</button>
          <button onClick={() => navigate('/profile')}>Mi Perfil</button>
          <button onClick={() => navigate('/goals')}>Metas</button>
        </div>
      </nav>

      <main className="main-content">
        <SavingsDisplay
          user={user}
          totalSavings={totalSavings}
          individualSavings={individualSavings}
          individualDebts={individualDebts}
          transactions={transactions}
          allProfiles={allProfiles}
        />

        {user && user.role === 'admin' && (
          <div className="admin-section">
            <h3>Administrar Ahorros</h3>
            <TransactionForm
              onAddTransaction={handleAddTransaction}
              currentUser={user}
              allProfiles={allProfiles} // Pasa allProfiles del estado
              editingTransaction={editTransaction}
              onEditTransaction={handleEditTransaction}
              transactions={transactions}
            />
          </div>
        )}

        <TransactionHistory
          transactions={transactions}
          user={user}
          onEditTransaction={(t) => setEditingTransactionId(t.id)}
          onDeleteTransaction={handleDeleteTransaction}
          allProfiles={allProfiles}
        />
      </main>
    </div>
  );
}

export default Dashboard;