# 分享功能实现

## 日期
2026-01-25

## 功能描述
在编辑器页面添加分享功能，用户可以：
1. 生成分享海报（包含作品图案、尺寸、颜色统计）
2. 保存海报图片到本地
3. 复制页面链接分享给朋友

## 实现文件

### 新增文件
- `src/components/ShareModal.tsx` - 分享弹窗组件

### 修改文件
- `src/pages/mobile/EditorPage.tsx` - 集成分享功能

## 技术实现

### ShareModal 组件
```typescript
interface ShareModalProps {
  visible: boolean;
  onClose: () => void;
  imageData: string; // 图案图片 base64
  title: string;
  stats: { color: string; count: number; name: string }[];
  gridSize: { width: number; height: number };
}
```

### 海报生成（Canvas）
- 尺寸：360 x 520 像素
- 包含顶部/底部彩虹装饰条
- 显示标题、图案、尺寸信息
- 显示前6种颜色的统计
- 底部品牌信息

### 保存图片功能
```javascript
const handleSaveImage = () => {
  const link = document.createElement('a');
  link.download = `${title}_${Date.now()}.png`;
  link.href = posterUrl;
  link.click();
  toast.success('图片已保存');
};
```

### 复制链接功能
```javascript
const handleCopyLink = async () => {
  await navigator.clipboard.writeText(window.location.href);
  toast.success('链接已复制');
};
```

## EditorPage 集成

### 新增 import
```typescript
import { ShareNetwork } from '@phosphor-icons/react';
import ShareModal from '../../components/ShareModal';
```

### 新增状态
```typescript
const [showShareModal, setShowShareModal] = useState(false);
```

### 分享按钮
```jsx
<button
  style={styles.secondaryBtn}
  onClick={() => setShowShareModal(true)}
  disabled={!beadData}
>
  <ShareNetwork size={18} />
  分享
</button>
```

## 测试结果
| 测试项 | 结果 |
|--------|------|
| 分享按钮显示 | ✅ |
| 点击打开弹窗 | ✅ |
| 海报图片生成 | ✅ |
| 复制链接 | ✅ Toast 提示"链接已复制" |
| 保存图片 | ✅ 触发下载 |

## 截图
- `TEMP/share_modal_success.png` - 分享弹窗
- `TEMP/share_copy_link.png` - 复制链接成功
