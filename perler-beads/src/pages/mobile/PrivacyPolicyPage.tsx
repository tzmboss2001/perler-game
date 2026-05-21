import React from 'react';
import { ArrowLeft } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { radius, typography, mixins } from '../../styles/designSystem';
import { LEGAL_INFO } from '../../config/legalInfo';

const sections = [
  {
    title: '一、适用范围',
    body: ['本隐私政策适用于 ' + LEGAL_INFO.appName + ' 在向您提供图片导入、拼豆图生成、编辑、制作辅助、社区发布与浏览等服务过程中，对您个人信息的收集、使用、存储与保护。'],
  },
  {
    title: '二、我们收集的信息',
    items: [
      '账号信息：邮箱、昵称、头像等，用于注册、登录、身份识别和社区展示。',
      '创作与作品数据：您上传的图片、生成的图纸、制作进度、社区发布内容、成品图片，以及 3D 功能中上传的参考图、深度图或切片模板数据。',
      '互动与治理数据：您提交的反馈内容、社区举报原因、审核处理记录等，用于问题回复、内容治理和风险排查。',
      '设备与日志信息：设备型号、浏览器信息、错误日志，用于排查故障和优化体验。',
      '本地缓存数据：草稿、最近一次制作状态、拍照同步进度等，用于提升连续使用体验。',
    ],
  },
  {
    title: '三、权限使用说明',
    items: [
      '相册或文件读取：用于导入图片生成拼豆图，上传成品图片、社区作品封面、反馈附图，以及 3D 功能中上传参考图或深度图。',
      '摄像头：用于拍照创作，以及制作模式中拍照同步进度时拍摄或上传当前板照片。',
      '网络访问：用于同步账号、社区内容、作品数据、反馈与举报处理，以及审核治理相关信息。',
    ],
  },
  {
    title: '四、信息使用目的',
    items: [
      '为您提供图案生成、编辑、保存、制作辅助和社区互动服务。',
      '保障平台安全，包括登录校验、异常排查、防滥用和内容治理。',
      '改进产品体验，包括性能优化、稳定性修复和功能迭代。',
    ],
  },
  {
    title: '五、信息存储与保护',
    body: ['我们会采取合理的技术与管理措施保护您的数据安全，包括访问控制、最小权限、传输保护与日志审计。对于保存在本地设备中的缓存与草稿，您可通过应用内清理功能或清除浏览器数据的方式进行删除。'],
  },
  {
    title: '六、信息共享与披露',
    body: ['未经您授权，我们不会向无关第三方出售您的个人信息。仅在法律法规要求、监管要求、保障公共安全，或维护平台与其他用户合法权益的必要范围内，依法进行披露。'],
  },
  {
    title: '七、您的权利',
    items: [
      '您可以查看、修改或删除您的账号资料和公开发布内容。',
      '您可以申请注销账号，并要求删除与账号相关的可删除数据。',
      '您可以通过反馈渠道联系我们，咨询、投诉或提出隐私相关问题。',
    ],
  },
  {
    title: '八、联系我们',
    body: ['开发者：' + LEGAL_INFO.developerName, '联系邮箱：' + LEGAL_INFO.contactEmail],
  },
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

export default PrivacyPolicyPage;
