import { createContext, useContext, useState, useCallback } from 'react';
import EmergencyModal from '../components/EmergencyModal.jsx';

const EmergencyContext = createContext(null);

export function EmergencyProvider({ children }) {
  const [open, setOpen] = useState(false);

  const openEmergency = useCallback(() => setOpen(true), []);
  const closeEmergency = useCallback(() => setOpen(false), []);

  return (
    <EmergencyContext.Provider value={{ open, openEmergency, closeEmergency }}>
      {children}
      <EmergencyModal open={open} onClose={closeEmergency} />
    </EmergencyContext.Provider>
  );
}

export function useEmergency() {
  const ctx = useContext(EmergencyContext);
  if (!ctx) throw new Error('useEmergency must be used within EmergencyProvider');
  return ctx;
}