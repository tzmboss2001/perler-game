import React from 'react';
import { ArrowLeft } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { colors, radius, typography, shadows, mixins } from '../../styles/designSystem';

/**
 * 用户服务协议页面
 * 符合微信小程序和抖音小程序的用户协议要求
 */
const UserAgreementPage: React.FC = () => {
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
        <h1 style={styles.title}>用户服务协议</h1>
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
            欢迎使用{config.appName}（以下简称"本应用"）！本用户服务协议（以下简称"本协议"）
            是您与{config.developer}（以下简称"我们"）之间关于使用本应用服务的法律协议。
          </p>
          <p style={styles.paragraph}>
            请您在使用本应用前仔细阅读并充分理解本协议的全部内容。
            您使用本应用即表示您已阅读、理解并同意接受本协议的约束。
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>一、服务内容</h2>
          <p style={styles.paragraph}>本应用提供以下服务：</p>
          <ul style={styles.list}>
            <li style={styles.listItem}>将用户上传的图片转换为拼豆图案</li>
            <li style={styles.listItem}>提供多种拼豆品牌和色板选择</li>
            <li style={styles.listItem}>图案编辑和修改功能</li>
            <li style={styles.listItem}>珠子统计和采购清单生成</li>
            <li style={styles.listItem}>图案导出和保存功能</li>
            <li style={styles.listItem}>制作辅助模式</li>
          </ul>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>二、用户账户</h2>
          <h3 style={styles.subTitle}>2.1 账户注册</h3>
          <ul style={styles.list}>
            <li style={styles.listItem}>您可以选择注册账户以使用云端同步等高级功能</li>
            <li style={styles.listItem}>注册时应提供真实、准确、完整的信息</li>
            <li style={styles.listItem}>您有责任保管好账户密码，并对账户下的所有活动负责</li>
          </ul>

          <h3 style={styles.subTitle}>2.2 账户安全</h3>
          <ul style={styles.list}>
            <li style={styles.listItem}>请妥善保管账户信息，不要将密码告知他人</li>
            <li style={styles.listItem}>如发现账户被盗用，请立即联系我们</li>
            <li style={styles.listItem}>因您保管不善导致的损失由您自行承担</li>
          </ul>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>三、用户行为规范</h2>
          <p style={styles.paragraph}>您在使用本应用时应遵守以下规范：</p>
          <ul style={styles.list}>
            <li style={styles.listItem}>遵守中华人民共和国法律法规</li>
            <li style={styles.listItem}>不上传违法、侵权或不当内容的图片</li>
            <li style={styles.listItem}>不利用本应用从事任何违法或侵权活动</li>
            <li style={styles.listItem}>不干扰或破坏本应用的正常运行</li>
            <li style={styles.listItem}>不进行任何可能损害本应用或其他用户利益的行为</li>
          </ul>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>四、知识产权</h2>
          <h3 style={styles.subTitle}>4.1 应用知识产权</h3>
          <p style={styles.paragraph}>
            本应用的所有内容（包括但不限于软件、代码、界面设计、图标、文字等）的知识产权归我们所有，
            受中华人民共和国知识产权法律保护。
          </p>

          <h3 style={styles.subTitle}>4.2 用户内容</h3>
          <ul style={styles.list}>
            <li style={styles.listItem}>您上传的图片及生成的图案的知识产权归您所有</li>
            <li style={styles.listItem}>您应确保上传的图片不侵犯他人的知识产权</li>
            <li style={styles.listItem}>您授予我们处理您上传图片的必要权限（仅用于生成图案）</li>
          </ul>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>五、服务的变更与终止</h2>
          <ul style={styles.list}>
            <li style={styles.listItem}>
              我们保留随时修改、暂停或终止服务的权利，无需提前通知。
            </li>
            <li style={styles.listItem}>
              如您违反本协议，我们有权限制或终止您使用本应用的权利。
            </li>
            <li style={styles.listItem}>
              服务终止后，我们不承担因此给您造成的任何损失。
            </li>
          </ul>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>六、免责声明</h2>
          <ul style={styles.list}>
            <li style={styles.listItem}>
              本应用按"现状"提供服务，不作任何明示或暗示的保证。
            </li>
            <li style={styles.listItem}>
              因网络、设备等原因导致的服务中断或数据丢失，我们不承担责任。
            </li>
            <li style={styles.listItem}>
              因您使用本应用生成的图案进行的后续创作或商业活动，我们不承担任何责任。
            </li>
            <li style={styles.listItem}>
              对于您使用本应用产生的任何直接或间接损失，我们不承担责任。
            </li>
          </ul>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>七、隐私保护</h2>
          <p style={styles.paragraph}>
            我们重视对您个人信息的保护。关于个人信息的收集、使用、存储和保护，
            请参阅我们的<span style={styles.link} onClick={() => navigate('/mobile/privacy-policy')}>《隐私政策》</span>。
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>八、协议的修改</h2>
          <p style={styles.paragraph}>
            我们保留随时修改本协议的权利。修改后的协议将在本页面公布，
            并在公布时立即生效。继续使用本应用即表示您接受修改后的协议。
            如您不同意修改后的协议，请停止使用本应用。
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>九、法律适用与争议解决</h2>
          <ul style={styles.list}>
            <li style={styles.listItem}>
              本协议的解释、效力及争议的解决均适用中华人民共和国法律。
            </li>
            <li style={styles.listItem}>
              因本协议产生的任何争议，双方应首先协商解决。
            </li>
            <li style={styles.listItem}>
              协商不成的，任何一方均可向有管辖权的人民法院提起诉讼。
            </li>
          </ul>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>十、联系我们</h2>
          <p style={styles.paragraph}>
            如您对本协议有任何疑问，请通过以下方式联系我们：
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

  link: {
    color: colors.bead.cyan,
    textDecoration: 'underline',
    cursor: 'pointer',
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

export default UserAgreementPage;
