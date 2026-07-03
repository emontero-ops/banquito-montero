
const fs = require('fs');
const path = require('path');

// Try to read and check the file
try {
  const content = fs.readFileSync(path.join(__dirname, 'src', 'components', 'Dashboard.jsx'), 'utf8');
  console.log('File read successfully');
  console.log('Length:', content.length);
  
  // Check for some key imports
  if (content.includes('import React')) {
    console.log('✓ Has React import');
  } else {
    console.log('✗ Missing React import');
  }
  
  if (content.includes('from \'./components/TransactionForm\'') ||
      content.includes('from "./components/TransactionForm"')) {
    console.log('✓ References TransactionForm');
  } else {
    console.log('✗ May not reference TransactionForm');
  }
  
} catch (e) {
  console.error('Error:', e.message);
}
