import React from 'react';
import { ArrowLeft } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { colors, typography, mixins } from '../../styles/designSystem';
import { LEGAL_INFO } from '../../config/legalInfo';

const sections = [
  {
    title: '\u4e00\u3001\u9002\u7528\u8303\u56f4',
    body: ['\u672c\u9690\u79c1\u653f\u7b56\u9002\u7528\u4e8e ' + LEGAL_INFO.appName + '\u5728\u5411\u60a8\u63d0\u4f9b\u56fe\u7247\u5bfc\u5165\u3001\u62fc\u8c46\u56fe\u751f\u6210\u3001\u7f16\u8f91\u3001\u5236\u4f5c\u8f85\u52a9\u3001\u793e\u533a\u53d1\u5e03\u4e0e\u6d4f\u89c8\u7b49\u670d\u52a1\u8fc7\u7a0b\u4e2d\uff0c\u5bf9\u60a8\u4e2a\u4eba\u4fe1\u606f\u7684\u6536\u96c6\u3001\u4f7f\u7528\u3001\u5b58\u50a8\u4e0e\u4fdd\u62a4\u3002']
  },
  {
    title: '\u4e8c\u3001\u6211\u4eec\u6536\u96c6\u7684\u4fe1\u606f',
    items: [
      '\u8d26\u53f7\u4fe1\u606f\uff1a\u90ae\u7bb1\u3001\u6635\u79f0\u3001\u5934\u50cf\u7b49\uff0c\u7528\u4e8e\u6ce8\u518c\u3001\u767b\u5f55\u3001\u8eab\u4efd\u8bc6\u522b\u548c\u793e\u533a\u5c55\u793a\u3002',
      '\u521b\u4f5c\u4e0e\u4f5c\u54c1\u6570\u636e\uff1a\u60a8\u4e0a\u4f20\u7684\u56fe\u7247\u3001\u751f\u6210\u7684\u56fe\u7eb8\u3001\u5236\u4f5c\u8fdb\u5ea6\u3001\u793e\u533a\u53d1\u5e03\u5185\u5bb9\u3001\u6210\u54c1\u56fe\u7247\uff0c\u4ee5\u53ca 3D \u529f\u80fd\u4e2d\u4e0a\u4f20\u7684\u53c2\u8003\u56fe\u3001\u6df1\u5ea6\u56fe\u6216\u5207\u7247\u6a21\u677f\u6570\u636e\u3002',
      '\u4e92\u52a8\u4e0e\u6cbb\u7406\u6570\u636e\uff1a\u60a8\u63d0\u4ea4\u7684\u53cd\u9988\u5185\u5bb9\u3001\u793e\u533a\u4e3e\u62a5\u539f\u56e0\u3001\u5ba1\u6838\u5904\u7406\u8bb0\u5f55\u7b49\uff0c\u7528\u4e8e\u95ee\u9898\u56de\u590d\u3001\u5185\u5bb9\u6cbb\u7406\u548c\u98ce\u9669\u6392\u67e5\u3002',
      '\u8bbe\u5907\u4e0e\u65e5\u5fd7\u4fe1\u606f\uff1a\u8bbe\u5907\u578b\u53f7\u3001\u6d4f\u89c8\u5668\u4fe1\u606f\u3001\u9519\u8bef\u65e5\u5fd7\uff0c\u7528\u4e8e\u6392\u67e5\u6545\u969c\u548c\u4f18\u5316\u4f53\u9a8c\u3002',
      '\u672c\u5730\u7f13\u5b58\u6570\u636e\uff1a\u8349\u7a3f\u3001\u6700\u8fd1\u4e00\u6b21\u5236\u4f5c\u72b6\u6001\u3001\u89c6\u89c9\u8f85\u52a9\u8bbe\u7f6e\u7b49\uff0c\u7528\u4e8e\u63d0\u5347\u8fde\u7eed\u4f7f\u7528\u4f53\u9a8c\u3002'
    ]
  },
  {
    title: '\u4e09\u3001\u6743\u9650\u4f7f\u7528\u8bf4\u660e',
    items: [
      '\u76f8\u518c\u6216\u6587\u4ef6\u8bfb\u53d6\uff1a\u7528\u4e8e\u5bfc\u5165\u56fe\u7247\u751f\u6210\u62fc\u8c46\u56fe\uff0c\u4e0a\u4f20\u6210\u54c1\u56fe\u7247\u3001\u793e\u533a\u4f5c\u54c1\u5c01\u9762\u3001\u53cd\u9988\u9644\u56fe\uff0c\u4ee5\u53ca 3D \u529f\u80fd\u4e2d\u4e0a\u4f20\u53c2\u8003\u56fe\u6216\u6df1\u5ea6\u56fe\u3002',
      '\u6444\u50cf\u5934\uff1a\u7528\u4e8e\u62cd\u7167\u521b\u4f5c\uff0c\u4ee5\u53ca\u5236\u4f5c\u6a21\u5f0f\u4e2d\u7684\u89c6\u89c9\u8f85\u52a9\u8bc6\u522b\u529f\u80fd\u3002',
      '\u7f51\u7edc\u8bbf\u95ee\uff1a\u7528\u4e8e\u540c\u6b65\u8d26\u53f7\u3001\u793e\u533a\u5185\u5bb9\u3001\u4f5c\u54c1\u6570\u636e\u3001\u53cd\u9988\u4e0e\u4e3e\u62a5\u5904\u7406\uff0c\u4ee5\u53ca\u5ba1\u6838\u6cbb\u7406\u76f8\u5173\u4fe1\u606f\u3002'
    ]
  },
  {
    title: '\u56db\u3001\u4fe1\u606f\u4f7f\u7528\u76ee\u7684',
    items: [
      '\u4e3a\u60a8\u63d0\u4f9b\u56fe\u6848\u751f\u6210\u3001\u7f16\u8f91\u3001\u4fdd\u5b58\u3001\u5236\u4f5c\u8f85\u52a9\u548c\u793e\u533a\u4e92\u52a8\u670d\u52a1\u3002',
      '\u4fdd\u969c\u5e73\u53f0\u5b89\u5168\uff0c\u5305\u62ec\u767b\u5f55\u6821\u9a8c\u3001\u5f02\u5e38\u6392\u67e5\u3001\u9632\u6ee5\u7528\u548c\u5185\u5bb9\u6cbb\u7406\u3002',
      '\u6539\u8fdb\u4ea7\u54c1\u4f53\u9a8c\uff0c\u5305\u62ec\u6027\u80fd\u4f18\u5316\u3001\u7a33\u5b9a\u6027\u4fee\u590d\u548c\u529f\u80fd\u8fed\u4ee3\u3002'
    ]
  },
  {
    title: '\u4e94\u3001\u4fe1\u606f\u5b58\u50a8\u4e0e\u4fdd\u62a4',
    body: ['\u6211\u4eec\u4f1a\u91c7\u53d6\u5408\u7406\u7684\u6280\u672f\u4e0e\u7ba1\u7406\u63aa\u65bd\u4fdd\u62a4\u60a8\u7684\u6570\u636e\u5b89\u5168\uff0c\u5305\u62ec\u8bbf\u95ee\u63a7\u5236\u3001\u6700\u5c0f\u6743\u9650\u3001\u4f20\u8f93\u4fdd\u62a4\u4e0e\u65e5\u5fd7\u5ba1\u8ba1\u3002\u5bf9\u4e8e\u4fdd\u5b58\u5728\u672c\u5730\u8bbe\u5907\u4e2d\u7684\u7f13\u5b58\u4e0e\u8349\u7a3f\uff0c\u60a8\u53ef\u901a\u8fc7\u5e94\u7528\u5185\u6e05\u7406\u529f\u80fd\u6216\u6e05\u9664\u6d4f\u89c8\u5668\u6570\u636e\u7684\u65b9\u5f0f\u8fdb\u884c\u5220\u9664\u3002']
  },
  {
    title: '\u516d\u3001\u4fe1\u606f\u5171\u4eab\u4e0e\u62ab\u9732',
    body: ['\u672a\u7ecf\u60a8\u6388\u6743\uff0c\u6211\u4eec\u4e0d\u4f1a\u5411\u65e0\u5173\u7b2c\u4e09\u65b9\u51fa\u552e\u60a8\u7684\u4e2a\u4eba\u4fe1\u606f\u3002\u4ec5\u5728\u6cd5\u5f8b\u6cd5\u89c4\u8981\u6c42\u3001\u76d1\u7ba1\u8981\u6c42\u3001\u4fdd\u969c\u516c\u5171\u5b89\u5168\uff0c\u6216\u7ef4\u62a4\u5e73\u53f0\u4e0e\u5176\u4ed6\u7528\u6237\u5408\u6cd5\u6743\u76ca\u7684\u5fc5\u8981\u8303\u56f4\u5185\uff0c\u4f9d\u6cd5\u8fdb\u884c\u62ab\u9732\u3002']
  },
  {
    title: '\u4e03\u3001\u60a8\u7684\u6743\u5229',
    items: [
      '\u60a8\u53ef\u4ee5\u67e5\u770b\u3001\u4fee\u6539\u6216\u5220\u9664\u60a8\u7684\u8d26\u53f7\u8d44\u6599\u548c\u516c\u5f00\u53d1\u5e03\u5185\u5bb9\u3002',
      '\u60a8\u53ef\u4ee5\u7533\u8bf7\u6ce8\u9500\u8d26\u53f7\uff0c\u5e76\u8981\u6c42\u5220\u9664\u4e0e\u8d26\u53f7\u76f8\u5173\u7684\u53ef\u5220\u9664\u6570\u636e\u3002',
      '\u60a8\u53ef\u4ee5\u901a\u8fc7\u53cd\u9988\u6e20\u9053\u8054\u7cfb\u6211\u4eec\uff0c\u54a8\u8be2\u3001\u6295\u8bc9\u6216\u63d0\u51fa\u9690\u79c1\u76f8\u5173\u95ee\u9898\u3002'
    ]
  },
  {
    title: '\u516b\u3001\u8054\u7cfb\u6211\u4eec',
    body: ['\u5f00\u53d1\u8005\uff1a' + LEGAL_INFO.developerName, '\u8054\u7cfb\u90ae\u7bb1\uff1a' + LEGAL_INFO.contactEmail]
  }
];

const PrivacyPolicyPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate(-1)}>
          <ArrowLeft size={20} weight="bold" />
        </button>
        <h1 style={styles.title}>{'\u9690\u79c1\u653f\u7b56'}</h1>
        <div style={styles.placeholder} />
      </div>
      <div style={styles.headerSpacer} />
      <div style={styles.content}>
        <div style={styles.meta}>
          <p>{'\u751f\u6548\u65e5\u671f\uff1a'}{LEGAL_INFO.effectiveDate}</p>
          <p>{'\u66f4\u65b0\u65e5\u671f\uff1a'}{LEGAL_INFO.updateDate}</p>
        </div>
        {sections.map((section) => (
          <section key={section.title} style={styles.section}>
            <h2 style={styles.sectionTitle}>{section.title}</h2>
            {section.body?.map((text) => <p key={text} style={styles.paragraph}>{text}</p>)}
            {section.items ? (
              <ul style={styles.list}>
                {section.items.map((text) => <li key={text} style={styles.listItem}>{text}</li>)}
              </ul>
            ) : null}
          </section>
        ))}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: { minHeight: '100vh', background: colors.bg.primary },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: colors.bg.secondary, borderBottom: `1px solid ${colors.border.soft}`, position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100 },
  headerSpacer: { height: 56 },
  backBtn: { ...mixins.backButton },
  title: { margin: 0, color: colors.text.primary, fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold },
  placeholder: { width: 40 },
  content: { padding: '16px 16px 32px' },
  meta: { marginBottom: 16, color: colors.text.muted, fontSize: typography.fontSize.xs, lineHeight: 1.6 },
  section: { background: colors.bg.secondary, border: `1px solid ${colors.border.soft}`, borderRadius: 12, padding: 12, marginBottom: 10 },
  sectionTitle: { margin: '0 0 8px', color: colors.text.primary, fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.bold },
  paragraph: { margin: 0, color: colors.text.secondary, fontSize: typography.fontSize.sm, lineHeight: 1.7 },
  list: { margin: 0, paddingLeft: 18, color: colors.text.secondary, fontSize: typography.fontSize.sm, lineHeight: 1.7 },
  listItem: { marginBottom: 6 },
};

export default PrivacyPolicyPage;
