# Modal 弹框组件优化记录

## 日期
2024年

## 问题背景
为上线抖音小程序做准备，原来使用的浏览器原生弹框（`window.confirm`、`window.prompt`、`alert`）在小程序环境中可能不兼容或表现不一致。需要统一替换为自定义 Modal 组件。

## 解决方案

### 1. 新建统一弹框组件

**文件**: `src/components/Modal.tsx`

支持三种模式：
- **Alert**: 纯提示，只有确定按钮
- **Confirm**: 确认操作，有确定和取消按钮
- **Prompt**: 输入确认，带输入框

支持四种类型样式：
- `info` - 信息提示（青色）
- `success` - 成功提示（绿色）
- `warning` - 警告提示（黄色）
- `error` - 错误提示（红色）

### 2. useModal Hook

提供便捷调用方法：
```typescript
const { modalProps, showAlert, showSuccess, showError, showConfirm, showPrompt } = useModal();

// Alert 提示
showAlert('提示内容', { type: 'warning', title: '提示' });

// Success 提示
showSuccess('操作成功');

// Error 提示
showError('操作失败');

// Confirm 确认
showConfirm('确定要删除吗？', {
  title: '确认删除',
  type: 'warning',
  onConfirm: () => { /* 确认逻辑 */ }
});

// Prompt 输入确认
showPrompt('请输入确认文字', {
  title: '请输入',
  placeholder: '请输入...',
  onConfirm: (value) => { /* 处理输入值 */ }
});
```

### 3. 修改的文件

| 文件 | 修改内容 |
|------|----------|
| `src/components/Modal.tsx` | 新建统一弹框组件 |
| `src/pages/mobile/SettingsPage.tsx` | 替换所有原生弹框为 Modal |
| `src/pages/mobile/FeedbackPage.tsx` | 使用 Modal 替代 alert |
| `src/pages/mobile/ProfilePage.tsx` | 替换删除确认和退出登录确认 |

### 4. 原有代码替换对照

| 原代码 | 新代码 |
|--------|--------|
| `window.confirm('确定？')` | `showConfirm('确定？', { onConfirm: ... })` |
| `window.prompt('请输入')` | `showPrompt('请输入', { onConfirm: (value) => ... })` |
| `alert('提示')` | `showAlert('提示')` |

### 5. 使用方式

```tsx
import Modal, { useModal } from '../../components/Modal';

const MyPage: React.FC = () => {
  const { modalProps, showConfirm, showAlert } = useModal();

  const handleDelete = () => {
    showConfirm('确定要删除吗？', {
      title: '确认删除',
      type: 'warning',
      onConfirm: () => {
        // 执行删除
      }
    });
  };

  return (
    <div>
      {/* 页面内容 */}
      <button onClick={handleDelete}>删除</button>

      {/* Modal 组件放在页面最后 */}
      <Modal {...modalProps} />
    </div>
  );
};
```

## 优点

1. **跨平台兼容**: 在 Web、微信小程序、抖音小程序等环境表现一致
2. **视觉统一**: 与应用整体设计风格保持一致
3. **功能丰富**: 支持多种弹框类型和自定义样式
4. **易于使用**: useModal Hook 提供便捷的调用方式
5. **可扩展**: 易于添加新的弹框类型或样式

## 注意事项

1. 每个使用弹框的页面都需要添加 `<Modal {...modalProps} />` 组件
2. Modal 组件应放在页面 JSX 的最后，确保覆盖层正确显示
3. 弹框回调中的异步操作需要自行处理 loading 状态
