import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Lazy load components
const MobileLayout = lazy(() => import('../pages/mobile/MobileLayout'));
const HomePage = lazy(() => import('../pages/mobile/HomePage'));
const CreatePage = lazy(() => import('../pages/mobile/CreatePage'));
const EditorPage = lazy(() => import('../pages/mobile/EditorPage'));
const MakingPage = lazy(() => import('../pages/mobile/MakingPage'));
const ProfilePage = lazy(() => import('../pages/mobile/ProfilePage'));
const LoginPage = lazy(() => import('../pages/mobile/LoginPage'));
const SettingsPage = lazy(() => import('../pages/mobile/SettingsPage'));
const HelpPage = lazy(() => import('../pages/mobile/HelpPage'));
const AboutPage = lazy(() => import('../pages/mobile/AboutPage'));
const PrivacyPolicyPage = lazy(() => import('../pages/mobile/PrivacyPolicyPage'));
const UserAgreementPage = lazy(() => import('../pages/mobile/UserAgreementPage'));
const FeedbackPage = lazy(() => import('../pages/mobile/FeedbackPage'));
const TemplateDetailPage = lazy(() => import('../pages/mobile/TemplateDetailPage'));
const CommunityPage = lazy(() => import('../pages/mobile/CommunityPage'));
const CommunityDetailPage = lazy(() => import('../pages/mobile/CommunityDetailPage'));

// 3D功能页面
const Home3DPage = lazy(() => import('../pages/mobile/3d/Home3DPage'));
const Upload3DPage = lazy(() => import('../pages/mobile/3d/Upload3DPage'));
const Preview3DPage = lazy(() => import('../pages/mobile/3d/Preview3DPage'));
const TemplateTestPage = lazy(() => import('../pages/mobile/3d/TemplateTestPage'));
const TemplateFlowPage = lazy(() => import('../pages/mobile/3d/TemplateFlowPage'));
const DepthTo3DPage = lazy(() => import('../pages/mobile/3d/DepthTo3DPage'));
const ModelTo3DPage = lazy(() => import('../pages/mobile/3d/ModelTo3DPage'));

// Loading fallback component
const LoadingFallback: React.FC = () => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: '#050816',
      color: 'rgba(255, 255, 255, 0.85)',
    }}
  >
    <div
      style={{
        width: '32px',
        height: '32px',
        border: '3px solid rgba(255, 255, 255, 0.1)',
        borderTopColor: '#00d9ff',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }}
    />
    <style>{`
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);

// Main router component
const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          {/* Root: 重定向到 mobile */}
          <Route path="/" element={<Navigate to="/mobile" replace />} />

          {/* Mobile H5 routes */}
          <Route path="/mobile" element={<MobileLayout />}>
            <Route index element={<Navigate to="/mobile/home" replace />} />
            <Route path="home" element={<HomePage />} />
            <Route path="create" element={<CreatePage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>

          {/* Editor page (独立页面，不带底部导航) */}
          <Route path="/mobile/editor" element={<EditorPage />} />

          {/* Making page (制作辅助模式，独立页面) */}
          <Route path="/mobile/making" element={<MakingPage />} />

          {/* Login page (登录/注册页面) */}
          <Route path="/mobile/login" element={<LoginPage />} />

          {/* Settings page (设置页面) */}
          <Route path="/mobile/settings" element={<SettingsPage />} />

          {/* Help page (帮助页面) */}
          <Route path="/mobile/help" element={<HelpPage />} />

          {/* About page (关于页面) */}
          <Route path="/mobile/about" element={<AboutPage />} />

          {/* Privacy Policy page (隐私政策页面) */}
          <Route path="/mobile/privacy-policy" element={<PrivacyPolicyPage />} />

          {/* User Agreement page (用户协议页面) */}
          <Route path="/mobile/user-agreement" element={<UserAgreementPage />} />

          {/* Feedback page (意见反馈页面) */}
          <Route path="/mobile/feedback" element={<FeedbackPage />} />

          {/* Template detail page (模板详情页) */}
          <Route path="/mobile/template/:id" element={<TemplateDetailPage />} />

          {/* Community page (社区列表页) */}
          <Route path="/mobile/community" element={<CommunityPage />} />

          {/* Community detail page (社区详情页，独立页面) */}
          <Route path="/mobile/community/:id" element={<CommunityDetailPage />} />

          {/* 3D功能页面 */}
          <Route path="/mobile/3d" element={<Home3DPage />} />
          <Route path="/mobile/3d/upload" element={<Upload3DPage />} />
          <Route path="/mobile/3d/preview" element={<Preview3DPage />} />
          <Route path="/mobile/3d/template-test" element={<TemplateTestPage />} />
          <Route path="/mobile/3d/template-flow" element={<TemplateFlowPage />} />
          <Route path="/mobile/3d/depth-to-3d" element={<DepthTo3DPage />} />
          <Route path="/mobile/3d/model-to-slices" element={<ModelTo3DPage />} />

          {/* Catch all: redirect to root */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};

export default AppRouter;
