import React from 'react';
import { ArrowLeft } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { colors, typography, mixins } from '../../styles/designSystem';
import { LEGAL_INFO } from '../../config/legalInfo';

const sections = [
  { title: '\u4e00\u3001\u534f\u8bae\u8303\u56f4', body: ['\u672c\u534f\u8bae\u662f\u60a8\u4e0e ' + LEGAL_INFO.developerName + ' \u5c31\u4f7f\u7528 ' + LEGAL_INFO.appName + ' \u670d\u52a1\u6240\u8ba2\u7acb\u7684\u6709\u6548\u534f\u8bae\u3002\u5f53\u60a8\u6ce8\u518c\u3001\u767b\u5f55\u3001\u6d4f\u89c8\u3001\u4e0a\u4f20\u3001\u53d1\u5e03\u6216\u4f7f\u7528\u672c\u5e94\u7528\u4efb\u4f55\u529f\u80fd\u65f6\uff0c\u5373\u89c6\u4e3a\u60a8\u5df2\u9605\u8bfb\u5e76\u540c\u610f\u672c\u534f\u8bae\u5168\u90e8\u5185\u5bb9\u3002'] },
  { title: '\u4e8c\u3001\u8d26\u53f7\u4e0e\u5b89\u5168', items: ['\u60a8\u5e94\u5f53\u63d0\u4f9b\u771f\u5b9e\u3001\u51c6\u786e\u3001\u5b8c\u6574\u7684\u6ce8\u518c\u4e0e\u767b\u5f55\u4fe1\u606f\u3002','\u60a8\u5e94\u59a5\u5584\u4fdd\u7ba1\u8d26\u53f7\u51ed\u8bc1\uff0c\u5e76\u5bf9\u8d26\u53f7\u4e0b\u53d1\u751f\u7684\u884c\u4e3a\u627f\u62c5\u8d23\u4efb\u3002','\u82e5\u53d1\u73b0\u8d26\u53f7\u5b58\u5728\u5f02\u5e38\u6216\u5b89\u5168\u98ce\u9669\uff0c\u8bf7\u53ca\u65f6\u8054\u7cfb\u6211\u4eec\u5904\u7406\u3002'] },
  { title: '\u4e09\u3001\u670d\u52a1\u5185\u5bb9', items: ['\u6211\u4eec\u5411\u60a8\u63d0\u4f9b\u62fc\u8c46\u56fe\u751f\u6210\u3001\u7f16\u8f91\u3001\u5236\u4f5c\u8f85\u52a9\u3001\u4f5c\u54c1\u4fdd\u5b58\u3001\u793e\u533a\u53d1\u5e03\u4e0e\u6d4f\u89c8\u7b49\u529f\u80fd\u3002','\u4e3a\u4e86\u6539\u8fdb\u670d\u52a1\u4f53\u9a8c\uff0c\u6211\u4eec\u53ef\u80fd\u5bf9\u73b0\u6709\u529f\u80fd\u8fdb\u884c\u8c03\u6574\u3001\u4f18\u5316\u3001\u5347\u7ea7\u6216\u4e0b\u7ebf\u3002','\u90e8\u5206\u80fd\u529b\u53ef\u80fd\u4f9d\u8d56\u7f51\u7edc\u3001\u8bbe\u5907\u6027\u80fd\u6216\u5e73\u53f0\u5ba1\u6838\u72b6\u6001\u800c\u5b58\u5728\u5dee\u5f02\u3002'] },
  { title: '\u56db\u3001\u7528\u6237\u884c\u4e3a\u89c4\u8303', items: ['\u4e0d\u5f97\u53d1\u5e03\u8fdd\u6cd5\u8fdd\u89c4\u3001\u4fb5\u6743\u3001\u4f4e\u4fd7\u3001\u9a9a\u6270\u3001\u865a\u5047\u6216\u5176\u4ed6\u4e0d\u5f53\u5185\u5bb9\u3002','\u4e0d\u5f97\u6076\u610f\u5237\u91cf\u3001\u653b\u51fb\u670d\u52a1\u3001\u7ed5\u8fc7\u9650\u5236\u6216\u5e72\u6270\u5e73\u53f0\u6b63\u5e38\u8fd0\u884c\u3002','\u4e0d\u5f97\u5229\u7528\u672c\u670d\u52a1\u4ece\u4e8b\u4efb\u4f55\u8fdd\u53cd\u6cd5\u5f8b\u6cd5\u89c4\u6216\u5e73\u53f0\u89c4\u5219\u7684\u6d3b\u52a8\u3002'] },
  { title: '\u4e94\u3001\u5185\u5bb9\u4e0e\u77e5\u8bc6\u4ea7\u6743', body: ['\u5e94\u7528\u672c\u8eab\u53ca\u5176\u754c\u9762\u3001\u4ee3\u7801\u3001\u6587\u6848\u3001\u8bbe\u8ba1\u7b49\u5185\u5bb9\u7684\u77e5\u8bc6\u4ea7\u6743\u5f52\u6211\u4eec\u6216\u76f8\u5173\u6743\u5229\u4eba\u6240\u6709\u3002\u60a8\u4e0a\u4f20\u3001\u53d1\u5e03\u7684\u56fe\u7247\u4e0e\u4f5c\u54c1\u5e94\u5177\u6709\u5408\u6cd5\u6765\u6e90\uff0c\u4e0d\u5f97\u4fb5\u72af\u7b2c\u4e09\u65b9\u6743\u5229\u3002'] },
  { title: '\u516d\u3001\u793e\u533a\u6cbb\u7406', body: ['\u5bf9\u4e8e\u793e\u533a\u4e2d\u53d1\u5e03\u7684\u5185\u5bb9\uff0c\u6211\u4eec\u6709\u6743\u57fa\u4e8e\u5e73\u53f0\u89c4\u5219\u3001\u7528\u6237\u4e3e\u62a5\u3001\u5ba1\u6838\u5224\u65ad\u7b49\u91c7\u53d6\u5ba1\u6838\u3001\u9650\u5236\u5c55\u793a\u3001\u9a73\u56de\u3001\u4e0b\u67b6\u7b49\u5904\u7406\u63aa\u65bd\u3002\u5bf9\u4e8e\u591a\u6b21\u8fdd\u89c4\u6216\u60c5\u8282\u4e25\u91cd\u7684\u8d26\u53f7\uff0c\u6211\u4eec\u6709\u6743\u9650\u5236\u5176\u90e8\u5206\u529f\u80fd\u6216\u505c\u6b62\u670d\u52a1\u3002'] },
  { title: '\u4e03\u3001\u8d23\u4efb\u9650\u5236', body: ['\u5728\u6cd5\u5f8b\u5141\u8bb8\u7684\u8303\u56f4\u5185\uff0c\u5bf9\u4e8e\u56e0\u7f51\u7edc\u6545\u969c\u3001\u8bbe\u5907\u5f02\u5e38\u3001\u7b2c\u4e09\u65b9\u670d\u52a1\u4e2d\u65ad\u3001\u4e0d\u53ef\u6297\u529b\u7b49\u539f\u56e0\u5bfc\u81f4\u7684\u670d\u52a1\u4e2d\u65ad\u6216\u6570\u636e\u5f02\u5e38\uff0c\u6211\u4eec\u5c06\u5c3d\u529b\u4fee\u590d\uff0c\u4f46\u4e0d\u627f\u62c5\u8d85\u51fa\u6cd5\u5b9a\u8303\u56f4\u7684\u8d23\u4efb\u3002'] },
  { title: '\u516b\u3001\u534f\u8bae\u53d8\u66f4\u4e0e\u7ec8\u6b62', items: ['\u6211\u4eec\u53ef\u6839\u636e\u4ea7\u54c1\u8fed\u4ee3\u6216\u76d1\u7ba1\u8981\u6c42\u66f4\u65b0\u672c\u534f\u8bae\u3002','\u534f\u8bae\u66f4\u65b0\u540e\u4f1a\u5728\u5e94\u7528\u5185\u516c\u793a\uff0c\u7ee7\u7eed\u4f7f\u7528\u5373\u89c6\u4e3a\u63a5\u53d7\u66f4\u65b0\u540e\u7684\u534f\u8bae\u3002','\u82e5\u60a8\u8fdd\u53cd\u672c\u534f\u8bae\uff0c\u6211\u4eec\u6709\u6743\u9650\u5236\u3001\u6682\u505c\u6216\u7ec8\u6b62\u5411\u60a8\u63d0\u4f9b\u670d\u52a1\u3002'] },
  { title: '\u4e5d\u3001\u8054\u7cfb\u6211\u4eec', body: ['\u5f00\u53d1\u8005\uff1a' + LEGAL_INFO.developerName, '\u8054\u7cfb\u90ae\u7bb1\uff1a' + LEGAL_INFO.contactEmail] }
];

const UserAgreementPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate(-1)}>
          <ArrowLeft size={20} weight="bold" />
        </button>
        <h1 style={styles.title}>{'\u7528\u6237\u534f\u8bae'}</h1>
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

export default UserAgreementPage;
