import React from 'react';
import { ArrowLeft } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { colors, typography, mixins } from '../../styles/designSystem';
import { LEGAL_INFO } from '../../config/legalInfo';

const PrivacyPolicyPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate(-1)}>
          <ArrowLeft size={20} weight="bold" />
        </button>
        <h1 style={styles.title}>隐私政策</h1>
        <div style={styles.placeholder} />
      </div>
      <div style={styles.headerSpacer} />

      <div style={styles.content}>
        <div style={styles.meta}>
          <p>生效日期：{LEGAL_INFO.effectiveDate}</p>
          <p>更新日期：{LEGAL_INFO.updateDate}</p>
        </div>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>一、适用范围</h2>
          <p style={styles.paragraph}>
            本政策适用于 {LEGAL_INFO.appName}
            在向您提供服务过程中，对您的个人信息收集、使用、存储、共享与保护行为。
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>二、我们收集的信息</h2>
          <ul style={styles.list}>
            <li style={styles.listItem}>账号信息：邮箱、昵称等用于登录与身份识别的信息。</li>
            <li style={styles.listItem}>作品数据：您上传的图片、生成的图案、制作进度与发布内容。</li>
            <li style={styles.listItem}>设备信息：设备型号、系统版本、日志信息，用于故障排查与体验优化。</li>
          </ul>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>三、信息使用目的</h2>
          <ul style={styles.list}>
            <li style={styles.listItem}>提供核心功能：图案生成、编辑、制作辅助、社区发布。</li>
            <li style={styles.listItem}>保障服务安全：风控、防刷、防滥用与故障诊断。</li>
            <li style={styles.listItem}>改善产品体验：性能分析、崩溃修复、交互优化。</li>
          </ul>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>四、信息存储与保护</h2>
          <p style={styles.paragraph}>
            我们采取合理的技术与管理措施保护您的数据安全，包括访问控制、传输加密、最小权限与日志审计。
          </p>
          <p style={styles.paragraph}>
            对于本地草稿和缓存数据，您可在应用内或清理设备缓存时删除。
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>五、信息共享与披露</h2>
          <p style={styles.paragraph}>
            未经您同意，我们不会向第三方出售您的个人信息。仅在法律法规要求、保护公共安全或维护合法权益时，依法披露必要信息。
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>六、您的权利</h2>
          <ul style={styles.list}>
            <li style={styles.listItem}>访问、更正或删除您的账号与作品数据。</li>
            <li style={styles.listItem}>注销账号并申请删除关联数据。</li>
            <li style={styles.listItem}>对数据处理提出意见和投诉。</li>
          </ul>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>七、联系我们</h2>
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

export default PrivacyPolicyPage;

