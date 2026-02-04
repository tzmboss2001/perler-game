import React from 'react';
import { ArrowLeft } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { colors, radius, typography, shadows, mixins } from '../../styles/designSystem';

/**
 * 隐私政策页面
 * 符合微信小程序和抖音小程序的隐私政策要求
 */
const PrivacyPolicyPage: React.FC = () => {
  const navigate = useNavigate();

  // 配置信息（可替换）
  const config = {
    appName: '拼豆工坊',
    developer: '个人开发者',  // TODO: 替换为实际开发者名称
    email: 'developer@example.com',  // TODO: 替换为实际邮箱
    effectiveDate: '2025年1月25日',
    updateDate: '2025年1月25日',
  };

  return (
    <div style={styles.container}>
      {/* 固定头部 */}
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate(-1)}>
          <ArrowLeft size={20} weight="bold" />
        </button>
        <h1 style={styles.title}>隐私政策</h1>
        <div style={styles.placeholder} />
      </div>
      {/* Header占位 */}
      <div style={styles.headerSpacer} />

      {/* 内容 */}
      <div style={styles.content}>
        <div style={styles.updateInfo}>
          <p>生效日期：{config.effectiveDate}</p>
          <p>更新日期：{config.updateDate}</p>
        </div>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>引言</h2>
          <p style={styles.paragraph}>
            欢迎使用{config.appName}（以下简称"本应用"或"我们"）。我们非常重视用户的隐私保护，
            本隐私政策将向您说明我们如何收集、使用、存储和保护您的个人信息。
            请您在使用本应用前仔细阅读并理解本隐私政策。
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>一、我们收集的信息</h2>

          <h3 style={styles.subTitle}>1.1 您主动提供的信息</h3>
          <ul style={styles.list}>
            <li style={styles.listItem}>
              <strong>账户信息</strong>：当您注册账户时，我们可能收集您的用户名、邮箱地址等信息。
            </li>
            <li style={styles.listItem}>
              <strong>图片信息</strong>：您上传或拍摄的图片将用于生成拼豆图案。
              这些图片仅在本地处理，不会上传到我们的服务器（除非您主动选择云端保存）。
            </li>
          </ul>

          <h3 style={styles.subTitle}>1.2 自动收集的信息</h3>
          <ul style={styles.list}>
            <li style={styles.listItem}>
              <strong>设备信息</strong>：设备型号、操作系统版本、浏览器类型等基本信息。
            </li>
            <li style={styles.listItem}>
              <strong>使用数据</strong>：应用的使用频率、功能使用情况等匿名统计数据。
            </li>
          </ul>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>二、信息的使用</h2>
          <p style={styles.paragraph}>我们收集的信息将用于以下目的：</p>
          <ul style={styles.list}>
            <li style={styles.listItem}>提供、维护和改进本应用的功能和服务</li>
            <li style={styles.listItem}>处理您的图片并生成拼豆图案</li>
            <li style={styles.listItem}>保存您的创作方案（如您选择保存）</li>
            <li style={styles.listItem}>提供客户支持和响应您的咨询</li>
            <li style={styles.listItem}>发送服务相关的通知和更新</li>
            <li style={styles.listItem}>分析和改进用户体验</li>
          </ul>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>三、信息的存储</h2>
          <ul style={styles.list}>
            <li style={styles.listItem}>
              <strong>本地存储</strong>：您的设置偏好和未登录时的方案数据存储在您的设备本地。
            </li>
            <li style={styles.listItem}>
              <strong>云端存储</strong>：登录账户后，您的方案可同步到云端服务器，便于跨设备访问。
            </li>
            <li style={styles.listItem}>
              <strong>图片处理</strong>：您上传的图片在本地完成处理后即被释放，不会持久存储。
            </li>
          </ul>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>四、信息的共享</h2>
          <p style={styles.paragraph}>
            我们不会将您的个人信息出售、出租或以其他方式提供给第三方，但以下情况除外：
          </p>
          <ul style={styles.list}>
            <li style={styles.listItem}>获得您的明确同意</li>
            <li style={styles.listItem}>法律法规要求或政府机关依法要求</li>
            <li style={styles.listItem}>保护我们或公众的权利、财产或安全所必需</li>
          </ul>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>五、信息安全</h2>
          <p style={styles.paragraph}>
            我们采取合理的技术和管理措施来保护您的个人信息安全，包括但不限于：
          </p>
          <ul style={styles.list}>
            <li style={styles.listItem}>使用加密技术保护数据传输</li>
            <li style={styles.listItem}>限制有权访问个人信息的人员</li>
            <li style={styles.listItem}>定期审查安全措施</li>
          </ul>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>六、您的权利</h2>
          <p style={styles.paragraph}>您对个人信息享有以下权利：</p>
          <ul style={styles.list}>
            <li style={styles.listItem}>
              <strong>访问权</strong>：您可以查看您的账户信息和保存的方案。
            </li>
            <li style={styles.listItem}>
              <strong>更正权</strong>：您可以修改不准确的个人信息。
            </li>
            <li style={styles.listItem}>
              <strong>删除权</strong>：您可以删除您的账户和相关数据。
            </li>
            <li style={styles.listItem}>
              <strong>撤回同意</strong>：您可以撤回对特定数据处理的同意。
            </li>
          </ul>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>七、第三方服务</h2>
          <p style={styles.paragraph}>
            本应用可能使用第三方服务（如统计分析服务）。这些第三方服务有其独立的隐私政策，
            我们建议您阅读相关政策以了解他们如何处理您的信息。
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>八、未成年人保护</h2>
          <p style={styles.paragraph}>
            本应用适合所有年龄段用户使用。如您是未满14周岁的未成年人，
            请在监护人的陪同下阅读本隐私政策，并在征得监护人同意后使用本应用。
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>九、隐私政策的更新</h2>
          <p style={styles.paragraph}>
            我们可能会不时更新本隐私政策。更新后的政策将在本页面发布，
            重大变更将通过应用内通知或其他方式告知您。
            继续使用本应用即表示您同意更新后的隐私政策。
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>十、联系我们</h2>
          <p style={styles.paragraph}>
            如您对本隐私政策有任何疑问、意见或建议，请通过以下方式联系我们：
          </p>
          <div style={styles.contactBox}>
            <p style={styles.contactItem}>开发者：{config.developer}</p>
            <p style={styles.contactItem}>电子邮箱：{config.email}</p>
          </div>
        </section>

        <div style={styles.footer}>
          <p style={styles.footerText}>
            感谢您使用{config.appName}！
          </p>
        </div>
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
    height: '56px',
  },

  backBtn: {
    ...mixins.backButton,
  },

  title: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamilyAlt,
    background: colors.gradients.primary,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    margin: 0,
  },

  placeholder: {
    width: 40,
  },

  content: {
    padding: '20px 16px 40px',
  },

  updateInfo: {
    padding: '12px 16px',
    background: colors.bg.card,
    borderRadius: radius.card,
    border: `1px solid ${colors.border.soft}`,
    marginBottom: '24px',
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.muted,
  },

  section: {
    marginBottom: '24px',
  },

  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.primary,
    margin: '0 0 12px',
    paddingBottom: '8px',
    borderBottom: `2px solid ${colors.bead.cyan}40`,
  },

  subTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.secondary,
    margin: '16px 0 8px',
  },

  paragraph: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.muted,
    lineHeight: 1.8,
    margin: '0 0 12px',
  },

  list: {
    margin: '8px 0',
    paddingLeft: '20px',
  },

  listItem: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.muted,
    lineHeight: 1.8,
    marginBottom: '8px',
  },

  contactBox: {
    padding: '16px',
    background: colors.bg.card,
    borderRadius: radius.card,
    border: `1px solid ${colors.bead.cyan}30`,
    boxShadow: shadows.sm,
    marginTop: '12px',
  },

  contactItem: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.primary,
    margin: '0 0 8px',
  },

  footer: {
    textAlign: 'center',
    marginTop: '40px',
    padding: '20px',
  },

  footerText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.muted,
    margin: 0,
  },
};

export default PrivacyPolicyPage;
