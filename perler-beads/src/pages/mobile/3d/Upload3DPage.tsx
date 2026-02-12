/**
 * 3D上传页面
 * 用户上传图片，开始浮雕模式生成
 */

import { useState, useRef, CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, Camera, Image as ImageIcon, Spinner } from '@phosphor-icons/react';
import { generateMockDepth } from '../../../services/3d/depthService';

const styles: Record<string, CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: '#f8f9fa',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    padding: '15px 20px',
    background: 'white',
    borderBottom: '1px solid #eee',
  },
  backButton: {
    background: 'none',
    border: 'none',
    padding: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center' as const,
    fontSize: '18px',
    fontWeight: 'bold',
    marginRight: '40px',
  },
  content: {
    padding: '20px',
  },
  uploadArea: {
    background: 'white',
    borderRadius: '16px',
    padding: '40px 20px',
    textAlign: 'center' as const,
    border: '2px dashed #ddd',
    marginBottom: '20px',
  },
  uploadAreaActive: {
    borderColor: '#667eea',
    background: '#f8f9ff',
  },
  uploadIcon: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 20px',
  },
  uploadTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '10px',
  },
  uploadDesc: {
    fontSize: '14px',
    color: '#888',
    marginBottom: '20px',
  },
  uploadButtons: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'center',
  },
  uploadButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 24px',
    borderRadius: '25px',
    border: 'none',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  previewArea: {
    background: 'white',
    borderRadius: '16px',
    padding: '20px',
    marginBottom: '20px',
  },
  previewImage: {
    width: '100%',
    borderRadius: '12px',
    marginBottom: '15px',
  },
  configSection: {
    background: 'white',
    borderRadius: '16px',
    padding: '20px',
    marginBottom: '20px',
  },
  configTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    marginBottom: '15px',
    color: '#333',
  },
  configItem: {
    marginBottom: '20px',
  },
  configLabel: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  configLabelText: {
    fontSize: '14px',
    color: '#555',
  },
  configValue: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#667eea',
  },
  slider: {
    width: '100%',
    height: '6px',
    appearance: 'none' as const,
    background: '#e0e0e0',
    borderRadius: '3px',
    outline: 'none',
  },
  generateButton: {
    width: '100%',
    padding: '16px',
    borderRadius: '12px',
    border: 'none',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
  },
  disabledButton: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  tips: {
    background: '#fff8e6',
    borderRadius: '12px',
    padding: '15px',
    marginBottom: '20px',
  },
  tipsTitle: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#e6a23c',
    marginBottom: '8px',
  },
  tipsList: {
    fontSize: '13px',
    color: '#666',
    lineHeight: 1.6,
    margin: 0,
    paddingLeft: '20px',
  },
};

export default function Upload3DPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 配置参数
  const [gridWidth, setGridWidth] = useState(29);
  const [maxDepth, setMaxDepth] = useState(5);
  const [depthThreshold, setDepthThreshold] = useState(20);

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setImageDataUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleGenerate = async () => {
    if (!imageDataUrl) return;

    setIsLoading(true);

    try {
      // 使用模拟深度（后续接入真实API）
      const depthData = await generateMockDepth(imageDataUrl);

      // 将数据存储到 sessionStorage，传递给下一个页面
      sessionStorage.setItem('3d_image', imageDataUrl);
      sessionStorage.setItem('3d_depth', JSON.stringify(depthData));
      sessionStorage.setItem('3d_config', JSON.stringify({
        gridWidth,
        maxDepth,
        depthThreshold,
        mode: '浮雕',
      }));

      navigate('/mobile/3d/preview');
    } catch (error) {
      console.error('生成失败:', error);
      alert('生成失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* 头部 */}
      <div style={styles.header}>
        <button style={styles.backButton} onClick={() => navigate('/mobile/3d')}>
          <ArrowLeft size={24} />
        </button>
        <span style={styles.headerTitle}>浮雕模式</span>
      </div>

      <div style={styles.content}>
        {/* 提示 */}
        <div style={styles.tips}>
          <div style={styles.tipsTitle}>💡 拍照建议</div>
          <ul style={styles.tipsList}>
            <li>选择主体清晰、背景简单的图片</li>
            <li>正面拍摄效果最佳</li>
            <li>透明背景的图片可以自动去除背景</li>
          </ul>
        </div>

        {/* 上传区域 */}
        {!imageDataUrl ? (
          <div style={styles.uploadArea}>
            <div style={styles.uploadIcon}>
              <Upload size={36} color="white" />
            </div>
            <div style={styles.uploadTitle}>上传图片</div>
            <div style={styles.uploadDesc}>支持 JPG、PNG、WebP 格式</div>
            <div style={styles.uploadButtons}>
              <button
                style={{
                  ...styles.uploadButton,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                }}
                onClick={handleUploadClick}
              >
                <ImageIcon size={18} />
                选择图片
              </button>
              <button
                style={{
                  ...styles.uploadButton,
                  background: '#f5f5f5',
                  color: '#333',
                }}
                onClick={handleUploadClick}
              >
                <Camera size={18} />
                拍照
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
          </div>
        ) : (
          /* 预览区域 */
          <div style={styles.previewArea}>
            <img src={imageDataUrl} alt="预览" style={styles.previewImage} />
            <button
              style={{
                ...styles.uploadButton,
                background: '#f5f5f5',
                color: '#333',
                width: '100%',
                justifyContent: 'center',
              }}
              onClick={handleUploadClick}
            >
              重新选择
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
          </div>
        )}

        {/* 配置区域 */}
        <div style={styles.configSection}>
          <div style={styles.configTitle}>生成参数</div>

          <div style={styles.configItem}>
            <div style={styles.configLabel}>
              <span style={styles.configLabelText}>图纸宽度</span>
              <span style={styles.configValue}>{gridWidth} 格</span>
            </div>
            <input
              type="range"
              min="15"
              max="50"
              value={gridWidth}
              onChange={(e) => setGridWidth(Number(e.target.value))}
              style={styles.slider}
            />
          </div>

          <div style={styles.configItem}>
            <div style={styles.configLabel}>
              <span style={styles.configLabelText}>最大层数</span>
              <span style={styles.configValue}>{maxDepth} 层</span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              value={maxDepth}
              onChange={(e) => setMaxDepth(Number(e.target.value))}
              style={styles.slider}
            />
          </div>

          <div style={styles.configItem}>
            <div style={styles.configLabel}>
              <span style={styles.configLabelText}>背景阈值</span>
              <span style={styles.configValue}>{depthThreshold}</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={depthThreshold}
              onChange={(e) => setDepthThreshold(Number(e.target.value))}
              style={styles.slider}
            />
          </div>
        </div>

        {/* 生成按钮 */}
        <button
          style={{
            ...styles.generateButton,
            ...((!imageDataUrl || isLoading) ? styles.disabledButton : {}),
          }}
          onClick={handleGenerate}
          disabled={!imageDataUrl || isLoading}
        >
          {isLoading ? (
            <>
              <Spinner size={20} className="spin" />
              生成中...
            </>
          ) : (
            <>生成3D图纸</>
          )}
        </button>
      </div>
    </div>
  );
}
