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

// Update these fields with the real production entity information before release.
export const LEGAL_INFO: LegalInfo = {
  appName: '\u62fc\u8c46\u5de5\u574a',
  version: '1.0.0',
  developerName: '\u62fc\u8c46\u5de5\u574a\u8fd0\u8425\u56e2\u961f',
  contactEmail: 'support@perlerbeadscreator.com',
  website: '',
  icp: '',
  effectiveDate: '2026-03-15',
  updateDate: '2026-03-15',
};
