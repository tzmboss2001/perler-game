import { createBrowserRouter } from 'react-router-dom';
import HomePage from '@/pages/HomePage';
import GamePage from '@/pages/GamePage';
import ResultPage from '@/pages/ResultPage';
import GalleryPage from '@/pages/GalleryPage';
import AchievementPage from '@/pages/AchievementPage';
import ChallengePage from '@/pages/ChallengePage';

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
  {
    path: '/gallery',
    element: <GalleryPage />,
  },
  {
    path: '/achievements',
    element: <AchievementPage />,
  },
  {
    path: '/challenge',
    element: <ChallengePage />,
  },
]);
