/**
 * 模板测试页面
 * 用于验证模板系统的展开和渲染效果
 */

import { useState, useEffect, CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Cube, Play, Sliders } from '@phosphor-icons/react';
import {
  instantiateTemplate,
  expandedTemplateToLayers,
  getAvailableTemplates,
} from '../../../services/template/templateService';
import { ExpandedTemplate, UserParams, UserColors, TemplateParam, ColorSlotDef } from '../../../types/template';
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
  select: {
    width: '100%',
    padding: '12px',
    fontSize: '16px',
    borderRadius: '8px',
    border: '1px solid #ddd',
    marginBottom: '15px',
  },
  paramRow: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '12px',
  },
  paramLabel: {
    flex: 1,
    fontSize: '14px',
    color: '#333',
  },
  paramValue: {
    width: '50px',
    textAlign: 'right' as const,
    fontSize: '14px',
    color: '#667eea',
    fontWeight: 'bold',
  },
  slider: {
    width: '120px',
    marginLeft: '10px',
  },
  colorRow: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '12px',
  },
  colorLabel: {
    flex: 1,
    fontSize: '14px',
    color: '#333',
  },
  colorInput: {
    width: '50px',
    height: '36px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  statsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '10px 0',
    borderBottom: '1px solid #f0f0f0',
  },
  statsLabel: {
    color: '#666',
    fontSize: '14px',
  },
  statsValue: {
    fontWeight: 'bold',
    color: '#333',
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
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
  },
  loading: {
    textAlign: 'center' as const,
    padding: '40px',
    color: '#888',
  },
};

export default function TemplateTestPage() {
  const navigate = useNavigate();

  // 可用模板列表
  const templates = getAvailableTemplates();

  // 状态
  const [selectedTemplateId, setSelectedTemplateId] = useState(templates[0]?.id || '');
  const [expanded, setExpanded] = useState<ExpandedTemplate | null>(null);
  const [layers, setLayers] = useState<Layer[]>([]);
  const [params, setParams] = useState<UserParams>({});
  const [colors, setColors] = useState<UserColors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [show3DViewer, setShow3DViewer] = useState(false);

  // 加载模板
  const loadAndExpand = async () => {
    if (!selectedTemplateId) return;

    setIsLoading(true);
    try {
      const result = await instantiateTemplate(selectedTemplateId, params, colors);
      setExpanded(result);

      // 转换为Layer格式
      const layerData = expandedTemplateToLayers(result);
      setLayers(layerData);

      // 初始化参数和颜色（如果是首次加载）
      if (Object.keys(params).length === 0) {
        const defaultParams: UserParams = {};
        for (const [key, def] of Object.entries(result.template.params)) {
          defaultParams[key] = def.default;
        }
        setParams(defaultParams);
      }

      if (Object.keys(colors).length === 0) {
        const defaultColors: UserColors = {};
        for (const [key, def] of Object.entries(result.template.color_slots)) {
          defaultColors[key] = def.default;
        }
        setColors(defaultColors);
      }
    } catch (error) {
      console.error('加载模板失败:', error);
      alert('加载模板失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 初始加载
  useEffect(() => {
    loadAndExpand();
  }, [selectedTemplateId]);

  // 参数变化时重新生成
  useEffect(() => {
    if (expanded) {
      loadAndExpand();
    }
  }, [params, colors]);

  // 处理参数变化
  const handleParamChange = (key: string, value: number) => {
    setParams(prev => ({ ...prev, [key]: value }));
  };

  // 处理颜色变化
  const handleColorChange = (key: string, value: string) => {
    setColors(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div style={styles.container}>
      {/* 头部 */}
      <div style={styles.header}>
        <button style={styles.backButton} onClick={() => navigate('/mobile')}>
          <ArrowLeft size={24} />
        </button>
        <span style={styles.headerTitle}>模板测试</span>
        <div style={{ width: 40 }} />
      </div>

      <div style={styles.content}>
        {/* 模板选择 */}
        <div style={styles.card}>
          <div style={styles.cardTitle}>
            <Cube size={20} />
            选择模板
          </div>
          <select
            style={styles.select}
            value={selectedTemplateId}
            onChange={(e) => {
              setSelectedTemplateId(e.target.value);
              setParams({});
              setColors({});
            }}
          >
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.category})
              </option>
            ))}
          </select>
        </div>

        {/* 参数调整 */}
        {expanded && Object.keys(expanded.template.params).length > 0 && (
          <div style={styles.card}>
            <div style={styles.cardTitle}>
              <Sliders size={20} />
              参数调整
            </div>
            {Object.entries(expanded.template.params).map(([key, defRaw]) => {
              const def = defRaw as TemplateParam;
              return (
                <div key={key} style={styles.paramRow}>
                  <span style={styles.paramLabel}>{def.description || key}</span>
                  <span style={styles.paramValue}>{(params[key] ?? def.default).toFixed(1)}</span>
                  <input
                    type="range"
                    style={styles.slider}
                    min={def.min}
                    max={def.max}
                    step={0.1}
                    value={params[key] ?? def.default}
                    onChange={(e) => handleParamChange(key, parseFloat(e.target.value))}
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* 颜色调整 */}
        {expanded && Object.keys(expanded.template.color_slots).length > 0 && (
          <div style={styles.card}>
            <div style={styles.cardTitle}>
              颜色调整
            </div>
            {Object.entries(expanded.template.color_slots).map(([key, defRaw]) => {
              const def = defRaw as ColorSlotDef;
              return (
                <div key={key} style={styles.colorRow}>
                  <span style={styles.colorLabel}>{def.description || key}</span>
                  <input
                    type="color"
                    style={styles.colorInput}
                    value={colors[key] ?? def.default}
                    onChange={(e) => handleColorChange(key, e.target.value)}
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* 统计信息 */}
        {expanded && (
          <div style={styles.card}>
            <div style={styles.cardTitle}>
              统计信息
            </div>
            <div style={styles.statsRow}>
              <span style={styles.statsLabel}>模板ID</span>
              <span style={styles.statsValue}>{expanded.template.id}</span>
            </div>
            <div style={styles.statsRow}>
              <span style={styles.statsLabel}>体素总数</span>
              <span style={styles.statsValue}>{expanded.voxels.length} 颗</span>
            </div>
            <div style={styles.statsRow}>
              <span style={styles.statsLabel}>尺寸</span>
              <span style={styles.statsValue}>
                {expanded.dimensions.x} × {expanded.dimensions.y} × {expanded.dimensions.z}
              </span>
            </div>
            <div style={styles.statsRow}>
              <span style={styles.statsLabel}>层数</span>
              <span style={styles.statsValue}>{layers.length} 层</span>
            </div>
          </div>
        )}

        {/* 查看3D按钮 */}
        {layers.length > 0 && (
          <button style={styles.button} onClick={() => setShow3DViewer(true)}>
            <Play size={20} />
            查看3D效果
          </button>
        )}

        {/* 加载中 */}
        {isLoading && <div style={styles.loading}>加载中...</div>}
      </div>

      {/* 3D预览弹窗 */}
      {show3DViewer && layers.length > 0 && (
        <Voxel3DViewer layers={layers} onClose={() => setShow3DViewer(false)} />
      )}
    </div>
  );
}
