import React, { useEffect } from 'react';
import AppRouter from './router';
import { ToastProvider } from './components/Toast';
import { useUserStore } from './store/userStore';
import { AUTH_CLEARED_EVENT } from './services/api/authApi';

const App: React.FC = () => {
  const { initUser } = useUserStore();

  useEffect(() => {
    initUser();

    const handleAuthCleared = () => {
      initUser();
    };

    window.addEventListener(AUTH_CLEARED_EVENT, handleAuthCleared);
    return () => {
      window.removeEventListener(AUTH_CLEARED_EVENT, handleAuthCleared);
    };
  }, [initUser]);

  return (
    <ToastProvider>
      <AppRouter />
    </ToastProvider>
  );
};

export default App;
