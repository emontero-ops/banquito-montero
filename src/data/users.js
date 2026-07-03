
export const profiles = [
  { id: 1, name: 'Madre', role: 'admin', password: 'mom123' },
  { id: 2, name: 'Padre', role: 'member', password: 'dad123' },
  { id: 3, name: 'Hijo 1', role: 'member', password: 'kid1123' },
  { id: 4, name: 'Hijo 2', role: 'member', password: 'kid2123' },
  { id: 5, name: 'Hija 1', role: 'member', password: 'kid3123' },
  { id: 6, name: 'Hija 2', role: 'member', password: 'kid4123' },
];

export const getUserById = (id) => profiles.find(u => u.id === id);
export const validateUser = (name, password) => {
  const user = profiles.find(u => u.name === name && u.password === password);
  return user || null;
};
