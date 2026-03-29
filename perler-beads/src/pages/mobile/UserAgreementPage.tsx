import React from 'react';
import { ArrowLeft } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { radius, typography, mixins } from '../../styles/designSystem';
import { LEGAL_INFO } from '../../config/legalInfo';

const sections = [
  { title: '一、协议范围', body: ['本协议是您与 ' + LEGAL_INFO.developerName + ' 就使用 ' + LEGAL_INFO.appName + ' 服务所订立的有效协议。当您注册、登录、浏览、上传、发布或使用本应用任何功能时，即视为您已阅读并同意本协议全部内容。'] },
  { title: '二、账号与安全', items: ['您应当提供真实、准确、完整的注册与登录信息。', '您应妥善保管账号凭证，并对账号下发生的行为承担责任。', '若发现账号存在异常或安全风险，请及时联系我们处理。'] },
  { title: '三、服务内容', items: ['我们向您提供拼豆图生成、编辑、制作辅助、作品保存、社区发布与浏览等功能。', '为了改进服务体验，我们可能对现有功能进行调整、优化、升级或下线。', '部分能力可能依赖网络、设备性能或平台审核状态而存在差异。'] },
  { title: '四、用户行为规范', items: ['不得发布违法违规、侵权、低俗、骚扰、虚假或其他不当内容。', '不得恶意刷量、攻击服务、绕过限制或干扰平台正常运行。', '不得利用本服务从事任何违反法律法规或平台规则的活动。'] },
  { title: '五、内容与知识产权', body: ['应用本身及其界面、代码、文案、设计等内容的知识产权归我们或相关权利人所有。您上传、发布的图片与作品应具有合法来源，不得侵犯第三方权利。'] },
  { title: '六、社区治理', body: ['对于社区中发布的内容，我们有权基于平台规则、用户举报、审核判断等采取审核、限制展示、驳回、下架等处理措施。对于多次违规或情节严重的账号，我们有权限制其部分功能或停止服务。'] },
  { title: '七、责任限制', body: ['在法律允许的范围内，对于因网络故障、设备异常、第三方服务中断、不可抗力等原因导致的服务中断或数据异常，我们将尽力修复，但不承担超出法定范围的责任。'] },
  { title: '八、协议变更与终止', items: ['我们可根据产品迭代或监管要求更新本协议。', '协议更新后会在应用内公示，继续使用即视为接受更新后的协议。', '若您违反本协议，我们有权限制、暂停或终止向您提供服务。'] },
  { title: '九、联系我们', body: ['开发者：' + LEGAL_INFO.developerName, '联系邮箱：' + LEGAL_INFO.contactEmail] },
];

const legalCandy = {
  pageBg: 'linear-gradient(180deg, #fffaf3 0%, #fff5fd 44%, #f2fbff 100%)',
  panel: 'rgba(255,255,255,0.9)',
  panelSoft: 'rgba(255,255,255,0.78)',
  border: 'rgba(126, 103, 173, 0.16)',
  text: '#4f4668',
  textSoft: '#726787',
  textMuted: '#9489a6',
  shadow: '0 18px 42px rgba(137, 112, 167, 0.12)',
};

const UserAgreementPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate(-1)}>
          <ArrowLeft size={20} weight="bold" />
        </button>
        <h1 style={styles.title}>用户协议</h1>
        <div style={styles.placeholder} />
      </div>
      <div style={styles.headerSpacer} />
      <div style={styles.content}>
        <div style={styles.metaCard}>
          <span style={styles.metaText}>生效日期：{LEGAL_INFO.effectiveDate}</span>
          <span style={styles.metaText}>更新日期：{LEGAL_INFO.updateDate}</span>
        </div>
        {sections.map((section) => (
          <section key={section.title} style={styles.section}>
            <h2 style={styles.sectionTitle}>{section.title}</h2>
            {section.body?.map((text) => (
              <p key={text} style={styles.paragraph}>{text}</p>
            ))}
            {section.items ? (
              <ul style={styles.list}>
                {section.items.map((text) => (
                  <li key={text} style={styles.listItem}>{text}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: { minHeight: '100vh', background: legalCandy.pageBg },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px',
    background: legalCandy.panelSoft,
    borderBottom: `1px solid ${legalCandy.border}`,
    boxShadow: '0 10px 28px rgba(137, 112, 167, 0.08)',
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  headerSpacer: { height: 56 },
  backBtn: { ...mixins.backButton },
  title: { margin: 0, color: legalCandy.text, fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold },
  placeholder: { width: 40 },
  content: { padding: '16px 16px 32px' },
  metaCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    marginBottom: 14,
    padding: '12px 14px',
    borderRadius: radius.card,
    background: legalCandy.panel,
    border: `1px solid ${legalCandy.border}`,
    boxShadow: legalCandy.shadow,
  },
  metaText: { color: legalCandy.textMuted, fontSize: typography.fontSize.xs, lineHeight: 1.6 },
  section: {
    background: legalCandy.panel,
    border: `1px solid ${legalCandy.border}`,
    borderRadius: radius.card,
    boxShadow: legalCandy.shadow,
    padding: '14px 14px 12px',
    marginBottom: 12,
  },
  sectionTitle: { margin: '0 0 8px', color: legalCandy.text, fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.bold },
  paragraph: { margin: 0, color: legalCandy.textSoft, fontSize: typography.fontSize.sm, lineHeight: 1.72 },
  list: { margin: 0, paddingLeft: 18, color: legalCandy.textSoft, fontSize: typography.fontSize.sm, lineHeight: 1.72 },
  listItem: { marginBottom: 6 },
};

export default UserAgreementPage;
