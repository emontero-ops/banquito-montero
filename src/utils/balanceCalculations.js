export const calculateUserSavings = (userId, transactions) => {
  if (!transactions) return 0;
  return transactions.reduce((sum, t) => {
    if (t.user_id === userId) {
      if (t.type === 'deposit') {
        return sum + t.amount;
      } else if (t.type === 'withdrawal') {
        return sum + t.amount; // t.amount is negative for withdrawal
      }
    }
    return sum;
  }, 0);
};

export const calculateUserDebt = (userId, transactions) => {
  if (!transactions) return 0;
  let debt = 0;
  transactions.forEach(t => {
    if (t.user_id === userId) {
      if (t.type === 'loan_received') {
        debt += t.amount;
      } else if (t.type === 'loan_repayment') {
        debt += t.amount; // t.amount is negative
      }
    } else if (t.related_user_id === userId) { // If this user is the *lender*
      if (t.type === 'loan_given') {
        debt += t.amount; // t.amount is negative, so it's credit for this user
      } else if (t.type === 'loan_repayment_received') {
        debt += t.amount; // t.amount is positive, so it's a reduction in credit
      }
    }
  });
  return debt;
};
