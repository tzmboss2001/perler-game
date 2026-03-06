import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User, Gear, Info, Question, Heart, Trash, Play, Spinner, SignOut, SignIn, Palette, ShareNetwork, ShieldCheck } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { colors, radius, typography, shadows, animation, pixelIcons } from '../../styles/designSystem';
import { projectApi, ProjectInfo } from '../../services/api/projectApi';
import { BeadColor } from '../../data/beadColors';
import { useUserStore } from '../../store/userStore';
import Modal, { useModal } from '../../components/Modal';
import MyColorsModal from '../../components/MyColorsModal';
import { myColorsService } from '../../services/myColorsService';
import { localStorageService, LocalProject } from '../../services/localStorageService';
import PublishModal from '../../components/PublishModal';
import { communityApi, CommunityPostListItem, CreatePostData } from '../../services/api/communityApi';
import { finishedWorkApi, FinishedWorkItem } from '../../services/api/finishedWorkApi';
import { BeadPixelData } from '../../services/colorMatchService';
import { convertBeadPixelDataToCommunityFormat, generateThumbnailFromBeadData, countBeadStats, inferPaletteMetaFromBeadData } from '../../services/thumbnailService';

/**
 * 我的页面
 * 柔和像素风格设计
 */
const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [localProjects, setLocalProjects] = useState<LocalProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<number | null>(null);
  const { modalProps, showConfirm } = useModal();

  // 用户状态
  const { userInfo, isLoggedIn, initUser, logout } = useUserStore();

  // 初始化用户状态
  useEffect(() => {
    initUser();
  }, [initUser]);

  // 加载方案列表
  useEffect(() => {
    // 始终加载本地方案
    const localResult = localStorageService.getProjectList({ page: 1, pageSize: 50 });
    setLocalProjects(localResult.list);

    if (!isLoggedIn) {
      setLoading(false);
      setProjects([]);
      return;
    }

    const controller = new AbortController();
    let isMounted = true;

    const loadProjects = async () => {
      try {
        setLoading(true);
        const response = await projectApi.getList({ page: 1, pageSize: 20, signal: controller.signal });
        if (isMounted && response.code === 0) {
          setProjects(response.data.list || []);
        }
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('[ProfilePage] 加载方案失败:', error);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadProjects();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [isLoggedIn]);

  // 继续制作（本地方案）
  const handleContinueLocal = (project: LocalProject) => {
    const beadData = {
      width: project.beadData.width,
      height: project.beadData.height,
      beads: project.beadData.beads as BeadColor[],
    };
    navigate('/mobile/making', {
      state: {
        beadData,
        colorCount: project.settings?.colorCount || 96,
        localProjectId: project.id,
        ...(project.progress ? { savedProgress: project.progress } : {}),
      },
    });
  };

  // 删除本地方案
  const handleDeleteLocal = (projectId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (deleting) return;

    showConfirm('删除后将无法恢复，确定要删除这个方案吗？', {
      title: '删除方案',
      type: 'warning',
      confirmText: '删除',
      onConfirm: () => {
        localStorageService.deleteProject(projectId);
        setLocalProjects(prev => prev.filter(p => p.id !== projectId));
      },
    });
  };

  // 继续制作（云端方案）
  const handleContinue = async (project: ProjectInfo) => {
    try {
      // 获取完整的项目详情
      const response = await projectApi.getById(project.id);
      if (response.code === 0 && response.data) {
        const detail = response.data;
        // 将 beadData 转换为 BeadPixelData 格式
        const beadData = {
          width: detail.bead_data.width,
          height: detail.bead_data.height,
          beads: detail.bead_data.beads as BeadColor[],
        };

        // 跳转到制作页，携带进度信息
        navigate('/mobile/making', {
          state: {
            beadData,
            colorCount: detail.settings?.colorCount || 96,
            projectId: project.id,
            // 如果有保存进度，则恢复进度状态
            ...(detail.progress ? {
              savedProgress: detail.progress,
            } : {}),
          },
        });
      }
    } catch (error) {
      console.error('加载方案详情失败:', error);
    }
  };

  // 删除方案
  const handleDelete = (projectId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (deleting) return;

    showConfirm('删除后将无法恢复，确定要删除这个方案吗？', {
      title: '删除方案',
      type: 'warning',
      confirmText: '删除',
      onConfirm: async () => {
        try {
          setDeleting(projectId);
          const response = await projectApi.delete(projectId);
          if (response.code === 0) {
            setProjects(prev => prev.filter(p => p.id !== projectId));
          }
        } catch (error) {
          console.error('删除方案失败:', error);
        } finally {
          setDeleting(null);
        }
      },
    });
  };

  // 计算进度百分比
  const getProgressPercent = (progress: ProjectInfo['progress']): number => {
    if (!progress || !progress.completedItems) return 0;
    const total = progress.mode === 'row' ? 32 : Math.ceil(32 / progress.blockSize) * Math.ceil(32 / progress.blockSize);
    return Math.round((progress.completedItems.length / total) * 100);
  };

  // 登录/退出处理
  const handleLogin = () => {
    navigate('/mobile/login', { state: { from: '/mobile/profile' } });
  };

  const handleLogout = () => {
    showConfirm('退出登录后，本地方案数据会保留，云端数据需重新登录查看。', {
      title: '确定要退出登录吗？',
      type: 'info',
      confirmText: '退出',
      onConfirm: () => {
        logout();
      },
    });
  };

  // 我的色板弹窗
  const [showMyColorsModal, setShowMyColorsModal] = useState(false);

  // 发布到社区相关状态
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishBeadData, setPublishBeadData] = useState<BeadPixelData | null>(null);
  const [publishDefaultTitle, setPublishDefaultTitle] = useState('');
  const [publishGridSize, setPublishGridSize] = useState('');
  const [publishDifficulty, setPublishDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [publishProjectId, setPublishProjectId] = useState<number | undefined>(undefined);
  const [myCommunityPosts, setMyCommunityPosts] = useState<CommunityPostListItem[]>([]);
  const [myCommunityLoading, setMyCommunityLoading] = useState(false);
  const [finishedWorks, setFinishedWorks] = useState<FinishedWorkItem[]>([]);
  const [finishedWorksLoading, setFinishedWorksLoading] = useState(false);
  const [finishedUploading, setFinishedUploading] = useState(false);
  const finishedInputRef = useRef<HTMLInputElement | null>(null);

  const reviewStatusText = (status?: number) => {
    switch (status) {
      case 0:
        return '待审核';
      case 1:
        return '已通过';
      case 2:
        return '已驳回';
      case 3:
        return '已下架';
      default:
        return '未知';
    }
  };

  const reviewStatusColor = (status?: number) => {
    switch (status) {
      case 0:
        return colors.bead.yellow;
      case 1:
        return colors.bead.green;
      case 2:
        return colors.bead.red;
      case 3:
        return colors.bead.orange;
      default:
        return colors.text.muted;
    }
  };

  const inferDifficulty = (data: BeadPixelData): 'easy' | 'medium' | 'hard' => {
    const stats = countBeadStats(data);
    let score = 0;
    const maxSide = Math.max(data.width, data.height);

    if (stats.beadCount >= 6000) score += 2;
    else if (stats.beadCount >= 2500) score += 1;

    if (stats.colorCount >= 60) score += 2;
    else if (stats.colorCount >= 30) score += 1;

    if (maxSide >= 96) score += 1;

    if (score <= 1) return 'easy';
    if (score <= 3) return 'medium';
    return 'hard';
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(reader.error || new Error('file read failed'));
      reader.readAsDataURL(file);
    });
  };

  const loadFinishedWorks = useCallback(async () => {
    if (!isLoggedIn) {
      setFinishedWorks([]);
      return;
    }
    try {
      setFinishedWorksLoading(true);
      const res = await finishedWorkApi.listMy(1, 12);
      if (res.code === 0) {
        setFinishedWorks(res.data.list || []);
      }
    } catch (error) {
      console.error('[ProfilePage] load finished works failed:', error);
    } finally {
      setFinishedWorksLoading(false);
    }
  }, [isLoggedIn]);

  const handleUploadFinishedClick = () => {
    if (finishedUploading) return;
    finishedInputRef.current?.click();
  };

  const handleFinishedFilesChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length) return;
    if (!isLoggedIn) {
      showConfirm('请先登录后再上传成品', {
        title: '请先登录',
        type: 'info',
        confirmText: '去登录',
        onConfirm: () => navigate('/mobile/login', { state: { from: '/mobile/profile' } }),
      });
      return;
    }

    const title = (window.prompt('请输入成品标题', files[0]?.name?.replace(/\.[^/.]+$/, '') || '我的成品') || '').trim();
    if (!title) return;
    const description = (window.prompt('请输入成品描述（可选）', '') || '').trim();

    try {
      setFinishedUploading(true);
      const base64List = await Promise.all(files.slice(0, 9).map(fileToBase64));
      const res = await finishedWorkApi.create({
        title,
        description: description || undefined,
        images_base64: base64List,
        is_public: true,
      });
      if (res.code === 0) {
        await loadFinishedWorks();
        showConfirm('成品已上传到你的相册。', {
          title: '上传成功',
          type: 'success',
          confirmText: '知道了',
        });
      } else {
        showConfirm(res.msg || '上传失败，请稍后重试', { title: '上传失败', type: 'warning', confirmText: '知道了' });
      }
    } catch (error) {
      console.error('[ProfilePage] upload finished work failed:', error);
      showConfirm('上传失败，请稍后重试', { title: '上传失败', type: 'warning', confirmText: '知道了' });
    } finally {
      setFinishedUploading(false);
    }
  };

  const handleDeleteFinishedWork = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (finishedUploading) return;
    showConfirm('删除后将无法恢复，确定删除这个成品吗？', {
      title: '删除成品',
      type: 'warning',
      confirmText: '删除',
      onConfirm: async () => {
        try {
          const res = await finishedWorkApi.delete(id);
          if (res.code === 0) {
            setFinishedWorks(prev => prev.filter(item => item.id !== id));
          } else {
            showConfirm(res.msg || '删除失败，请稍后重试', { title: '删除失败', type: 'warning', confirmText: '知道了' });
          }
        } catch (error) {
          console.error('[ProfilePage] delete finished work failed:', error);
          showConfirm('删除失败，请稍后重试', { title: '删除失败', type: 'warning', confirmText: '知道了' });
        }
      },
    });
  };

  // 分享到社区（本地方案）
  const handleShareLocal = (project: LocalProject, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isLoggedIn) {
      showConfirm('登录后才能分享作品到社区', {
        title: '请先登录',
        type: 'info',
        confirmText: '去登录',
        onConfirm: () => navigate('/mobile/login', { state: { from: '/mobile/profile' } }),
      });
      return;
    }
    const beadData: BeadPixelData = {
      width: project.beadData.width,
      height: project.beadData.height,
      beads: project.beadData.beads as (BeadColor | null)[],
    };
    setPublishBeadData(beadData);
    setPublishDefaultTitle(project.name);
    setPublishGridSize(`${project.beadData.width}×${project.beadData.height}`);
    setPublishDifficulty(inferDifficulty(beadData));
    setPublishProjectId(undefined);
    setShowPublishModal(true);
  };

  // 分享到社区（云端方案）
  const handleShare = async (project: ProjectInfo, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isLoggedIn) {
      showConfirm('登录后才能分享作品到社区', {
        title: '请先登录',
        type: 'info',
        confirmText: '去登录',
        onConfirm: () => navigate('/mobile/login', { state: { from: '/mobile/profile' } }),
      });
      return;
    }
    try {
      const response = await projectApi.getById(project.id);
      if (response.code === 0 && response.data) {
        const detail = response.data;
        const beadData: BeadPixelData = {
          width: detail.bead_data.width,
          height: detail.bead_data.height,
          beads: detail.bead_data.beads as (BeadColor | null)[],
        };
        setPublishBeadData(beadData);
        setPublishDefaultTitle(project.name);
        const w = detail.bead_data.width || project.settings?.gridSize || 32;
        const h = detail.bead_data.height || project.settings?.gridHeight || project.settings?.gridSize || 32;
        setPublishGridSize(`${w}×${h}`);
        setPublishDifficulty(inferDifficulty(beadData));
        setPublishProjectId(project.id);
        setShowPublishModal(true);
      }
    } catch (error) {
      console.error('获取方案详情失败:', error);
    }
  };

  // 执行发布
  const handlePublish = async (data: { title: string; description: string; difficulty: string; tags: string }) => {
    if (!publishBeadData) return;
    setPublishing(true);
    try {
      const communityFormat = convertBeadPixelDataToCommunityFormat(publishBeadData);
      const thumbnail = generateThumbnailFromBeadData(publishBeadData);
      const stats = countBeadStats(publishBeadData);
      const paletteMeta = inferPaletteMetaFromBeadData(publishBeadData);

      const postData: CreatePostData = {
        title: data.title,
        description: data.description,
        tags: data.tags || undefined,
        bead_data: communityFormat as unknown as Record<string, unknown>,
        grid_width: publishBeadData.width,
        grid_height: publishBeadData.height,
        bead_count: stats.beadCount,
        color_count: stats.colorCount,
        difficulty: data.difficulty,
        thumbnail_base64: thumbnail,
        project_id: publishProjectId,
        palette_brand: paletteMeta.palette_brand,
        palette_version: paletteMeta.palette_version,
        palette_name: paletteMeta.palette_name,
      };

      const res = await communityApi.createPost(postData);
      if (res.code === 0) {
        setShowPublishModal(false);
        showConfirm('作品已成功分享到社区。', {
          title: '发布成功',
          type: 'info',
          confirmText: '去社区看看',
          cancelText: '留在这里',
          onConfirm: () => navigate('/mobile/community'),
        });
      } else {
        showConfirm(res.msg || '发布失败，请重试', { title: '发布失败', type: 'warning', confirmText: '知道了' });
      }
    } catch (error) {
      console.error('发布失败:', error);
      showConfirm('网络错误，请稍后重试', { title: '发布失败', type: 'warning', confirmText: '知道了' });
    } finally {
      setPublishing(false);
    }
  };

  const menuItems = [
    { icon: Palette, label: '管理我的色板', color: colors.bead.orange, action: () => setShowMyColorsModal(true) },
    { icon: Gear, label: '设置', color: colors.bead.cyan, path: '/mobile/settings' },
    { icon: Question, label: '帮助', color: colors.bead.green, path: '/mobile/help' },
    { icon: Info, label: '关于', color: colors.bead.purple, path: '/mobile/about' },
  ];

  const adminIDs = (import.meta.env.VITE_COMMUNITY_ADMIN_IDS || '2,4')
    .split(',')
    .map(v => Number(v.trim()))
    .filter(v => Number.isFinite(v) && v > 0);
  const isCommunityAdmin = !!userInfo?.id && adminIDs.includes(userInfo.id);
  if (isCommunityAdmin) {
    menuItems.unshift({
      icon: ShieldCheck,
      label: '运营后台',
      color: colors.bead.red,
      path: '/admin',
    });
  }

  useEffect(() => {
    if (!isLoggedIn) {
      setMyCommunityPosts([]);
      return;
    }
    let mounted = true;
    const loadMyCommunityPosts = async () => {
      try {
        setMyCommunityLoading(true);
        const res = await communityApi.getMyPosts({ page: 1, pageSize: 6, review_status: -1 });
        if (mounted && res.code === 0) {
          setMyCommunityPosts(res.data.list || []);
        }
      } catch (error) {
        if (mounted) {
          console.error('[ProfilePage] load my community posts failed:', error);
        }
      } finally {
        if (mounted) {
          setMyCommunityLoading(false);
        }
      }
    };
    loadMyCommunityPosts();
    return () => {
      mounted = false;
    };
  }, [isLoggedIn]);

  useEffect(() => {
    loadFinishedWorks();
  }, [loadFinishedWorks]);

  return (
    <div style={styles.container}>
      {/* 头部 */}
      <div style={styles.header}>
        <h1 style={styles.title}>
          <span style={{ color: colors.bead.yellow }}>{pixelIcons.star}</span> 我的
        </h1>
        {/* 装饰珠子 */}
        <div style={styles.headerDecor}>
          {[colors.bead.pink, colors.bead.yellow, colors.bead.green].map((c, i) => (
            <span key={i} style={{ ...styles.decorDot, background: `linear-gradient(145deg, ${c}, ${c}cc)` }} />
          ))}
        </div>
      </div>

      {/* 用户卡片 */}
      <div style={styles.userCard}>
        <div style={styles.avatarBox}>
          <div style={{
            ...styles.avatar,
            background: isLoggedIn
              ? `linear-gradient(145deg, ${colors.bead.cyan}, ${colors.bead.cyan}cc)`
              : `linear-gradient(145deg, ${colors.bead.purple}, ${colors.bead.purple}cc)`,
            boxShadow: isLoggedIn
              ? `${shadows.sm}, 0 4px 16px ${colors.bead.cyan}40`
              : `${shadows.sm}, 0 4px 16px ${colors.bead.purple}40`,
          }}>
            {isLoggedIn && userInfo?.avatar ? (
              <img
                src={userInfo.avatar}
                alt="头像"
                style={styles.avatarImg}
              />
            ) : (
              <User size={28} weight="fill" />
            )}
          </div>
          {/* 绛夌骇寰界珷 */}
          <div style={{
            ...styles.levelBadge,
            background: isLoggedIn && userInfo?.member_level
              ? `linear-gradient(145deg, ${colors.bead.cyan}, ${colors.bead.blue})`
              : `linear-gradient(145deg, ${colors.bead.yellow}, ${colors.bead.orange})`,
          }}>
            {isLoggedIn && userInfo?.member_level
              ? `VIP${userInfo.member_level}`
              : 'LV.1'}
          </div>
        </div>
        <div style={styles.userInfo}>
          <span style={styles.userName}>
            {isLoggedIn ? (userInfo?.nickname || userInfo?.username || '用户') : '游客用户'}
          </span>
          <span style={styles.userDesc}>
            <Heart size={12} weight="fill" style={{ color: colors.bead.pink }} />
            {isLoggedIn
              ? userInfo?.email || '方案已同步到云端'
              : '方案已保存到本地'}
          </span>
        </div>
        {/* 登录/登出按钮 */}
        <button
          style={isLoggedIn ? styles.logoutBtn : styles.loginBtn}
          onClick={isLoggedIn ? handleLogout : handleLogin}
        >
          {isLoggedIn ? (
            <>
              <SignOut size={16} weight="bold" />
              <span>退出</span>
            </>
          ) : (
            <>
              <SignIn size={16} weight="bold" />
              <span>登录</span>
            </>
          )}
        </button>
      </div>

      {/* 我的方案区 */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>
          <span style={styles.sectionIcon}>{pixelIcons.diamond}</span>
          我的方案
          <span style={styles.projectCount}>
            ({isLoggedIn ? projects.length + localProjects.length : localProjects.length})
          </span>
        </h2>

        {!isLoggedIn ? (
          localProjects.length === 0 ? (
            <div style={styles.emptyBox}>
              <div style={styles.emptyGrid}>
                {Array.from({ length: 16 }).map((_, i) => (
                  <div key={i} style={styles.emptyCell} />
                ))}
              </div>
              <span style={styles.emptyText}>暂无方案</span>
              <span style={styles.emptyHint}>生成图案后保存即可在此查看</span>
            </div>
          ) : (
            <div style={styles.projectList}>
              {localProjects.map((project) => (
                <div
                  key={project.id}
                  style={styles.projectCard}
                  onClick={() => handleContinueLocal(project)}
                >
                  <div style={styles.thumbnailBox}>
                    {project.thumbnail ? (
                      <img
                        src={project.thumbnail}
                        alt={project.name}
                        style={styles.thumbnail}
                      />
                    ) : (
                      <div style={styles.thumbnailPlaceholder}>
                        {pixelIcons.bead}
                      </div>
                    )}
                  </div>
                  <div style={styles.projectInfo}>
                    <span style={styles.projectName}>{project.name}</span>
                    <div style={styles.projectMeta}>
                      <span style={styles.projectSize}>
                        {project.beadData?.width || 32}×{project.beadData?.height || 32}
                      </span>
                      <span style={{ ...styles.projectSize, color: colors.bead.orange }}>本地</span>
                    </div>
                    <span style={styles.projectDate}>
                      {new Date(project.updatedAt).toLocaleDateString('zh-CN')}
                    </span>
                  </div>
                  <div style={styles.projectActions}>
                    {isLoggedIn && (
                      <button
                        style={styles.shareBtn}
                        onClick={(e) => handleShareLocal(project, e)}
                        title="分享到社区"
                      >
                        <ShareNetwork size={14} weight="fill" />
                      </button>
                    )}
                    <button
                      style={styles.continueBtn}
                      onClick={(e) => { e.stopPropagation(); handleContinueLocal(project); }}
                    >
                      <Play size={14} weight="fill" />
                    </button>
                    <button
                      style={styles.deleteBtn}
                      onClick={(e) => handleDeleteLocal(project.id, e)}
                    >
                      <Trash size={14} weight="fill" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : loading ? (
          <div style={styles.loadingBox}>
            <Spinner size={24} style={{ animation: 'spin 1s linear infinite' }} />
            <span>正在加载方案...</span>
            <span style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>首次加载可能需要较长时间</span>
          </div>
        ) : projects.length === 0 && localProjects.length === 0 ? (
          <div style={styles.emptyBox}>
            {/* 珠子网格装饰 */}
            <div style={styles.emptyGrid}>
              {Array.from({ length: 16 }).map((_, i) => (
                <div key={i} style={styles.emptyCell} />
              ))}
            </div>
            <span style={styles.emptyText}>暂无方案</span>
            <span style={styles.emptyHint}>在编辑器中点击“开始制作”保存方案</span>
          </div>
        ) : (
          <>
            {projects.length > 0 ? (
              <div style={styles.projectList}>
                {projects.map((project) => (
                  <div
                    key={project.id}
                    style={styles.projectCard}
                    onClick={() => handleContinue(project)}
                  >
                    {/* 缩略图 */}
                    <div style={styles.thumbnailBox}>
                      {project.thumbnail_url ? (
                        <img
                          src={project.thumbnail_url}
                          alt={project.name}
                          style={styles.thumbnail}
                        />
                      ) : (
                        <div style={styles.thumbnailPlaceholder}>
                          {pixelIcons.bead}
                        </div>
                      )}
                    </div>

                    {/* 信息 */}
                    <div style={styles.projectInfo}>
                      <span style={styles.projectName}>{project.name}</span>
                      <div style={styles.projectMeta}>
                        <span style={styles.projectSize}>
                          {project.settings?.gridSize || 32}×{project.settings?.gridHeight || project.settings?.gridSize || 32}
                        </span>
                        {project.progress && (
                          <span style={styles.projectProgress}>
                            进度: {getProgressPercent(project.progress)}%
                          </span>
                        )}
                      </div>
                      <span style={styles.projectDate}>
                        {new Date(project.updated_at).toLocaleDateString('zh-CN')}
                      </span>
                    </div>

                    {/* 操作按钮 */}
                    <div style={styles.projectActions}>
                      <button
                        style={styles.shareBtn}
                        onClick={(e) => handleShare(project, e)}
                        title="分享到社区"
                      >
                        <ShareNetwork size={14} weight="fill" />
                      </button>
                      <button
                        style={styles.continueBtn}
                        onClick={(e) => { e.stopPropagation(); handleContinue(project); }}
                      >
                        <Play size={14} weight="fill" />
                      </button>
                      <button
                        style={styles.deleteBtn}
                        onClick={(e) => handleDelete(project.id, e)}
                        disabled={deleting === project.id}
                      >
                        {deleting === project.id ? (
                          <Spinner size={14} />
                        ) : (
                          <Trash size={14} weight="fill" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {localProjects.length > 0 ? (
              <>
                <div style={{ ...styles.sectionTitle, fontSize: '13px', marginTop: projects.length > 0 ? 10 : 0 }}>
                  本地方案（云端同步失败时的保底）
                </div>
                <div style={styles.projectList}>
                  {localProjects.map((project) => (
                    <div
                      key={`local_${project.id}`}
                      style={styles.projectCard}
                      onClick={() => handleContinueLocal(project)}
                    >
                      <div style={styles.thumbnailBox}>
                        {project.thumbnail ? (
                          <img
                            src={project.thumbnail}
                            alt={project.name}
                            style={styles.thumbnail}
                          />
                        ) : (
                          <div style={styles.thumbnailPlaceholder}>
                            {pixelIcons.bead}
                          </div>
                        )}
                      </div>
                      <div style={styles.projectInfo}>
                        <span style={styles.projectName}>{project.name}</span>
                        <div style={styles.projectMeta}>
                          <span style={styles.projectSize}>
                            {project.beadData?.width || 32}×{project.beadData?.height || 32}
                          </span>
                          <span style={{ ...styles.projectSize, color: colors.bead.orange }}>本地</span>
                        </div>
                        <span style={styles.projectDate}>
                          {new Date(project.updatedAt).toLocaleDateString('zh-CN')}
                        </span>
                      </div>
                      <div style={styles.projectActions}>
                        <button
                          style={styles.shareBtn}
                          onClick={(e) => handleShareLocal(project, e)}
                          title="分享到社区"
                        >
                          <ShareNetwork size={14} weight="fill" />
                        </button>
                        <button
                          style={styles.continueBtn}
                          onClick={(e) => { e.stopPropagation(); handleContinueLocal(project); }}
                        >
                          <Play size={14} weight="fill" />
                        </button>
                        <button
                          style={styles.deleteBtn}
                          onClick={(e) => handleDeleteLocal(project.id, e)}
                        >
                          <Trash size={14} weight="fill" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : null}
          </>
        )}
      </div>

      {isLoggedIn && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>
            <span style={styles.sectionIcon}>{pixelIcons.star}</span>
            我的社区发布
            <span style={styles.projectCount}>({myCommunityPosts.length})</span>
          </h2>
          {myCommunityLoading ? (
            <div style={styles.loadingBox}>
              <Spinner size={20} style={{ animation: 'spin 1s linear infinite' }} />
              <span>正在加载发布状态...</span>
            </div>
          ) : myCommunityPosts.length === 0 ? (
            <div style={styles.emptyBox}>
              <span style={styles.emptyText}>暂无社区发布</span>
              <span style={styles.emptyHint}>发布后可在这里查看审核结果</span>
            </div>
          ) : (
            <div style={styles.publishList}>
              {myCommunityPosts.map((post) => (
                <div
                  key={post.id}
                  style={styles.publishCard}
                  onClick={() => navigate(`/mobile/community/${post.id}`)}
                >
                  <div style={styles.publishMain}>
                    <div style={styles.publishTitle}>{post.title}</div>
                    <div style={styles.publishMeta}>
                      <span style={{ ...styles.publishStatus, color: reviewStatusColor(post.review_status) }}>
                        {reviewStatusText(post.review_status)}
                      </span>
                      <span style={styles.publishDate}>
                        {new Date(post.created_at).toLocaleString('zh-CN')}
                      </span>
                    </div>
                    {post.review_status === 2 && post.review_reason ? (
                      <div style={styles.publishReason}>驳回原因：{post.review_reason}</div>
                    ) : null}
                  </div>
                  <span style={styles.menuArrow}>→</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {isLoggedIn && (
        <div style={styles.section}>
          <div style={styles.albumHeader}>
            <h2 style={styles.sectionTitle}>
              <span style={styles.sectionIcon}>{pixelIcons.star}</span>
              我的成品相册
              <span style={styles.projectCount}>({finishedWorks.length})</span>
            </h2>
            <button style={styles.uploadFinishedBtn} onClick={handleUploadFinishedClick} disabled={finishedUploading}>
              {finishedUploading ? '上传中...' : '上传成品'}
            </button>
          </div>
          {finishedWorksLoading ? (
            <div style={styles.loadingBox}>
              <Spinner size={20} style={{ animation: 'spin 1s linear infinite' }} />
              <span>正在加载成品...</span>
            </div>
          ) : finishedWorks.length === 0 ? (
            <div style={styles.emptyBox}>
              <span style={styles.emptyText}>暂无成品</span>
              <span style={styles.emptyHint}>上传你的实拍成品，沉淀个人作品集</span>
            </div>
          ) : (
            <div style={styles.albumList}>
              {finishedWorks.map((item) => (
                <div key={item.id} style={styles.albumCard}>
                  <div style={styles.albumThumbWrap}>
                    {item.cover_url ? (
                      <img src={item.cover_url} alt={item.title} style={styles.albumThumb} />
                    ) : (
                      <div style={styles.thumbnailPlaceholder}>{pixelIcons.bead}</div>
                    )}
                  </div>
                  <div style={styles.albumMain}>
                    <div style={styles.publishTitle}>{item.title}</div>
                    <div style={styles.publishMeta}>
                      <span style={styles.publishDate}>{new Date(item.created_at).toLocaleString('zh-CN')}</span>
                      <span style={styles.publishStatus}>共 {item.image_count} 张</span>
                    </div>
                    {item.description ? <div style={styles.albumDesc}>{item.description}</div> : null}
                  </div>
                  <button style={styles.deleteBtn} onClick={(e) => handleDeleteFinishedWork(item.id, e)}>
                    <Trash size={14} weight="fill" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <input
            ref={finishedInputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={handleFinishedFilesChange}
          />
        </div>
      )}

      {/* 菜单 */}
      <div style={styles.menu}>
        {menuItems.map((item, index) => (
          <div
            key={index}
            style={styles.menuItem}
            onClick={() => item.action ? item.action() : item.path && navigate(item.path)}
          >
            <div style={{
              ...styles.menuIconBox,
              background: `linear-gradient(145deg, ${item.color}30, ${item.color}15)`,
              boxShadow: `0 4px 12px ${item.color}20`
            }}>
              <item.icon size={18} weight="fill" style={{ color: item.color }} />
            </div>
            <span style={styles.menuLabel}>{item.label}</span>
              <span style={styles.menuArrow}>→</span>
          </div>
        ))}
      </div>

      {/* 版本信息 */}
      <div style={styles.versionBox}>
        <div style={styles.versionDecor} />
        <p style={styles.version}>拼豆工坊 v1.0.0</p>
        <p style={styles.versionSub}>
          <Heart size={12} weight="fill" style={{ color: colors.bead.pink }} /> Made with love
        </p>
      </div>

      {/* 统一弹框 */}
      <Modal {...modalProps} />

      {/* 我的色板弹窗 */}
      <MyColorsModal
        visible={showMyColorsModal}
        onClose={() => setShowMyColorsModal(false)}
      />

      {/* 发布到社区弹窗 */}
      <PublishModal
        visible={showPublishModal}
        onPublish={handlePublish}
        onCancel={() => setShowPublishModal(false)}
        loading={publishing}
        defaultTitle={publishDefaultTitle}
        gridSize={publishGridSize}
        autoDifficulty={publishDifficulty}
      />
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '20px 16px',
    minHeight: '100%',
    background: colors.bg.primary,
  },

  header: {
    marginBottom: '20px',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  title: {
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamilyAlt,
    background: `linear-gradient(135deg, ${colors.soft.lemon} 0%, ${colors.soft.peach} 100%)`,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },

  headerDecor: {
    display: 'flex',
    gap: '6px',
  },

  decorDot: {
    width: '10px',
    height: '10px',
    borderRadius: radius.full,
    boxShadow: shadows.sm,
  },

  userCard: {
    display: 'flex',
    alignItems: 'center',
    padding: '16px',
    background: colors.bg.card,
    borderRadius: radius.card,
    border: `1px solid ${colors.bead.cyan}30`,
    boxShadow: `${shadows.sm}, 0 4px 20px ${colors.bead.cyan}10`,
    marginBottom: '24px',
  },

  avatarBox: {
    position: 'relative',
    marginRight: '14px',
  },

  avatar: {
    width: '56px',
    height: '56px',
    borderRadius: radius.bead,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#ffffff',
    overflow: 'hidden',
  },

  avatarImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },

  levelBadge: {
    position: 'absolute',
    bottom: '-4px',
    right: '-4px',
    padding: '2px 8px',
    borderRadius: radius.full,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamilyAlt,
    color: '#ffffff',
    boxShadow: `0 2px 8px rgba(0,0,0,0.3)`,
  },

  userInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
  },

  userName: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.primary,
    marginBottom: '4px',
  },

  userDesc: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.muted,
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },

  loginBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '8px 12px',
    background: `linear-gradient(145deg, ${colors.bead.cyan}, ${colors.pixel.blue})`,
    border: 'none',
    borderRadius: radius.bead,
    color: '#ffffff',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    fontFamily: typography.fontFamilyAlt,
    cursor: 'pointer',
    boxShadow: `0 2px 8px ${colors.bead.cyan}40`,
    transition: animation.transition.fast,
    flexShrink: 0,
  },

  logoutBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '8px 12px',
    background: colors.bg.tertiary,
    border: `1px solid ${colors.border.soft}`,
    borderRadius: radius.bead,
    color: colors.text.secondary,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    fontFamily: typography.fontFamilyAlt,
    cursor: 'pointer',
    transition: animation.transition.fast,
    flexShrink: 0,
  },

  section: {
    marginBottom: '24px',
  },

  sectionTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamilyAlt,
    background: colors.gradients.primary,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    margin: '0 0 12px',
  },

  sectionIcon: {
    color: colors.bead.yellow,
    WebkitTextFillColor: colors.bead.yellow,
  },

  projectCount: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.muted,
    WebkitTextFillColor: colors.text.muted,
    marginLeft: '4px',
  },

  loadingBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '32px 20px',
    background: colors.bg.card,
    borderRadius: radius.card,
    border: `1px solid ${colors.border.soft}`,
    boxShadow: shadows.sm,
    color: colors.text.muted,
    gap: '12px',
  },

  emptyBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '32px 20px',
    background: colors.bg.card,
    borderRadius: radius.card,
    border: `1px solid ${colors.border.soft}`,
    boxShadow: shadows.sm,
  },

  emptyGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '6px',
    marginBottom: '16px',
  },

  emptyCell: {
    width: '20px',
    height: '20px',
    background: colors.bg.tertiary,
    borderRadius: radius.full,
    opacity: 0.5,
  },

  emptyText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.secondary,
    marginBottom: '4px',
  },

  emptyHint: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.muted,
  },

  // 方案列表样式
  projectList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },

  projectCard: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px',
    background: colors.bg.card,
    borderRadius: radius.card,
    border: `1px solid ${colors.border.soft}`,
    boxShadow: shadows.sm,
    cursor: 'pointer',
    transition: animation.transition.fast,
  },

  thumbnailBox: {
    width: '56px',
    height: '56px',
    borderRadius: radius.bead,
    overflow: 'hidden',
    marginRight: '12px',
    flexShrink: 0,
    background: colors.bg.tertiary,
  },

  thumbnail: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    imageRendering: 'pixelated',
  },

  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    color: colors.text.muted,
  },

  projectInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
  },

  projectName: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.primary,
    marginBottom: '4px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },

  projectMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '2px',
  },

  projectSize: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.muted,
  },

  projectProgress: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyAlt,
    color: colors.bead.cyan,
    fontWeight: typography.fontWeight.semibold,
  },

  projectDate: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.muted,
  },

  projectActions: {
    display: 'flex',
    gap: '8px',
    marginLeft: '8px',
  },

  publishList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },

  publishCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px',
    background: colors.bg.card,
    borderRadius: radius.card,
    border: `1px solid ${colors.border.soft}`,
    boxShadow: shadows.sm,
    cursor: 'pointer',
  },

  publishMain: {
    flex: 1,
    minWidth: 0,
  },

  publishTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.primary,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    marginBottom: '4px',
  },

  publishMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '4px',
  },

  publishStatus: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    fontFamily: typography.fontFamilyAlt,
  },

  publishDate: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.muted,
  },

  publishReason: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyAlt,
    color: colors.bead.red,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },

  albumHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
    marginBottom: '10px',
  },

  uploadFinishedBtn: {
    border: 'none',
    borderRadius: radius.button,
    background: `linear-gradient(145deg, ${colors.bead.cyan}, ${colors.bead.cyan}cc)`,
    color: '#fff',
    padding: '8px 12px',
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    fontFamily: typography.fontFamilyAlt,
    cursor: 'pointer',
    flexShrink: 0,
  },

  albumList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },

  albumCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px',
    borderRadius: radius.card,
    border: `1px solid ${colors.border.soft}`,
    background: colors.bg.card,
    boxShadow: shadows.sm,
  },

  albumThumbWrap: {
    width: '56px',
    height: '56px',
    borderRadius: radius.bead,
    overflow: 'hidden',
    flexShrink: 0,
    background: colors.bg.tertiary,
  },

  albumThumb: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },

  albumMain: {
    flex: 1,
    minWidth: 0,
  },

  albumDesc: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.muted,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },

  continueBtn: {
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: `linear-gradient(145deg, ${colors.bead.green}, ${colors.bead.green}cc)`,
    border: 'none',
    borderRadius: radius.bead,
    color: '#ffffff',
    cursor: 'pointer',
    boxShadow: `0 2px 8px ${colors.bead.green}40`,
    transition: animation.transition.fast,
  },

  shareBtn: {
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: `linear-gradient(145deg, ${colors.bead.purple}, ${colors.bead.purple}cc)`,
    border: 'none',
    borderRadius: radius.bead,
    color: '#ffffff',
    cursor: 'pointer',
    boxShadow: `0 2px 8px ${colors.bead.purple}40`,
    transition: animation.transition.fast,
  },

  deleteBtn: {
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: colors.bg.tertiary,
    border: `1px solid ${colors.border.soft}`,
    borderRadius: radius.bead,
    color: colors.bead.red,
    cursor: 'pointer',
    transition: animation.transition.fast,
  },

  menu: {
    background: colors.bg.card,
    borderRadius: radius.card,
    border: `1px solid ${colors.border.soft}`,
    boxShadow: shadows.sm,
    overflow: 'hidden',
    marginBottom: '24px',
  },

  menuItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '14px 16px',
    borderBottom: `1px solid ${colors.border.soft}`,
    cursor: 'pointer',
    transition: animation.transition.fast,
  },

  menuIconBox: {
    width: '36px',
    height: '36px',
    borderRadius: radius.bead,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: '12px',
  },

  menuLabel: {
    flex: 1,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.primary,
  },

  menuArrow: {
    color: colors.text.muted,
    fontSize: '14px',
  },

  versionBox: {
    textAlign: 'center',
  },

  versionDecor: {
    width: '60px',
    height: '4px',
    background: colors.gradients.rainbow,
    borderRadius: radius.full,
    margin: '0 auto 12px',
    opacity: 0.7,
  },

  version: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.secondary,
    margin: '0 0 4px',
  },

  versionSub: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.muted,
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
  },
};

// CSS鍔ㄧ敾
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;
if (!document.querySelector('#profile-styles')) {
  styleSheet.id = 'profile-styles';
  document.head.appendChild(styleSheet);
}

export default ProfilePage;



