"""
基于算法的深度估计脚本
使用距离变换方法估计图片的深度图（不依赖 PyTorch）
特别适合卡通图片和像素图

用法：
    python depth_estimate_algo.py <图片路径> [输出路径] [最大层数]

示例：
    python depth_estimate_algo.py teddy.png
    python depth_estimate_algo.py teddy.png depth_output.png 8
"""

import sys
import os
import cv2
import numpy as np
from PIL import Image

def detect_foreground(image_array):
    """
    检测前景区域
    非白色且非透明的区域视为前景
    """
    if len(image_array.shape) == 2:
        # 灰度图
        gray = image_array
        # 非白色区域为前景
        foreground = gray < 250
    elif image_array.shape[2] == 4:
        # RGBA图像
        alpha = image_array[:, :, 3]
        rgb = image_array[:, :, :3]
        # 非透明且非白色区域为前景
        not_transparent = alpha > 128
        not_white = np.mean(rgb, axis=2) < 250
        foreground = not_transparent & not_white
    else:
        # RGB图像
        # 非白色区域为前景（计算与白色的距离）
        white_dist = np.sqrt(np.sum((image_array.astype(float) - 255) ** 2, axis=2))
        foreground = white_dist > 30  # 阈值可调

    return foreground.astype(np.uint8) * 255

def compute_depth_map(foreground_mask, smoothing=True):
    """
    使用距离变换计算深度图
    边缘浅，中心深
    """
    # 距离变换：计算每个前景像素到最近背景像素的距离
    dist_transform = cv2.distanceTransform(foreground_mask, cv2.DIST_L2, 5)

    # 归一化到 0-255
    if dist_transform.max() > 0:
        depth = (dist_transform / dist_transform.max() * 255).astype(np.uint8)
    else:
        depth = np.zeros_like(foreground_mask)

    # 可选：高斯模糊使深度过渡更平滑
    if smoothing:
        depth = cv2.GaussianBlur(depth, (5, 5), 0)

    return depth

def quantize_depth(depth_map, max_layers=8):
    """
    将深度图量化到指定层数
    返回：量化后的深度图（值为 1 到 max_layers）
    """
    # 背景保持为 0
    mask = depth_map > 0

    # 量化前景
    quantized = np.zeros_like(depth_map)
    if mask.any():
        # 将非零值映射到 1-max_layers
        min_val = depth_map[mask].min()
        max_val = depth_map[mask].max()

        if max_val > min_val:
            # 线性映射到 1-max_layers
            normalized = (depth_map[mask].astype(float) - min_val) / (max_val - min_val)
            quantized[mask] = np.round(normalized * (max_layers - 1)).astype(np.uint8) + 1
        else:
            quantized[mask] = 1

    return quantized

def create_colored_depth(depth_map, colormap='inferno'):
    """
    创建彩色深度图用于可视化
    """
    # 归一化到 0-255
    if depth_map.max() > 0:
        normalized = (depth_map.astype(float) / depth_map.max() * 255).astype(np.uint8)
    else:
        normalized = depth_map

    # 应用颜色映射
    if colormap == 'inferno':
        colored = cv2.applyColorMap(normalized, cv2.COLORMAP_INFERNO)
    elif colormap == 'jet':
        colored = cv2.applyColorMap(normalized, cv2.COLORMAP_JET)
    else:
        colored = cv2.applyColorMap(normalized, cv2.COLORMAP_VIRIDIS)

    # BGR 转 RGB
    colored = cv2.cvtColor(colored, cv2.COLOR_BGR2RGB)

    return colored

def main():
    # 检查参数
    if len(sys.argv) < 2:
        print("用法: python depth_estimate_algo.py <图片路径> [输出路径] [最大层数]")
        print("示例: python depth_estimate_algo.py teddy.png")
        print("      python depth_estimate_algo.py teddy.png depth.png 8")
        sys.exit(1)

    input_path = sys.argv[1]

    # 默认输出路径
    if len(sys.argv) >= 3:
        output_path = sys.argv[2]
    else:
        base_name = os.path.splitext(input_path)[0]
        output_path = f"{base_name}_depth.png"

    # 最大层数
    max_layers = int(sys.argv[3]) if len(sys.argv) >= 4 else 8

    # 检查输入文件
    if not os.path.exists(input_path):
        print(f"错误: 找不到文件 {input_path}")
        sys.exit(1)

    print(f"输入图片: {input_path}")
    print(f"输出路径: {output_path}")
    print(f"最大层数: {max_layers}")

    # 加载图片
    print("\n正在加载图片...")
    image = cv2.imread(input_path, cv2.IMREAD_UNCHANGED)
    if image is None:
        print(f"错误: 无法读取图片 {input_path}")
        sys.exit(1)

    print(f"图片尺寸: {image.shape[1]} x {image.shape[0]}")
    if len(image.shape) > 2:
        print(f"通道数: {image.shape[2]}")

    # 转换为 RGB/RGBA
    if len(image.shape) == 2:
        # 灰度图
        image_rgb = image
    elif image.shape[2] == 3:
        # BGR 转 RGB
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    else:
        # BGRA 转 RGBA
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGRA2RGBA)

    # 检测前景
    print("正在检测前景...")
    foreground = detect_foreground(image_rgb)
    foreground_count = np.sum(foreground > 0)
    total_pixels = foreground.shape[0] * foreground.shape[1]
    print(f"前景像素: {foreground_count} / {total_pixels} ({foreground_count/total_pixels*100:.1f}%)")

    # 计算深度图
    print("正在计算深度图...")
    depth_map = compute_depth_map(foreground)

    # 量化深度
    print(f"正在量化到 {max_layers} 层...")
    quantized_depth = quantize_depth(depth_map, max_layers)

    # 保存灰度深度图
    # 将量化值映射回 0-255 以便可视化
    depth_visual = (quantized_depth.astype(float) / max_layers * 255).astype(np.uint8)
    cv2.imwrite(output_path, depth_visual)
    print(f"灰度深度图已保存到: {output_path}")

    # 保存彩色深度图
    color_output_path = output_path.replace('.png', '_color.png')
    colored_depth = create_colored_depth(depth_map)
    cv2.imwrite(color_output_path, cv2.cvtColor(colored_depth, cv2.COLOR_RGB2BGR))
    print(f"彩色深度图已保存到: {color_output_path}")

    # 保存量化深度数据（用于后续处理）
    data_output_path = output_path.replace('.png', '_data.npy')
    np.save(data_output_path, quantized_depth)
    print(f"量化深度数据已保存到: {data_output_path}")

    # 输出统计信息
    print("\n深度统计:")
    print(f"  深度图范围: {depth_map.min()} - {depth_map.max()}")

    # 统计每层的像素数
    print(f"\n各层像素分布:")
    for layer in range(max_layers + 1):
        count = np.sum(quantized_depth == layer)
        if count > 0:
            if layer == 0:
                print(f"  背景 (Z=0): {count} 像素")
            else:
                print(f"  第 {layer} 层 (Z={layer}): {count} 像素")

    print("\n完成！")
    print(f"灰度深度图: {output_path}")
    print(f"彩色深度图: {color_output_path}")
    print(f"量化数据: {data_output_path}")

if __name__ == "__main__":
    main()
