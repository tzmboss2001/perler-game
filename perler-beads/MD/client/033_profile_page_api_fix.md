# Profile 页面 API 加载问题修复

## 日期
2026-01-30

## 问题描述
用户反馈"我的"页面一直显示"加载中..."，无法查看保存的方案。

## 问题分析

### 根本原因
1. **后端数据库延迟高**：本地 Go 服务器连接远程 MySQL 数据库（119.29.139.249），导致查询耗时长达 100+ 秒
2. **数据库连接问题**：日志显示 `invalid connection` 和 `SLOW SQL` 警告
3. **前端无超时处理**：fetch 请求没有超时机制，导致长时间 pending

### 日志分析
```
SLOW SQL >= 200ms
[341796.765ms] SELECT * FROM `projects` WHERE device_id = '...'
Error: write tcp [::1]:8012->[::1]:62145: wsasend: An existing connection was forcibly closed by the remote host.
```

## 解决方案

### 1. 前端 API 添加超时处理

**文件**：`src/services/api/projectApi.ts`

```typescript
// 通用请求函数（带超时处理）
async function request<T>(url: string, options: RequestInit = {}, timeout = 120000): Promise<ApiResponse<T>> {
  // 创建 AbortController 用于超时控制
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    console.log(`[API] 请求开始: ${url}`);
    const startTime = Date.now();

    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    clearTimeout(timeoutId);
    console.log(`[API] 请求完成: ${url}, 耗时: ${Date.now() - startTime}ms`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`请求超时 (${timeout / 1000}秒)`);
    }
    throw error;
  }
}
```

### 2. Profile 页面优化加载逻辑

**文件**：`src/pages/mobile/ProfilePage.tsx`

```typescript
// 加载方案列表（仅登录用户加载云端数据）
useEffect(() => {
  // 如果未登录，不加载云端数据
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
      console.log('[ProfilePage] 开始加载方案列表...');
      const response = await projectApi.getList({ page: 1, pageSize: 20 });

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
```

### 3. 改进加载状态显示

- 未登录用户：显示"登录后查看方案"
- 加载中：显示"正在加载方案..."和"首次加载可能需要较长时间"提示
- 无方案：显示"暂无方案"

## 修改文件
- `src/services/api/projectApi.ts` - 添加超时处理
- `src/pages/mobile/ProfilePage.tsx` - 优化加载逻辑和状态显示

## 测试结果
- ✅ 页面正确加载 10 个保存的方案
- ✅ 显示方案缩略图、名称、尺寸、进度
- ✅ 未登录状态显示提示信息
- ✅ 加载状态有友好提示

## 后续优化建议
1. **数据库优化**：将 MySQL 迁移到本地或使用连接池保持长连接
2. **缓存策略**：添加 Redis 缓存减少数据库查询
3. **数据库索引**：确保 device_id 字段有索引（已配置但需验证）

## 截图
![Profile 页面修复后](../TEMP/profile_page_fixed.png)
