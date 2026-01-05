# -*- coding: utf-8 -*-
import os
from PIL import Image

# 新增步骤1：创建目标文件夹
output_dir = "已对齐"
os.makedirs(output_dir, exist_ok=True)  # 自动创建文件夹（如果不存在）

def parse_info_file(info_path):
    with open(info_path, 'r', encoding='utf-8-sig') as f:
        lines = f.readlines()
        # 跳过以 "//" 开头的注释行，找到数据行
        for line in lines:
            line = line.strip()
            if line and not line.startswith('//'):
                parts = line.split(',')
                x_offset = int(parts[0])
                y_offset = int(parts[1])
                width = int(parts[2])
                height = int(parts[3])
                return x_offset, y_offset, width, height
        raise ValueError("文件中找不到有效的数据行")

# 后续代码修改保存路径部分
info_files = [f for f in os.listdir() if f.endswith(".info.txt")]
image_files = [f.replace(".info.txt", "") for f in info_files]

max_width = 0
max_height = 0
for info_file in info_files:
    _, _, width, height = parse_info_file(info_file)
    max_width = max(max_width, abs(width))
    max_height = max(max_height, abs(height))

for img_file, info_file in zip(image_files, info_files):
    x_offset, y_offset, width, height = parse_info_file(info_file)
    abs_width = abs(width)
    abs_height = abs(height)
    
    dx = (max_width - abs_width) // 2
    dy = max_height - abs_height - y_offset
    
    img = Image.open(img_file)
    canvas = Image.new("RGBA", (max_width, max_height), (0, 0, 0, 0))
    canvas.paste(img, (dx, dy))
    
    # 修改保存路径：将文件放入"已对齐"文件夹
    output_path = os.path.join(output_dir, f"已对齐_{img_file}")
    canvas.save(output_path)  # 关键保存文件