# 模板API后端集成

## 修改日期
2026-02-02

## 修改内容

### 1. 数据库初始化
- 在 `template_categories` 表中插入了6个分类：
  - 卡通动漫 (id=1)
  - 游戏角色 (id=2)
  - 可爱动物 (id=3)
  - 风景 (id=4)
  - 节日主题 (id=5)
  - 其他 (id=6)

### 2. 前端API服务
创建了 `perler-beads/src/services/api/templateApi.ts`：
- `getCategories()` - 获取模板分类列表
- `getList()` - 获取模板列表（支持分页、筛选）
- `getFeatured()` - 获取精选模板（首页用）
- `getById()` - 获取模板详情
- `useTemplate()` - 使用模板（需登录）

### 3. 前端组件修改

#### TemplateCategoryList.tsx
- 从API动态加载分类数据
- 添加loading状态和骨架屏
- 保留图标和颜色的前端映射配置

#### HomePage.tsx
- 精选作品优先从API获取
- API无数据时降级到本地生成的数据
- 添加难度映射（后端字符串 -> 前端类型）

### 4. 工具脚本
创建了 `SCRIPT/insert_template.sql`：
- SQL模板用于插入新模板
- 包含字段说明和使用方法
- 包含bead_data JSON格式说明

## API接口列表

### 公开接口（无需登录）
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/v1/template/list | 模板列表 |
| GET | /api/v1/template/featured | 精选模板 |
| GET | /api/v1/template/categories | 模板分类 |
| GET | /api/v1/template/:id | 模板详情 |

### 私有接口（需要登录）
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/v1/template/:id/use | 使用模板 |
| POST | /api/v1/template/create | 创建模板 |
| PUT | /api/v1/template/:id | 更新模板 |
| DELETE | /api/v1/template/:id | 删除模板 |
| POST | /api/v1/template/category/create | 创建分类 |
| PUT | /api/v1/template/category/:id | 更新分类 |
| DELETE | /api/v1/template/category/:id | 删除分类 |

## 下一步
1. 用户上传模板图片到腾讯云COS
2. 使用SQL脚本或管理后台添加模板数据
3. 前端会自动从API获取并显示
