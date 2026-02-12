/**
 * 3D拼豆功能首页
 */

import { useNavigate } from 'react-router-dom';
import { CSSProperties } from 'react';
import { Cube, Image, Stack, ArrowLeft, Blueprint } from '@phosphor-icons/react';

const styles: Record<string, CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '20px',
    paddingBottom: '100px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '30px',
    color: 'white',
  },
  backButton: {
    background: 'rgba(255,255,255,0.2)',
    border: 'none',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    marginRight: '15px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    margin: 0,
  },
  subtitle: {
    fontSize: '14px',
    opacity: 0.8,
    marginTop: '5px',
  },
  card: {
    background: 'white',
    borderRadius: '20px',
    padding: '25px',
    marginBottom: '20px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '15px',
  },
  cardIcon: {
    width: '50px',
    height: '50px',
    borderRadius: '15px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: '15px',
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    margin: 0,
    color: '#333',
  },
  cardDesc: {
    fontSize: '14px',
    color: '#666',
    marginTop: '5px',
  },
  cardBody: {
    fontSize: '14px',
    color: '#888',
    lineHeight: 1.6,
    marginBottom: '20px',
  },
  cardButton: {
    width: '100%',
    padding: '15px',
    border: 'none',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  featureList: {
    listStyle: 'none',
    padding: 0,
    margin: '15px 0',
  },
  featureItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 0',
    fontSize: '14px',
    color: '#555',
  },
  featureDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    marginRight: '10px',
  },
  comingSoon: {
    background: '#f5f5f5',
    color: '#999',
    padding: '8px 15px',
    borderRadius: '20px',
    fontSize: '12px',
    display: 'inline-block',
    marginTop: '10px',
  },
};

export default function Home3DPage() {
  const navigate = useNavigate();

  return (
    <div style={styles.container}>
      {/* 头部 */}
      <div style={styles.header}>
        <button style={styles.backButton} onClick={() => navigate('/mobile/home')}>
          <ArrowLeft size={20} color="white" />
        </button>
        <div>
          <h1 style={styles.title}>3D拼豆工坊</h1>
          <p style={styles.subtitle}>将图片变成立体拼豆作品</p>
        </div>
      </div>

      {/* 浮雕模式卡片 */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <div style={{ ...styles.cardIcon, background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
            <Image size={28} color="white" />
          </div>
          <div>
            <h2 style={styles.cardTitle}>浮雕模式</h2>
            <p style={styles.cardDesc}>单张图片 → 立体浮雕</p>
          </div>
        </div>

        <p style={styles.cardBody}>
          上传一张正面图片，AI 自动分析深度，生成正面有凹凸细节、背面平整的立体浮雕图纸。
        </p>

        <ul style={styles.featureList}>
          <li style={styles.featureItem}>
            <span style={{ ...styles.featureDot, background: '#f5576c' }} />
            适合冰箱贴、挂墙装饰
          </li>
          <li style={styles.featureItem}>
            <span style={{ ...styles.featureDot, background: '#f5576c' }} />
            制作简单，效果惊艳
          </li>
          <li style={styles.featureItem}>
            <span style={{ ...styles.featureDot, background: '#f5576c' }} />
            AI 深度估计，自动处理
          </li>
        </ul>

        <button
          style={{
            ...styles.cardButton,
            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            color: 'white',
          }}
          onClick={() => navigate('/mobile/3d/upload')}
        >
          <Cube size={20} />
          开始制作浮雕
        </button>
      </div>

      {/* 完整3D模式卡片 */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <div style={{ ...styles.cardIcon, background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
            <Stack size={28} color="white" />
          </div>
          <div>
            <h2 style={styles.cardTitle}>完整3D模式</h2>
            <p style={styles.cardDesc}>多角度图片 → 完整立体</p>
          </div>
        </div>

        <p style={styles.cardBody}>
          上传正面、背面、侧面等多角度图片，生成可360°观看的完整立体拼豆作品。
        </p>

        <ul style={styles.featureList}>
          <li style={styles.featureItem}>
            <span style={{ ...styles.featureDot, background: '#4facfe' }} />
            适合桌面摆件、手办
          </li>
          <li style={styles.featureItem}>
            <span style={{ ...styles.featureDot, background: '#4facfe' }} />
            360°完整立体效果
          </li>
          <li style={styles.featureItem}>
            <span style={{ ...styles.featureDot, background: '#4facfe' }} />
            多角度深度融合
          </li>
        </ul>

        <span style={styles.comingSoon}>即将推出</span>
      </div>

      {/* 3D模型转图纸卡片 */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <div style={{ ...styles.cardIcon, background: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)' }}>
            <Blueprint size={28} color="white" />
          </div>
          <div>
            <h2 style={styles.cardTitle}>3D模型转图纸</h2>
            <p style={styles.cardDesc}>GLB模型 → 插片式图纸</p>
          </div>
        </div>

        <p style={styles.cardBody}>
          导入现成的3D模型（GLB格式），自动体素化并生成十字交叉插片图纸，可直接制作立体拼豆作品。
        </p>

        <ul style={styles.featureList}>
          <li style={styles.featureItem}>
            <span style={{ ...styles.featureDot, background: '#a18cd1' }} />
            支持GLB格式3D模型
          </li>
          <li style={styles.featureItem}>
            <span style={{ ...styles.featureDot, background: '#a18cd1' }} />
            自动生成十字插片图纸
          </li>
          <li style={styles.featureItem}>
            <span style={{ ...styles.featureDot, background: '#a18cd1' }} />
            带卡槽标记，方便组装
          </li>
        </ul>

        <button
          style={{
            ...styles.cardButton,
            background: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
            color: 'white',
          }}
          onClick={() => navigate('/mobile/3d/model-to-slices')}
        >
          <Blueprint size={20} />
          开始制作图纸
        </button>
      </div>
    </div>
  );
}
