"""
深度估计脚本
使用 Depth Anything V2 模型估计图片的深度图

用法：
    python depth_estimate.py <图片路径> [输出路径]

示例：
    python depth_estimate.py teddy.png
    python depth_estimate.py teddy.png depth_output.png
"""

import sys
import os

def check_dependencies():
    """检查并安装依赖"""
    required = ['torch', 'transformers', 'PIL', 'numpy']
    missing = []

    try:
        import torch
    except ImportError:
        missing.append('torch')

    try:
        import transformers
    except ImportError:
        missing.append('transformers')

    try:
        from PIL import Image
    except ImportError:
        missing.append('Pillow')

    try:
        import numpy
    except ImportError:
        missing.append('numpy')

    if missing:
        print(f"缺少依赖: {', '.join(missing)}")
        print(f"请运行: pip install {' '.join(missing)}")
        sys.exit(1)

def main():
    # 检查依赖
    check_dependencies()

    import torch
    from transformers import pipeline
    from PIL import Image
    import numpy as np

    # 检查参数
    if len(sys.argv) < 2:
        print("用法: python depth_estimate.py <图片路径> [输出路径]")
        print("示例: python depth_estimate.py teddy.png")
        sys.exit(1)

    input_path = sys.argv[1]

    # 默认输出路径
    if len(sys.argv) >= 3:
        output_path = sys.argv[2]
    else:
        base_name = os.path.splitext(input_path)[0]
        output_path = f"{base_name}_depth.png"

    # 检查输入文件
    if not os.path.exists(input_path):
        print(f"错误: 找不到文件 {input_path}")
        sys.exit(1)

    print(f"输入图片: {input_path}")
    print(f"输出路径: {output_path}")

    # 加载图片
    print("正在加载图片...")
    image = Image.open(input_path)
    print(f"图片尺寸: {image.size[0]} x {image.size[1]}")

    # 选择设备
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"使用设备: {device}")

    # 加载深度估计模型
    print("正在加载 Depth Anything V2 模型（首次运行需要下载，约 400MB）...")

    try:
        # 使用 Depth Anything V2 Small 模型（较小，速度快）
        pipe = pipeline(
            task="depth-estimation",
            model="depth-anything/Depth-Anything-V2-Small-hf",
            device=device
        )
    except Exception as e:
        print(f"加载模型失败: {e}")
        print("尝试使用 CPU 模式...")
        pipe = pipeline(
            task="depth-estimation",
            model="depth-anything/Depth-Anything-V2-Small-hf",
            device="cpu"
        )

    # 执行深度估计
    print("正在估计深度...")
    result = pipe(image)

    # 获取深度图
    depth_image = result["depth"]

    # 保存深度图
    depth_image.save(output_path)
    print(f"深度图已保存到: {output_path}")

    # 同时保存一个彩色版本（更直观）
    color_output_path = output_path.replace('.png', '_color.png')

    # 转换为numpy数组
    depth_array = np.array(depth_image)

    # 归一化到0-255
    depth_normalized = ((depth_array - depth_array.min()) / (depth_array.max() - depth_array.min()) * 255).astype(np.uint8)

    # 应用颜色映射（使用matplotlib的colormap）
    try:
        import matplotlib.pyplot as plt
        import matplotlib.cm as cm

        # 使用 'inferno' colormap（暖色调，深度感强）
        colormap = cm.get_cmap('inferno')
        depth_colored = (colormap(depth_normalized / 255.0)[:, :, :3] * 255).astype(np.uint8)

        color_image = Image.fromarray(depth_colored)
        color_image.save(color_output_path)
        print(f"彩色深度图已保存到: {color_output_path}")
    except ImportError:
        print("提示: 安装 matplotlib 可以生成彩色深度图 (pip install matplotlib)")

    # 输出深度统计信息
    print("\n深度统计:")
    print(f"  最小深度值: {depth_array.min()}")
    print(f"  最大深度值: {depth_array.max()}")
    print(f"  平均深度值: {depth_array.mean():.2f}")

    print("\n完成！")
    print(f"灰度深度图: {output_path}")
    if os.path.exists(color_output_path):
        print(f"彩色深度图: {color_output_path}")

if __name__ == "__main__":
    main()
