import React from 'react';
import { ArrowLeft } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { colors, typography, mixins } from '../../styles/designSystem';
import { LEGAL_INFO } from '../../config/legalInfo';

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
        <div style={styles.meta}>
          <p>生效日期：{LEGAL_INFO.effectiveDate}</p>
          <p>更新日期：{LEGAL_INFO.updateDate}</p>
        </div>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>一、协议范围</h2>
          <p style={styles.paragraph}>
            本协议是您与 {LEGAL_INFO.developerName} 就使用 {LEGAL_INFO.appName} 服务所订立的有效协议。
            您使用本应用即视为已阅读并同意本协议全部条款。
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>二、账号与安全</h2>
          <ul style={styles.list}>
            <li style={styles.listItem}>您应提供真实、准确、完整的注册信息。</li>
            <li style={styles.listItem}>您应妥善保管账号凭证，对账号行为承担责任。</li>
            <li style={styles.listItem}>发现账号异常请及时联系客服处理。</li>
          </ul>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>三、服务内容</h2>
          <ul style={styles.list}>
            <li style={styles.listItem}>提供拼豆图案生成、编辑、制作辅助、作品发布等能力。</li>
            <li style={styles.listItem}>根据业务需要，服务功能可能调整、升级或下线。</li>
            <li style={styles.listItem}>我们有权在合理范围内进行维护与版本更新。</li>
          </ul>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>四、用户行为规范</h2>
          <ul style={styles.list}>
            <li style={styles.listItem}>不得发布违法违规、侵权或不当内容。</li>
            <li style={styles.listItem}>不得恶意刷量、攻击服务或干扰平台正常运行。</li>
            <li style={styles.listItem}>不得利用服务从事任何违法活动。</li>
          </ul>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>五、知识产权</h2>
          <p style={styles.paragraph}>
            应用程序及其相关内容的知识产权归我们或权利人所有。您上传内容应具有合法来源，不得侵犯第三方权利。
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>六、责任限制</h2>
          <p style={styles.paragraph}>
            在法律允许范围内，因网络、设备、不可抗力等因素导致的服务中断或数据异常，我们将尽力恢复，但不承担超出法定范围的责任。
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>七、协议变更与终止</h2>
          <ul style={styles.list}>
            <li style={styles.listItem}>我们可根据业务或监管要求更新本协议。</li>
            <li style={styles.listItem}>协议更新后在应用内公示，继续使用即视为接受变更。</li>
            <li style={styles.listItem}>若您违反协议，我们有权限制或终止服务。</li>
          </ul>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>八、联系我们</h2>
          <p style={styles.paragraph}>开发者：{LEGAL_INFO.developerName}</p>
          <p style={styles.paragraph}>联系邮箱：{LEGAL_INFO.contactEmail}</p>
        </section>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: colors.bg.primary,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px',
    background: colors.bg.secondary,
    borderBottom: `1px solid ${colors.border.soft}`,
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  headerSpacer: {
    height: 56,
  },
  backBtn: {
    ...mixins.backButton,
  },
  title: {
    margin: 0,
    color: colors.text.primary,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
  },
  placeholder: {
    width: 40,
  },
  content: {
    padding: '16px 16px 32px',
  },
  meta: {
    marginBottom: 16,
    color: colors.text.muted,
    fontSize: typography.fontSize.xs,
    lineHeight: 1.6,
  },
  section: {
    background: colors.bg.secondary,
    border: `1px solid ${colors.border.soft}`,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  sectionTitle: {
    margin: '0 0 8px',
    color: colors.text.primary,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
  },
  paragraph: {
    margin: 0,
    color: colors.text.secondary,
    fontSize: typography.fontSize.sm,
    lineHeight: 1.7,
  },
  list: {
    margin: 0,
    paddingLeft: 18,
    color: colors.text.secondary,
    fontSize: typography.fontSize.sm,
    lineHeight: 1.7,
  },
  listItem: {
    marginBottom: 6,
  },
};

export default UserAgreementPage;

