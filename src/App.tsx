import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from '@/router';
import { useUserStore } from '@/store/userStore';
import AchievementToast from '@/components/AchievementToast';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function App() {
  const initUser = useUserStore((s) => s.initUser);

  useEffect(() => {
    initUser();
  }, [initUser]);

  return (
    <ErrorBoundary>
      <RouterProvider router={router} />
      <AchievementToast />
    </ErrorBoundary>
  );
}
