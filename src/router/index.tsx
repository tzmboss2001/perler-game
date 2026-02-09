import { createBrowserRouter } from 'react-router-dom';
import HomePage from '@/pages/HomePage';
import GamePage from '@/pages/GamePage';
import ResultPage from '@/pages/ResultPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <HomePage />,
  },
  {
    path: '/game',
    element: <GamePage />,
  },
  {
    path: '/result',
    element: <ResultPage />,
  },
]);
