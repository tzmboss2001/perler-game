export interface LegalInfo {
  appName: string;
  version: string;
  developerName: string;
  contactEmail: string;
  website: string;
  icp: string;
  effectiveDate: string;
  updateDate: string;
}

// Legal/compliance profile used by About/Privacy/User Agreement pages.
// Update these fields with real entity information before production release.
export const LEGAL_INFO: LegalInfo = {
  appName: '拼豆工坊',
  version: '1.0.0',
  developerName: '拼豆工坊运营团队',
  contactEmail: 'support@perlerbeadscreator.com',
  website: '',
  icp: '',
  effectiveDate: '2026年3月1日',
  updateDate: '2026年3月5日',
};

