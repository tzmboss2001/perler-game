/**
 * 本地存储服务 - 替代后端 API
 * 将方案数据保存到 localStorage
 */

// 存储键
const PROJECTS_KEY = 'perler_beads_projects';
const PROJECT_ID_KEY = 'perler_beads_project_id';

// 方案信息
export interface LocalProject {
  id: number;
  name: string;
  thumbnail: string;  // Base64 图片
  originalImage: string;  // Base64 图片
  beadData: {
    width: number;
    height: number;
    beads: Array<{
      id: string;
      name: string;
      nameCN: string;
      rgb: [number, number, number];
      hex: string;
      brand: string;
    }>;
  };
  settings: {
    gridSize: number;
    gridHeight?: number;  // 实际高度（按比例计算，可能 !== gridSize）
    colorCount: number;
    saturationBoost: number;
    vibrancyPreference: number;
  };
  progress: {
    mode: 'row' | 'block';
    currentIndex: number;
    completedItems: number[];
    blockSize: number;
  } | null;
  status: number;  // 0: 进行中, 1: 已完成
  createdAt: string;
  updatedAt: string;
}

// 获取下一个 ID
function getNextId(): number {
  const currentId = localStorage.getItem(PROJECT_ID_KEY);
  const nextId = currentId ? parseInt(currentId) + 1 : 1;
  localStorage.setItem(PROJECT_ID_KEY, nextId.toString());
  return nextId;
}

// 获取所有方案
function getAllProjects(): LocalProject[] {
  const data = localStorage.getItem(PROJECTS_KEY);
  return data ? JSON.parse(data) : [];
}

// 保存所有方案
function saveAllProjects(projects: LocalProject[]): void {
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
}

// 本地存储服务
export const localStorageService = {
  /**
   * 创建方案
   */
  createProject: (data: {
    name: string;
    thumbnail: string;
    originalImage: string;
    beadData: LocalProject['beadData'];
    settings: LocalProject['settings'];
  }): { id: number } => {
    const projects = getAllProjects();
    const now = new Date().toISOString();

    const newProject: LocalProject = {
      id: getNextId(),
      name: data.name,
      thumbnail: data.thumbnail,
      originalImage: data.originalImage,
      beadData: data.beadData,
      settings: data.settings,
      progress: null,
      status: 0,
      createdAt: now,
      updatedAt: now,
    };

    projects.unshift(newProject);  // 新项目放在最前面
    saveAllProjects(projects);

    return { id: newProject.id };
  },

  /**
   * 获取方案列表
   */
  getProjectList: (params: { page?: number; pageSize?: number; status?: number } = {}): {
    list: LocalProject[];
    total: number;
    page: number;
    pageSize: number;
  } => {
    const { page = 1, pageSize = 20, status } = params;
    let projects = getAllProjects();

    // 按状态筛选
    if (status !== undefined) {
      projects = projects.filter(p => p.status === status);
    }

    // 分页
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const list = projects.slice(start, end);

    return {
      list,
      total: projects.length,
      page,
      pageSize,
    };
  },

  /**
   * 获取方案详情
   */
  getProjectById: (id: number): LocalProject | null => {
    const projects = getAllProjects();
    return projects.find(p => p.id === id) || null;
  },

  /**
   * 更新方案
   */
  updateProject: (id: number, data: Partial<LocalProject>): boolean => {
    const projects = getAllProjects();
    const index = projects.findIndex(p => p.id === id);

    if (index === -1) return false;

    projects[index] = {
      ...projects[index],
      ...data,
      updatedAt: new Date().toISOString(),
    };

    saveAllProjects(projects);
    return true;
  },

  /**
   * 更新制作进度
   */
  updateProgress: (id: number, progress: LocalProject['progress']): boolean => {
    return localStorageService.updateProject(id, { progress });
  },

  /**
   * 删除方案
   */
  deleteProject: (id: number): boolean => {
    const projects = getAllProjects();
    const index = projects.findIndex(p => p.id === id);

    if (index === -1) return false;

    projects.splice(index, 1);
    saveAllProjects(projects);
    return true;
  },

  /**
   * 清理旧数据（保留最近 50 个方案）
   */
  cleanupOldProjects: (): void => {
    const projects = getAllProjects();
    if (projects.length > 50) {
      const kept = projects.slice(0, 50);
      saveAllProjects(kept);
    }
  },
};

export default localStorageService;
