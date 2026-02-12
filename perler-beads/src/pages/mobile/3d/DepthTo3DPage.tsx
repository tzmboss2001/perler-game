/**
 * 深度图转3D页面
 * 上传原图和深度图，生成3D浮雕预览
 */

import React, { useState, useMemo, CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, Cube, Play, Image as ImageIcon, ArrowsVertical, MagicWand, SpinnerGap } from '@phosphor-icons/react';
import { depthToVoxels, fileToDataUrl } from '../../../services/3d/depthTo3DService';
import { Layer } from '../../../types/3d/voxel';
import ZAxisAdjuster from '../../../components/3d/ZAxisAdjuster';

// API基础URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8012';

/**
 * 应用Z值偏移：减少整体厚度
 * @param layers 原始层数据
 * @param offset 偏移量（正数表示减少厚度）
 * @returns 偏移后的层数据
 */
function applyZOffset(layers: Layer[], offset: number): Layer[] {
  if (offset === 0) return layers;

  // 过滤掉被"切掉"的层，并调整剩余层的z值
  const newLayers: Layer[] = [];

  for (const layer of layers) {
    const newZ = layer.z - offset;
    if (newZ > 0) {
      newLayers.push({
        ...layer,
        z: newZ,
      });
    }
  }

  return newLayers;
}

/**
 * 计算偏移后的体素总数
 */
function countVoxels(layers: Layer[]): number {
  return layers.reduce((sum, layer) => sum + layer.beads.length, 0);
}

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
  uploadArea: {
    border: '2px dashed #ddd',
    borderRadius: '12px',
    padding: '30px',
    textAlign: 'center' as const,
    cursor: 'pointer',
    marginBottom: '15px',
    transition: 'border-color 0.3s',
  },
  uploadAreaActive: {
    borderColor: '#667eea',
    background: 'rgba(102, 126, 234, 0.05)',
  },
  uploadIcon: {
    marginBottom: '10px',
    color: '#999',
  },
  uploadText: {
    color: '#666',
    fontSize: '14px',
  },
  previewImage: {
    maxWidth: '100%',
    maxHeight: '200px',
    borderRadius: '8px',
    marginTop: '10px',
  },
  row: {
    display: 'flex',
    gap: '15px',
  },
  col: {
    flex: 1,
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
    marginBottom: '10px',
  },
  buttonDisabled: {
    background: '#ccc',
    cursor: 'not-allowed',
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
  loading: {
    textAlign: 'center' as const,
    padding: '40px',
    color: '#888',
  },
  tip: {
    background: '#fff3cd',
    padding: '12px',
    borderRadius: '8px',
    fontSize: '13px',
    color: '#856404',
    marginBottom: '15px',
  },
};

export default function DepthTo3DPage() {
  const navigate = useNavigate();

  // 状态
  const [mode, setMode] = useState<'auto' | 'manual'>('auto'); // 模式：自动AI / 手动上传
  const [colorImage, setColorImage] = useState<string | null>(null);
  const [depthImage, setDepthImage] = useState<string | null>(null);
  const [targetSize, setTargetSize] = useState(64);
  const [maxLayers, setMaxLayers] = useState(16);
  const [invertDepth, setInvertDepth] = useState(true); // 默认反转（适配Marigold）
  const [originalLayers, setOriginalLayers] = useState<Layer[]>([]); // 原始层数据
  const [dimensions, setDimensions] = useState<{ x: number; y: number; z: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState(''); // 加载提示文字
  const [showZAdjuster, setShowZAdjuster] = useState(false);

  // Z值偏移状态
  const [zOffset, setZOffset] = useState(0);

  // 根据偏移量计算实际显示的层
  const layers = useMemo(() => {
    return applyZOffset(originalLayers, zOffset);
  }, [originalLayers, zOffset]);

  // 计算当前体素数量
  const voxelCount = useMemo(() => {
    return countVoxels(layers);
  }, [layers]);

  // 处理文件上传
  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    setImage: (url: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const dataUrl = await fileToDataUrl(file);
      setImage(dataUrl);
    }
  };

  // 生成3D体素（手动模式）
  const handleGenerate = async () => {
    if (!colorImage || !depthImage) return;

    setIsLoading(true);
    setLoadingText('正在生成3D模型...');
    try {
      const result = await depthToVoxels(colorImage, depthImage, targetSize, maxLayers, invertDepth);
      setOriginalLayers(result.layers);
      setDimensions(result.dimensions);
      setZOffset(0); // 重置偏移量
    } catch (error) {
      console.error('生成失败:', error);
      alert('生成失败: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
      setLoadingText('');
    }
  };

  // 一键生成（自动模式：AI深度估计 + 3D生成）
  const handleAutoGenerate = async () => {
    if (!colorImage) return;

    setIsLoading(true);
    try {
      // 第一步：调用AI生成深度图
      setLoadingText('AI正在分析图片深度（约15秒）...');

      const response = await fetch(`${API_BASE_URL}/api/v1/depth/estimate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: colorImage,
        }),
      });

      const result = await response.json();

      if (result.code !== 0) {
        throw new Error(result.msg || '深度估计失败');
      }

      const depthUrl = result.data.depth_url;
      if (!depthUrl) {
        throw new Error('未获取到深度图');
      }

      // 设置深度图显示
      setDepthImage(depthUrl);

      // 第二步：生成3D体素
      setLoadingText('正在生成3D模型...');
      const voxelResult = await depthToVoxels(colorImage, depthUrl, targetSize, maxLayers, true); // Marigold 需要反转
      setOriginalLayers(voxelResult.layers);
      setDimensions(voxelResult.dimensions);
      setZOffset(0);

      // 显示耗时
      if (result.data.predict_time) {
        console.log(`AI深度估计耗时: ${result.data.predict_time.toFixed(2)}秒`);
      }

    } catch (error) {
      console.error('一键生成失败:', error);
      alert('生成失败: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
      setLoadingText('');
    }
  };

  const canGenerate = colorImage && depthImage && !isLoading;
  const canAutoGenerate = colorImage && !isLoading;

  return (
    <div style={styles.container}>
      {/* 头部 */}
      <div style={styles.header}>
        <button style={styles.backButton} onClick={() => navigate('/mobile/3d')}>
          <ArrowLeft size={24} />
        </button>
        <span style={styles.headerTitle}>深度图转3D</span>
        <div style={{ width: 40 }} />
      </div>

      <div style={styles.content}>
        {/* 模式切换 */}
        <div style={styles.card}>
          <div style={{
            display: 'flex',
            gap: '10px',
          }}>
            <button
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '10px',
                border: mode === 'auto' ? '2px solid #667eea' : '2px solid #ddd',
                background: mode === 'auto' ? 'rgba(102, 126, 234, 0.1)' : 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
              onClick={() => setMode('auto')}
            >
              <MagicWand size={20} color={mode === 'auto' ? '#667eea' : '#999'} />
              <span style={{ color: mode === 'auto' ? '#667eea' : '#666', fontWeight: mode === 'auto' ? 'bold' : 'normal' }}>
                AI一键生成
              </span>
            </button>
            <button
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '10px',
                border: mode === 'manual' ? '2px solid #667eea' : '2px solid #ddd',
                background: mode === 'manual' ? 'rgba(102, 126, 234, 0.1)' : 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
              onClick={() => setMode('manual')}
            >
              <Upload size={20} color={mode === 'manual' ? '#667eea' : '#999'} />
              <span style={{ color: mode === 'manual' ? '#667eea' : '#666', fontWeight: mode === 'manual' ? 'bold' : 'normal' }}>
                手动上传
              </span>
            </button>
          </div>
        </div>

        {/* 提示 */}
        <div style={styles.tip}>
          {mode === 'auto' ? (
            <>
              <strong>AI一键模式</strong>：只需上传原图，AI自动生成深度图并转换为3D（约15秒，每次约¥0.5）
            </>
          ) : (
            <>
              <strong>手动模式</strong>：先用 Marigold 生成深度图，再上传原图和深度图
            </>
          )}
        </div>

        {/* 上传区域 */}
        <div style={styles.card}>
          <div style={styles.cardTitle}>
            <Upload size={20} />
            {mode === 'auto' ? '上传原图' : '上传图片'}
          </div>

          <div style={styles.row}>
            {/* 原图上传 */}
            <div style={mode === 'auto' ? { width: '100%' } : styles.col}>
              <label>
                <div
                  style={{
                    ...styles.uploadArea,
                    ...(colorImage ? styles.uploadAreaActive : {}),
                  }}
                >
                  <div style={styles.uploadIcon}>
                    <ImageIcon size={32} />
                  </div>
                  <div style={styles.uploadText}>
                    {colorImage ? '已上传原图' : '上传原图（颜色）'}
                  </div>
                  {colorImage && (
                    <img src={colorImage} alt="原图" style={styles.previewImage} />
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => handleFileUpload(e, setColorImage)}
                />
              </label>
            </div>

            {/* 深度图上传（仅手动模式显示） */}
            {mode === 'manual' && (
              <div style={styles.col}>
                <label>
                  <div
                    style={{
                      ...styles.uploadArea,
                      ...(depthImage ? styles.uploadAreaActive : {}),
                    }}
                  >
                    <div style={styles.uploadIcon}>
                      <Cube size={32} />
                    </div>
                    <div style={styles.uploadText}>
                      {depthImage ? '已上传深度图' : '上传深度图'}
                    </div>
                    {depthImage && (
                      <img src={depthImage} alt="深度图" style={styles.previewImage} />
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => handleFileUpload(e, setDepthImage)}
                  />
                </label>
              </div>
            )}
          </div>

          {/* AI生成的深度图预览（自动模式） */}
          {mode === 'auto' && depthImage && (
            <div style={{ marginTop: '15px' }}>
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
                AI生成的深度图：
              </div>
              <img src={depthImage} alt="AI深度图" style={{ maxWidth: '100%', maxHeight: '150px', borderRadius: '8px' }} />
            </div>
          )}
        </div>

        {/* 参数设置 */}
        <div style={styles.card}>
          <div style={styles.cardTitle}>
            参数设置
          </div>

          <div style={styles.paramRow}>
            <span style={styles.paramLabel}>目标尺寸</span>
            <span style={styles.paramValue}>{targetSize}×{targetSize}</span>
            <input
              type="range"
              style={styles.slider}
              min={16}
              max={64}
              step={8}
              value={targetSize}
              onChange={(e) => setTargetSize(parseInt(e.target.value))}
            />
          </div>

          <div style={styles.paramRow}>
            <span style={styles.paramLabel}>最大层数</span>
            <span style={styles.paramValue}>{maxLayers}</span>
            <input
              type="range"
              style={styles.slider}
              min={4}
              max={32}
              step={2}
              value={maxLayers}
              onChange={(e) => setMaxLayers(parseInt(e.target.value))}
            />
          </div>

          {/* 深度反转开关（仅手动模式显示） */}
          {mode === 'manual' && (
            <div style={styles.paramRow}>
              <span style={styles.paramLabel}>
                深度反转
                <span style={{ fontSize: '12px', color: '#888', marginLeft: '8px' }}>
                  (Marigold需开启)
                </span>
              </span>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
              }}>
                <input
                  type="checkbox"
                  checked={invertDepth}
                  onChange={(e) => setInvertDepth(e.target.checked)}
                  style={{ marginRight: '8px' }}
                />
                <span style={{
                  fontSize: '14px',
                  color: invertDepth ? '#667eea' : '#999',
                  fontWeight: invertDepth ? 'bold' : 'normal',
                }}>
                  {invertDepth ? '黑近白远' : '白近黑远'}
                </span>
              </label>
            </div>
          )}
        </div>

        {/* 生成按钮 */}
        {mode === 'auto' ? (
          <button
            style={{
              ...styles.button,
              ...(canAutoGenerate ? {} : styles.buttonDisabled),
            }}
            onClick={handleAutoGenerate}
            disabled={!canAutoGenerate}
          >
            {isLoading ? (
              <>
                <SpinnerGap size={20} className="spin" />
                {loadingText || '处理中...'}
              </>
            ) : (
              <>
                <MagicWand size={20} />
                AI一键生成3D
              </>
            )}
          </button>
        ) : (
          <button
            style={{
              ...styles.button,
              ...(canGenerate ? {} : styles.buttonDisabled),
            }}
            onClick={handleGenerate}
            disabled={!canGenerate}
          >
            <Cube size={20} />
            {isLoading ? (loadingText || '生成中...') : '生成3D体素'}
          </button>
        )}

        {/* 统计信息 */}
        {dimensions && (
          <div style={styles.card}>
            <div style={styles.cardTitle}>
              统计信息
            </div>
            <div style={styles.statsRow}>
              <span style={styles.statsLabel}>体素总数</span>
              <span style={styles.statsValue}>{voxelCount} 颗</span>
            </div>
            <div style={styles.statsRow}>
              <span style={styles.statsLabel}>尺寸</span>
              <span style={styles.statsValue}>
                {dimensions.x} × {dimensions.y} × {dimensions.z}
              </span>
            </div>
            <div style={styles.statsRow}>
              <span style={styles.statsLabel}>层数</span>
              <span style={styles.statsValue}>{layers.length} 层</span>
            </div>
          </div>
        )}

        {/* Z值偏移调整 */}
        {originalLayers.length > 0 && (
          <div style={styles.card}>
            <div style={styles.cardTitle}>
              <ArrowsVertical size={20} />
              Z轴偏移（减少厚度）
            </div>
            <div style={styles.paramRow}>
              <span style={styles.paramLabel}>
                偏移量（切掉底部 {zOffset} 层）
              </span>
              <span style={styles.paramValue}>{zOffset}</span>
              <input
                type="range"
                style={styles.slider}
                min={0}
                max={Math.max(0, originalLayers.length - 1)}
                step={1}
                value={zOffset}
                onChange={(e) => setZOffset(parseInt(e.target.value))}
              />
            </div>
            <div style={{
              fontSize: '12px',
              color: '#888',
              marginTop: '8px',
            }}>
              原始层数: {originalLayers.length} → 当前层数: {layers.length}
              {zOffset > 0 && ` (已切掉 ${zOffset} 层)`}
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        {layers.length > 0 && (
          <>
            <button style={styles.button} onClick={() => setShowZAdjuster(true)}>
              <Play size={20} />
              查看3D效果 & 微调
            </button>
          </>
        )}

        {/* 加载中 */}
        {isLoading && <div style={styles.loading}>生成中...</div>}
      </div>

      {/* Z轴微调工具（集成3D预览） */}
      {showZAdjuster && layers.length > 0 && (
        <ZAxisAdjuster
          layers={layers}
          maxLayers={maxLayers}
          onSave={(newLayers) => {
            setOriginalLayers(newLayers);
            setZOffset(0);
          }}
          onClose={() => setShowZAdjuster(false)}
        />
      )}
    </div>
  );
}
