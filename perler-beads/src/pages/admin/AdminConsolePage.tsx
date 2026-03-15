import React from 'react';
import CommunityModerationPage from '../mobile/CommunityModerationPage';

/**
 * 运营后台入口
 * 当前第一版直接承接社区审核台，避免 /admin 路由落空。
 */
const AdminConsolePage: React.FC = () => {
  return <CommunityModerationPage />;
};

export default AdminConsolePage;
