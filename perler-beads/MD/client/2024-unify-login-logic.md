# 统一登录入口逻辑

## 日期
2024年

## 需求背景
项目中有两个登录入口，但逻辑不一致：
1. **LoginPage**（我的页面→登录按钮）：传统模式，需要手动选择登录或注册
2. **LoginModal**（点击制作时弹窗）：智能模式，自动判断邮箱是否存在

用户体验不统一，需要将两个入口的逻辑统一为智能登录模式。

## 实现方案

### 修改 LoginPage.tsx

将传统的登录/注册分离模式改为智能登录模式：

#### 修改前
```typescript
// 使用分开的 login() 和 register() 方法
const { login, register, isLoggedIn, loading, error, clearError } = useUserStore();

// 有登录/注册标签页切换
const [mode, setMode] = useState<AuthMode>('login');

// 注册需要：用户名、昵称、确认密码
const [username, setUsername] = useState('');
const [nickname, setNickname] = useState('');
const [confirmPassword, setConfirmPassword] = useState('');
```

#### 修改后
```typescript
// 使用 smartLogin() 方法
const { smartLogin, isLoggedIn, loading, error, clearError } = useUserStore();

// 新增成功消息状态
const [successMessage, setSuccessMessage] = useState<string | null>(null);

// 提交表单使用智能登录
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!validateForm()) return;

  const result = await smartLogin({ email, password });
  if (result.success) {
    if (result.isNewUser) {
      setSuccessMessage('欢迎加入！账号已自动创建');
      setTimeout(() => {
        navigate(from, { replace: true });
      }, 1000);
    } else {
      navigate(from, { replace: true });
    }
  }
};
```

### 界面变化

| 变化项 | 修改前 | 修改后 |
|--------|--------|--------|
| 标签页 | 有登录/注册两个标签 | 移除标签页 |
| 输入框 | 邮箱、用户名、昵称、密码、确认密码 | 仅邮箱、密码 |
| 提示文字 | 无 | "输入邮箱和密码，新用户自动注册" |
| 按钮文字 | "登录" 或 "注册" | "登录 / 注册" |
| 底部提示 | "登录即表示您同意..." | "新邮箱将自动注册，忘记密码可通过邮箱找回" |
| 成功提示 | 无 | 新用户显示"欢迎加入！账号已自动创建" |

## 涉及文件

1. `src/pages/mobile/LoginPage.tsx` - 登录页面

## 效果说明

现在两个登录入口的逻辑完全一致：
- 用户只需输入邮箱和密码
- 后端自动判断邮箱是否存在
- 存在则登录，不存在则自动注册
- 新用户会看到欢迎提示

## 用户体验改进

1. 减少用户操作步骤（无需选择登录/注册）
2. 减少输入项（无需填写用户名、确认密码）
3. 统一的操作流程，降低用户困惑
4. 新用户友好提示

---

## 附加修改：移除首页右上角头像按钮

### 原因
- 底部导航栏已有"我的"入口，首页右上角按钮功能重复
- 抖音小程序顶部区域会被平台占用（状态栏、胶囊按钮）

### 修改内容
1. 移除 HomePage.tsx 中的 avatarButton 按钮
2. 移除相关的 User 图标导入
3. 移除 userInfo 的使用
4. 移除 avatarButton 和 avatarImage 样式定义

### 涉及文件
- `src/pages/mobile/HomePage.tsx`
