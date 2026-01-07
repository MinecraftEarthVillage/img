# -*- coding: utf-8 -*-
import os
from PIL import Image

def align_frames_with_anchor():
    # 创建目标文件夹
    output_dir = "已对齐"
    os.makedirs(output_dir, exist_ok=True)
    
    # 获取所有图片文件（排除配置文件）
    image_extensions = ('.png', '.jpg', '.jpeg', '.bmp', '.gif', '.tiff')
    image_files = [f for f in os.listdir('.') 
                   if os.path.isfile(f) and f.lower().endswith(image_extensions)]
    
    if not image_files:
        print("没有找到图片文件！")
        return
    
    print(f"找到 {len(image_files)} 张图片")
    
    # 询问不动点坐标
    print("\n请输入不动点坐标（相对于每张图片左上角的像素坐标）")
    try:
        anchor_x = int(input("不动点X坐标: "))
        anchor_y = int(input("不动点Y坐标: "))
    except ValueError:
        print("请输入有效的整数坐标！")
        return
    
    # 获取所有图片的尺寸
    images_info = []
    max_width = 0
    max_height = 0
    
    for img_file in image_files:
        try:
            img = Image.open(img_file)
            width, height = img.size
            images_info.append({
                'file': img_file,
                'width': width,
                'height': height,
                'img': img
            })
            
            max_width = max(max_width, width)
            max_height = max(max_height, height)
            
        except Exception as e:
            print(f"无法读取图片 {img_file}: {e}")
            continue
    
    print(f"\n最大尺寸: {max_width} × {max_height}")
    
    # 计算统一的画布大小（给一些边距）
    canvas_width = max_width * 2  # 确保有足够空间
    canvas_height = max_height * 2
    
    # 确定不动点在画布上的位置（中心点）
    canvas_anchor_x = canvas_width // 2
    canvas_anchor_y = canvas_height // 2
    
    print(f"画布尺寸: {canvas_width} × {canvas_height}")
    print(f"不动点在画布中的位置: ({canvas_anchor_x}, {canvas_anchor_y})")
    
    # 处理每张图片
    for info in images_info:
        img = info['img']
        width = info['width']
        height = info['height']
        
        # 创建透明画布
        canvas = Image.new("RGBA", (canvas_width, canvas_height), (0, 0, 0, 0))
        
        # 计算粘贴位置：使图片的不动点对齐到画布的不动点
        # 公式：粘贴位置 = 画布不动点 - 图片不动点
        paste_x = canvas_anchor_x - anchor_x
        paste_y = canvas_anchor_y - anchor_y
        
        # 确保位置在画布范围内（不会越界）
        if paste_x < 0:
            paste_x = 0
        if paste_y < 0:
            paste_y = 0
        if paste_x + width > canvas_width:
            paste_x = canvas_width - width
        if paste_y + height > canvas_height:
            paste_y = canvas_height - height
        
        # 粘贴图片到画布
        canvas.paste(img, (paste_x, paste_y))
        
        # 保存对齐后的图片
        output_path = os.path.join(output_dir, info['file'])
        canvas.save(output_path)
        
        print(f"已对齐: {info['file']} -> {output_path}")
    
    print(f"\n已完成！所有图片已保存到 '{output_dir}' 文件夹")
    print(f"不动点已对齐到画布中心 ({canvas_anchor_x}, {canvas_anchor_y})")

def create_gif_from_aligned():
    """可选功能：从对齐后的图片创建GIF"""
    aligned_dir = "已对齐"
    if not os.path.exists(aligned_dir):
        print(f"'{aligned_dir}' 文件夹不存在！")
        return
    
    aligned_images = [f for f in os.listdir(aligned_dir) 
                     if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
    
    if not aligned_images:
        print(f"'{aligned_dir}' 文件夹中没有图片！")
        return
    
    aligned_images.sort()  # 按文件名排序
    
    frames = []
    for img_file in aligned_images:
        try:
            img_path = os.path.join(aligned_dir, img_file)
            img = Image.open(img_path)
            frames.append(img.convert('RGBA'))
            print(f"已加载: {img_file}")
        except Exception as e:
            print(f"无法加载 {img_file}: {e}")
    
    if frames:
        # 询问GIF参数
        try:
            duration = int(input("\n请输入每帧持续时间(毫秒，推荐100): ") or 100)
        except ValueError:
            duration = 100
        
        output_gif = os.path.join(aligned_dir, "animation.gif")
        
        # 保存为GIF
        frames[0].save(
            output_gif,
            format='GIF',
            append_images=frames[1:],
            save_all=True,
            duration=duration,
            loop=0,  # 无限循环
            transparency=0  # 透明背景
        )
        
        print(f"\nGIF已创建: {output_gif}")
        print(f"帧数: {len(frames)}")
        print(f"每帧时长: {duration}ms")
    else:
        print("没有可用的图片帧！")

def main():
    print("=" * 50)
    print("动画帧对齐工具")
    print("=" * 50)
    print("1. 对齐图片帧（使用不动点）")
    print("2. 从已对齐图片创建GIF")
    print("3. 退出")
    
    choice = input("\n请选择操作 (1-3): ")
    
    if choice == '1':
        align_frames_with_anchor()
    elif choice == '2':
        create_gif_from_aligned()
    elif choice == '3':
        print("再见！")
    else:
        print("无效选择！")

if __name__ == "__main__":
    main()