/**
 * 模板流程页面
 * 完整流程：上传图片 → 选模板 → 自动提取颜色 → 3D预览 → 导出图纸
 */

import React, { useState, useEffect, useRef, CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Upload,
  Cube,
  Play,
  Download,
  CaretLeft,
  CaretRight,
  Sliders,
  List,
} from '@phosphor-icons/react';
import {
  instantiateTemplate,
  expandedTemplateToLayers,
  getAvailableTemplates,
  loadTemplate,
} from '../../../services/template/templateService';
import { extractColorsForTemplate } from '../../../services/template/colorExtractService';
import { renderLayerToCanvas } from '../../../services/3d/sliceService';
import { ExpandedTemplate, UserParams, UserColors, Template } from '../../../types/template';
import { Layer } from '../../../types/3d/voxel';
import Voxel3DViewer from '../../../components/3d/Voxel3DViewer';

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
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center' as const,
    fontSize: '18px',
    fontWeight: 'bold',
  },
  content: {
    padding: '20px',
  },
  card: {
    background: 'white',
    borderRadius: '16px',
    padding: '20px',
    marginBottom: '20px',
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    marginBottom: '15px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  stepIndicator: {
    display: 'flex',
    justifyContent: 'center',
    gap: '8px',
    marginBottom: '20px',
  },
  stepDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    background: '#ddd',
  },
  stepDotActive: {
    background: '#667eea',
  },
  uploadArea: {
    border: '2px dashed #ddd',
    borderRadius: '12px',
    padding: '40px 20px',
    textAlign: 'center' as const,
    cursor: 'pointer',
  },
  uploadAreaActive: {
    borderColor: '#667eea',
    background: '#f8f9ff',
  },
  uploadIcon: {
    color: '#667eea',
    marginBottom: '10px',
  },
  uploadText: {
    color: '#666',
    fontSize: '14px',
  },
  previewImage: {
    width: '100%',
    maxHeight: '200px',
    objectFit: 'contain' as const,
    borderRadius: '8px',
  },
  templateGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px',
  },
  templateCard: {
    border: '2px solid #eee',
    borderRadius: '12px',
    padding: '15px',
    textAlign: 'center' as const,
    cursor: 'pointer',
  },
  templateCardActive: {
    borderColor: '#667eea',
    background: '#f8f9ff',
  },
  templateName: {
    fontSize: '14px',
    fontWeight: 'bold',
    marginTop: '8px',
  },
  templateDesc: {
    fontSize: '12px',
    color: '#888',
    marginTop: '4px',
  },
  colorPreview: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '8px',
    marginTop: '10px',
  },
  colorItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
  },
  colorSwatch: {
    width: '20px',
    height: '20px',
    borderRadius: '4px',
    border: '1px solid #ddd',
  },
  layerNav: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '15px',
  },
  layerNavButton: {
    background: '#f5f5f5',
    border: 'none',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  layerInfo: {
    textAlign: 'center' as const,
  },
  layerNumber: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#667eea',
  },
  layerLabel: {
    fontSize: '12px',
    color: '#888',
  },
  canvasContainer: {
    display: 'flex',
    justifyContent: 'center',
    background: '#f5f5f5',
    borderRadius: '12px',
    padding: '10px',
    overflow: 'auto',
  },
  statsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid #f0f0f0',
    fontSize: '14px',
  },
  button: {
    width: '100%',
    padding: '15px',
    borderRadius: '12px',
    border: 'none',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  primaryButton: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
  },
  secondaryButton: {
    background: '#f5f5f5',
    color: '#333',
  },
  buttonGroup: {
    display: 'flex',
    gap: '10px',
  },
  loading: {
    textAlign: 'center' as const,
    padding: '40px',
    color: '#888',
  },
};

// 步骤枚举
type FlowStep = 'upload' | 'template' | 'preview';

export default function TemplateFlowPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 流程状态
  const [step, setStep] = useState<FlowStep>('upload');
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);

  // 模板相关
  const templates = getAvailableTemplates();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [template, setTemplate] = useState<Template | null>(null);

  // 生成结果
  const [expanded, setExpanded] = useState<ExpandedTemplate | null>(null);
  const [layers, setLayers] = useState<Layer[]>([]);
  const [extractedColors, setExtractedColors] = useState<UserColors>({});
  const [currentLayer, setCurrentLayer] = useState(0);
  const [layerCanvas, setLayerCanvas] = useState<string | null>(null);

  // UI状态
  const [isLoading, setIsLoading] = useState(false);
  const [show3DViewer, setShow3DViewer] = useState(false);

  // 处理图片上传
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setImageDataUrl(dataUrl);
      setStep('template');
    };
    reader.readAsDataURL(file);
  };

  // 选择模板并处理
  const handleSelectTemplate = async (templateId: string) => {
    setSelectedTemplateId(templateId);
    setIsLoading(true);

    try {
      // 加载模板
      const tpl = await loadTemplate(templateId);
      setTemplate(tpl);

      // 从图片提取颜色
      if (imageDataUrl) {
        const colors = await extractColorsForTemplate(imageDataUrl, tpl);
        setExtractedColors(colors);

        // 生成模型
        const result = await instantiateTemplate(templateId, {}, colors);
        setExpanded(result);

        // 转换为Layer
        const layerData = expandedTemplateToLayers(result);
        setLayers(layerData);
        setCurrentLayer(0);

        // 进入预览步骤
        setStep('preview');
      }
    } catch (error) {
      console.error('处理失败:', error);
      alert('处理失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  // 渲染当前层
  useEffect(() => {
    if (layers.length > 0 && currentLayer < layers.length) {
      const canvas = renderLayerToCanvas(layers[currentLayer], 12, true);
      setLayerCanvas(canvas.toDataURL());
    }
  }, [layers, currentLayer]);

  // 下载当前层
  const handleDownloadLayer = () => {
    if (!layerCanvas) return;
    const link = document.createElement('a');
    link.download = `template_layer_${currentLayer + 1}.png`;
    link.href = layerCanvas;
    link.click();
  };

  // 下载全部层
  const handleDownloadAll = () => {
    layers.forEach((layer, index) => {
      const canvas = renderLayerToCanvas(layer, 15, true);
      const link = document.createElement('a');
      link.download = `template_layer_${index + 1}.png`;
      link.href = canvas.toDataURL();
      link.click();
    });
  };

  // 渲染上传步骤
  const renderUploadStep = () => (
    <div style={styles.card}>
      <div style={styles.cardTitle}>
        <Upload size={20} />
        上传图片
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
      <div
        style={{
          ...styles.uploadArea,
          ...(imageDataUrl ? styles.uploadAreaActive : {}),
        }}
        onClick={() => fileInputRef.current?.click()}
      >
        {imageDataUrl ? (
          <img src={imageDataUrl} alt="预览" style={styles.previewImage} />
        ) : (
          <>
            <Upload size={48} style={styles.uploadIcon} />
            <p style={styles.uploadText}>点击上传图片</p>
            <p style={{ ...styles.uploadText, fontSize: '12px' }}>
              支持 PNG、JPG 格式
            </p>
          </>
        )}
      </div>
      {imageDataUrl && (
        <button
          style={{ ...styles.button, ...styles.primaryButton, marginTop: '15px' }}
          onClick={() => setStep('template')}
        >
          下一步：选择模板
        </button>
      )}
    </div>
  );

  // 渲染模板选择步骤
  const renderTemplateStep = () => (
    <>
      {/* 已上传的图片预览 */}
      <div style={styles.card}>
        <div style={styles.cardTitle}>已上传图片</div>
        {imageDataUrl && (
          <img src={imageDataUrl} alt="预览" style={styles.previewImage} />
        )}
      </div>

      {/* 模板选择 */}
      <div style={styles.card}>
        <div style={styles.cardTitle}>
          <Cube size={20} />
          选择模板
        </div>
        <div style={styles.templateGrid}>
          {templates.map((t) => (
            <div
              key={t.id}
              style={{
                ...styles.templateCard,
                ...(selectedTemplateId === t.id ? styles.templateCardActive : {}),
              }}
              onClick={() => handleSelectTemplate(t.id)}
            >
              <Cube size={32} color="#667eea" />
              <div style={styles.templateName}>{t.name}</div>
              <div style={styles.templateDesc}>{t.category}</div>
            </div>
          ))}
        </div>
      </div>

      {isLoading && (
        <div style={styles.loading}>
          <p>正在处理图片...</p>
          <p style={{ fontSize: '12px' }}>提取颜色并生成3D模型</p>
        </div>
      )}
    </>
  );

  // 渲染预览步骤
  const renderPreviewStep = () => (
    <>
      {/* 提取的颜色 */}
      <div style={styles.card}>
        <div style={styles.cardTitle}>
          <Sliders size={20} />
          提取的颜色
        </div>
        <div style={styles.colorPreview}>
          {Object.entries(extractedColors).map(([slot, color]) => (
            <div key={slot} style={styles.colorItem}>
              <div style={{ ...styles.colorSwatch, background: color }} />
              <span>{template?.color_slots[slot]?.description || slot}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 图层预览 */}
      <div style={styles.card}>
        <div style={styles.cardTitle}>图层预览</div>
        <div style={styles.layerNav}>
          <button
            style={styles.layerNavButton}
            onClick={() => setCurrentLayer(Math.max(0, currentLayer - 1))}
            disabled={currentLayer === 0}
          >
            <CaretLeft size={20} />
          </button>
          <div style={styles.layerInfo}>
            <div style={styles.layerNumber}>第 {currentLayer + 1} 层</div>
            <div style={styles.layerLabel}>共 {layers.length} 层</div>
          </div>
          <button
            style={styles.layerNavButton}
            onClick={() => setCurrentLayer(Math.min(layers.length - 1, currentLayer + 1))}
            disabled={currentLayer === layers.length - 1}
          >
            <CaretRight size={20} />
          </button>
        </div>
        <div style={styles.canvasContainer}>
          {layerCanvas && (
            <img
              src={layerCanvas}
              alt={`第${currentLayer + 1}层`}
              style={{ maxWidth: '100%', imageRendering: 'pixelated' }}
            />
          )}
        </div>
      </div>

      {/* 统计信息 */}
      {expanded && (
        <div style={styles.card}>
          <div style={styles.cardTitle}>
            <List size={20} />
            统计信息
          </div>
          <div style={styles.statsRow}>
            <span>体素总数</span>
            <span style={{ fontWeight: 'bold', color: '#667eea' }}>
              {expanded.voxels.length} 颗
            </span>
          </div>
          <div style={styles.statsRow}>
            <span>尺寸</span>
            <span style={{ fontWeight: 'bold' }}>
              {expanded.dimensions.x} × {expanded.dimensions.y} × {expanded.dimensions.z}
            </span>
          </div>
          <div style={styles.statsRow}>
            <span>层数</span>
            <span style={{ fontWeight: 'bold' }}>{layers.length} 层</span>
          </div>
        </div>
      )}

      {/* 3D预览按钮 */}
      <button
        style={{
          ...styles.button,
          background: 'linear-gradient(135deg, #00d9ff 0%, #667eea 100%)',
          color: 'white',
          marginBottom: '15px',
        }}
        onClick={() => setShow3DViewer(true)}
      >
        <Play size={20} />
        查看3D实物效果
      </button>

      {/* 下载按钮 */}
      <div style={styles.buttonGroup}>
        <button
          style={{ ...styles.button, ...styles.secondaryButton, flex: 1 }}
          onClick={handleDownloadLayer}
        >
          <Download size={18} />
          下载当前层
        </button>
        <button
          style={{ ...styles.button, ...styles.primaryButton, flex: 1 }}
          onClick={handleDownloadAll}
        >
          <Download size={18} />
          下载全部
        </button>
      </div>

      {/* 重新开始 */}
      <button
        style={{
          ...styles.button,
          ...styles.secondaryButton,
          marginTop: '15px',
        }}
        onClick={() => {
          setStep('upload');
          setImageDataUrl(null);
          setSelectedTemplateId('');
          setExpanded(null);
          setLayers([]);
        }}
      >
        重新开始
      </button>
    </>
  );

  return (
    <div style={styles.container}>
      {/* 头部 */}
      <div style={styles.header}>
        <button style={styles.backButton} onClick={() => navigate('/mobile/3d')}>
          <ArrowLeft size={24} />
        </button>
        <span style={styles.headerTitle}>3D模板生成</span>
        <div style={{ width: 40 }} />
      </div>

      {/* 步骤指示器 */}
      <div style={styles.stepIndicator}>
        <div style={{ ...styles.stepDot, ...(step === 'upload' ? styles.stepDotActive : {}) }} />
        <div style={{ ...styles.stepDot, ...(step === 'template' ? styles.stepDotActive : {}) }} />
        <div style={{ ...styles.stepDot, ...(step === 'preview' ? styles.stepDotActive : {}) }} />
      </div>

      <div style={styles.content}>
        {step === 'upload' && renderUploadStep()}
        {step === 'template' && renderTemplateStep()}
        {step === 'preview' && renderPreviewStep()}
      </div>

      {/* 3D预览弹窗 */}
      {show3DViewer && layers.length > 0 && (
        <Voxel3DViewer layers={layers} onClose={() => setShow3DViewer(false)} />
      )}
    </div>
  );
}
