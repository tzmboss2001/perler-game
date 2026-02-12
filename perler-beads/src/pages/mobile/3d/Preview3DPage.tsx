/**
 * 3D预览页面
 * 展示生成的3D体素模型和逐层图纸
 */

import { useState, useEffect, CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CaretLeft, CaretRight, Download, List, Cube } from '@phosphor-icons/react';
import { imageToVoxels } from '../../../services/3d/voxelService';
import { sliceModel, calculateBeadStats, renderLayerToCanvas } from '../../../services/3d/sliceService';
import { VoxelModel, Layer, BeadStats3D, DepthData, Generate3DConfig } from '../../../types/3d/voxel';
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
  headerRight: {
    width: '40px',
  },
  content: {
    padding: '20px',
  },
  previewCard: {
    background: 'white',
    borderRadius: '16px',
    padding: '20px',
    marginBottom: '20px',
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
  layerNavButtonDisabled: {
    opacity: 0.3,
    cursor: 'not-allowed',
  },
  layerInfo: {
    textAlign: 'center' as const,
  },
  layerNumber: {
    fontSize: '24px',
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
    overflow: 'auto',
    background: '#f5f5f5',
    borderRadius: '12px',
    padding: '10px',
  },
  statsCard: {
    background: 'white',
    borderRadius: '16px',
    padding: '20px',
    marginBottom: '20px',
  },
  statsTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    marginBottom: '15px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
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
  colorList: {
    maxHeight: '200px',
    overflowY: 'auto' as const,
    marginTop: '15px',
  },
  colorItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 0',
  },
  colorSwatch: {
    width: '24px',
    height: '24px',
    borderRadius: '6px',
    marginRight: '12px',
    border: '1px solid #ddd',
  },
  colorName: {
    flex: 1,
    fontSize: '14px',
    color: '#333',
  },
  colorCount: {
    fontSize: '14px',
    color: '#667eea',
    fontWeight: 'bold',
  },
  buttonGroup: {
    display: 'flex',
    gap: '10px',
  },
  actionButton: {
    flex: 1,
    padding: '15px',
    borderRadius: '12px',
    border: 'none',
    fontSize: '15px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  loading: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '300px',
    color: '#888',
  },
};

export default function Preview3DPage() {
  const navigate = useNavigate();

  const [model, setModel] = useState<VoxelModel | null>(null);
  const [layers, setLayers] = useState<Layer[]>([]);
  const [stats, setStats] = useState<BeadStats3D | null>(null);
  const [currentLayer, setCurrentLayer] = useState(0);
  const [layerCanvas, setLayerCanvas] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [show3DViewer, setShow3DViewer] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (layers.length > 0 && currentLayer < layers.length) {
      const canvas = renderLayerToCanvas(layers[currentLayer], 15, true);
      setLayerCanvas(canvas.toDataURL());
    }
  }, [layers, currentLayer]);

  const loadData = async () => {
    try {
      const imageDataUrl = sessionStorage.getItem('3d_image');
      const depthDataStr = sessionStorage.getItem('3d_depth');
      const configStr = sessionStorage.getItem('3d_config');

      if (!imageDataUrl || !depthDataStr || !configStr) {
        alert('数据丢失，请重新上传');
        navigate('/mobile/3d/upload');
        return;
      }

      const depthData: DepthData = JSON.parse(depthDataStr);
      const config: Generate3DConfig = JSON.parse(configStr);

      // 生成体素模型
      const voxelModel = await imageToVoxels(imageDataUrl, depthData, config);
      setModel(voxelModel);

      // 切片
      const layerData = sliceModel(voxelModel);
      setLayers(layerData);

      // 统计
      const beadStats = calculateBeadStats(voxelModel);
      setStats(beadStats);

      setIsLoading(false);
    } catch (error) {
      console.error('加载失败:', error);
      alert('加载失败，请重试');
      navigate('/mobile/3d/upload');
    }
  };

  const handlePrevLayer = () => {
    if (currentLayer > 0) {
      setCurrentLayer(currentLayer - 1);
    }
  };

  const handleNextLayer = () => {
    if (currentLayer < layers.length - 1) {
      setCurrentLayer(currentLayer + 1);
    }
  };

  const handleDownloadLayer = () => {
    if (!layerCanvas) return;

    const link = document.createElement('a');
    link.download = `3d_layer_${currentLayer + 1}.png`;
    link.href = layerCanvas;
    link.click();
  };

  const handleDownloadAll = () => {
    layers.forEach((layer, index) => {
      const canvas = renderLayerToCanvas(layer, 20, true);
      const link = document.createElement('a');
      link.download = `3d_layer_${index + 1}.png`;
      link.href = canvas.toDataURL();
      link.click();
    });
  };

  if (isLoading) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <button style={styles.backButton} onClick={() => navigate('/mobile/3d/upload')}>
            <ArrowLeft size={24} />
          </button>
          <span style={styles.headerTitle}>生成中...</span>
          <div style={styles.headerRight} />
        </div>
        <div style={styles.loading}>
          <p>正在生成3D图纸...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* 头部 */}
      <div style={styles.header}>
        <button style={styles.backButton} onClick={() => navigate('/mobile/3d/upload')}>
          <ArrowLeft size={24} />
        </button>
        <span style={styles.headerTitle}>3D图纸预览</span>
        <div style={styles.headerRight} />
      </div>

      <div style={styles.content}>
        {/* 图层预览 */}
        <div style={styles.previewCard}>
          <div style={styles.layerNav}>
            <button
              style={{
                ...styles.layerNavButton,
                ...(currentLayer === 0 ? styles.layerNavButtonDisabled : {}),
              }}
              onClick={handlePrevLayer}
              disabled={currentLayer === 0}
            >
              <CaretLeft size={20} />
            </button>

            <div style={styles.layerInfo}>
              <div style={styles.layerNumber}>第 {currentLayer + 1} 层</div>
              <div style={styles.layerLabel}>共 {layers.length} 层（从底部开始）</div>
            </div>

            <button
              style={{
                ...styles.layerNavButton,
                ...(currentLayer === layers.length - 1 ? styles.layerNavButtonDisabled : {}),
              }}
              onClick={handleNextLayer}
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
        {stats && (
          <div style={styles.statsCard}>
            <div style={styles.statsTitle}>
              <List size={20} />
              珠子统计
            </div>

            <div style={styles.statsRow}>
              <span style={styles.statsLabel}>总珠子数</span>
              <span style={styles.statsValue}>{stats.totalCount} 颗</span>
            </div>
            <div style={styles.statsRow}>
              <span style={styles.statsLabel}>层数</span>
              <span style={styles.statsValue}>{stats.layerCount} 层</span>
            </div>
            <div style={styles.statsRow}>
              <span style={styles.statsLabel}>颜色种类</span>
              <span style={styles.statsValue}>{stats.colorStats.length} 种</span>
            </div>

            <div style={styles.colorList}>
              {stats.colorStats.slice(0, 10).map((color, index) => (
                <div key={index} style={styles.colorItem}>
                  <div style={{ ...styles.colorSwatch, background: color.color }} />
                  <span style={styles.colorName}>{color.beadName}</span>
                  <span style={styles.colorCount}>{color.count}</span>
                </div>
              ))}
              {stats.colorStats.length > 10 && (
                <div style={{ fontSize: '13px', color: '#888', padding: '8px 0' }}>
                  还有 {stats.colorStats.length - 10} 种颜色...
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3D预览按钮 */}
        <button
          style={{
            ...styles.actionButton,
            background: 'linear-gradient(135deg, #00d9ff 0%, #667eea 100%)',
            color: 'white',
            marginBottom: '15px',
          }}
          onClick={() => setShow3DViewer(true)}
        >
          <Cube size={20} />
          查看3D实物效果
        </button>

        {/* 操作按钮 */}
        <div style={styles.buttonGroup}>
          <button
            style={{
              ...styles.actionButton,
              background: '#f5f5f5',
              color: '#333',
            }}
            onClick={handleDownloadLayer}
          >
            <Download size={18} />
            下载当前层
          </button>
          <button
            style={{
              ...styles.actionButton,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
            }}
            onClick={handleDownloadAll}
          >
            <Download size={18} />
            下载全部
          </button>
        </div>
      </div>

      {/* 3D预览弹窗 */}
      {show3DViewer && layers.length > 0 && (
        <Voxel3DViewer
          layers={layers}
          onClose={() => setShow3DViewer(false)}
        />
      )}
    </div>
  );
}
