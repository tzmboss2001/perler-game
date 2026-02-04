import React from 'react';
import AppRouter from './router';
import OnboardingGuide from './components/OnboardingGuide';
import { ToastProvider } from './components/Toast';

const App: React.FC = () => {
  return (
    <ToastProvider>
      <AppRouter />
      <OnboardingGuide />
    </ToastProvider>
  );
};

export default App;
