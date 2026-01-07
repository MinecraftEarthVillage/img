# -*- coding: utf-8 -*-
import os
import re
import tkinter as tk
from tkinter import ttk, filedialog, messagebox, colorchooser
from PIL import Image, ImageTk, ImageSequence
import numpy as np

class GIFAnimator:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("GIF动画帧对齐工具 - 像素级精确标注")
        self.root.geometry("1200x800")
        
        # 初始化变量
        self.images = []
        self.image_paths = []
        self.image_names = []
        self.anchor_points = {}
        
        # 全局视图状态
        self.current_image_index = -1
        self.view_scale = 1.0
        self.view_offset_x = 0
        self.view_offset_y = 0
        self.is_panning = False
        
        # 显示设置
        self.bg_color = (0, 0, 0, 0)
        self.gif_duration = 100
        self.loop_count = 0
        
        # 创建UI
        self.create_widgets()
        
        # 初始化事件绑定
        self.setup_bindings()
        
    def create_widgets(self):
        """创建界面控件"""
        # 主框架
        main_frame = ttk.Frame(self.root)
        main_frame.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)
        
        # 左侧控制面板 - 使用Frame和Scrollbar实现滚动
        control_panel = ttk.Frame(main_frame, width=300)
        control_panel.pack(side=tk.LEFT, fill=tk.BOTH)
        control_panel.pack_propagate(False)
        
        # 创建滚动条
        scrollbar = ttk.Scrollbar(control_panel)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        
        # 创建Canvas作为可滚动的容器
        canvas = tk.Canvas(control_panel, yscrollcommand=scrollbar.set, highlightthickness=0)
        canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        
        # 将滚动条与Canvas关联
        scrollbar.config(command=canvas.yview)
        
        # 创建内部框架（实际放置控件的地方）
        inner_frame = ttk.Frame(canvas)
        
        # 将内部框架作为Canvas的窗口
        canvas_frame = canvas.create_window((0, 0), window=inner_frame, anchor="nw")
        
        # 配置Canvas尺寸
        def configure_canvas(event):
            # 设置内部框架的宽度与Canvas相同
            canvas.itemconfig(canvas_frame, width=event.width)
            # 更新滚动区域
            canvas.configure(scrollregion=canvas.bbox("all"))
        
        canvas.bind("<Configure>", configure_canvas)
        
        # 加载图片按钮
        ttk.Button(inner_frame, text="📁 加载图片文件夹", 
                  command=self.load_images).pack(fill=tk.X, pady=10, padx=5)
        
        # 导入锚点信息按钮
        ttk.Button(inner_frame, text="📄 导入锚点信息", 
                  command=self.import_anchor_info).pack(fill=tk.X, pady=(0, 10), padx=5)
        
        # 图片列表框架
        list_frame = ttk.LabelFrame(inner_frame, text="图片列表", padding=5)
        list_frame.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)
        
        # 列表滚动条
        list_scrollbar = ttk.Scrollbar(list_frame)
        list_scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        
        self.image_listbox = tk.Listbox(list_frame, yscrollcommand=list_scrollbar.set,
                                       selectmode=tk.SINGLE, height=15)
        self.image_listbox.pack(fill=tk.BOTH, expand=True)
        self.image_listbox.bind('<<ListboxSelect>>', self.on_image_select)
        list_scrollbar.config(command=self.image_listbox.yview)
        
        # 缩放控制
        zoom_frame = ttk.LabelFrame(inner_frame, text="视图控制", padding=5)
        zoom_frame.pack(fill=tk.X, padx=5, pady=5)
        
        ttk.Label(zoom_frame, text="缩放:").pack(side=tk.LEFT, padx=(5, 2))
        self.zoom_var = tk.StringVar(value="100%")
        zoom_combo = ttk.Combobox(zoom_frame, textvariable=self.zoom_var,
                                 values=["25%", "50%", "100%", "200%", "400%", "800%"],
                                 width=8, state="readonly")
        zoom_combo.pack(side=tk.LEFT, padx=2)
        zoom_combo.bind("<<ComboboxSelected>>", self.on_zoom_change)
        
        ttk.Button(zoom_frame, text="重置", command=self.reset_view).pack(side=tk.LEFT, padx=5)
        
        # 显示选项
        display_frame = ttk.Frame(zoom_frame)
        display_frame.pack(fill=tk.X, pady=5)
        
        self.show_grid_var = tk.BooleanVar(value=True)
        ttk.Checkbutton(display_frame, text="网格", variable=self.show_grid_var,
                       command=self.redraw_image).pack(side=tk.LEFT, padx=5)
        
        self.show_info_var = tk.BooleanVar(value=True)
        ttk.Checkbutton(display_frame, text="信息", variable=self.show_info_var,
                       command=self.redraw_image).pack(side=tk.LEFT, padx=5)
        
        # 锚点控制
        anchor_frame = ttk.LabelFrame(inner_frame, text="锚点控制", padding=5)
        anchor_frame.pack(fill=tk.X, padx=5, pady=5)
        
        self.anchor_label = ttk.Label(anchor_frame, text="当前锚点: 未设置")
        self.anchor_label.pack(pady=5)
        
        # 坐标输入
        coord_frame = ttk.Frame(anchor_frame)
        coord_frame.pack(fill=tk.X, pady=5)
        
        ttk.Label(coord_frame, text="X:").pack(side=tk.LEFT)
        self.x_var = tk.StringVar()
        ttk.Entry(coord_frame, textvariable=self.x_var, width=6).pack(side=tk.LEFT, padx=(0, 10))
        
        ttk.Label(coord_frame, text="Y:").pack(side=tk.LEFT)
        self.y_var = tk.StringVar()
        ttk.Entry(coord_frame, textvariable=self.y_var, width=6).pack(side=tk.LEFT)
        
        ttk.Button(coord_frame, text="应用", command=self.apply_exact_coords).pack(side=tk.LEFT, padx=10)
        
        # 自动检测按钮
        auto_frame = ttk.Frame(anchor_frame)
        auto_frame.pack(fill=tk.X, pady=2)
        
        ttk.Button(auto_frame, text="自动底部", command=self.auto_detect_bottom).pack(side=tk.LEFT, padx=2)
        ttk.Button(auto_frame, text="自动质心", command=self.auto_detect_centroid).pack(side=tk.LEFT, padx=2)
        
        # 批量操作
        batch_frame = ttk.Frame(anchor_frame)
        batch_frame.pack(fill=tk.X, pady=5)
        
        ttk.Button(batch_frame, text="应用到所有", command=self.apply_anchor_to_all).pack(side=tk.LEFT, padx=2)
        ttk.Button(batch_frame, text="清除当前", command=self.clear_current_anchor).pack(side=tk.LEFT, padx=2)
        
        # GIF设置
        gif_frame = ttk.LabelFrame(inner_frame, text="GIF输出", padding=5)
        gif_frame.pack(fill=tk.X, padx=5, pady=5)
        
        # 帧率
        ttk.Label(gif_frame, text="每帧(ms):").grid(row=0, column=0, sticky=tk.W, padx=5, pady=2)
        self.duration_var = tk.StringVar(value="100")
        ttk.Entry(gif_frame, textvariable=self.duration_var, width=10).grid(row=0, column=1, padx=5, pady=2)
        
        ttk.Label(gif_frame, text="循环(0=无限):").grid(row=1, column=0, sticky=tk.W, padx=5, pady=2)
        self.loop_var = tk.StringVar(value="0")
        ttk.Entry(gif_frame, textvariable=self.loop_var, width=10).grid(row=1, column=1, padx=5, pady=2)
        
        # 背景颜色
        ttk.Button(gif_frame, text="背景颜色", command=self.choose_bg_color).grid(row=2, column=0, columnspan=2, pady=10)
        
        # 输出按钮
        output_frame = ttk.Frame(gif_frame)
        output_frame.grid(row=3, column=0, columnspan=2, pady=5)
        
        ttk.Button(output_frame, text="预览", command=self.preview_animation).pack(side=tk.LEFT, padx=2)
        ttk.Button(output_frame, text="生成GIF", command=self.create_gif).pack(side=tk.LEFT, padx=2)
        ttk.Button(output_frame, text="导出帧", command=self.export_aligned_frames).pack(side=tk.LEFT, padx=2)
        
        # 状态栏
        self.status_label = ttk.Label(inner_frame, text="就绪")
        self.status_label.pack(fill=tk.X, padx=5, pady=10)
        
        # 右侧图片显示区域
        self.display_frame = ttk.Frame(main_frame)
        self.display_frame.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True)
        
        # 创建画布
        self.canvas = tk.Canvas(self.display_frame, bg='#1e1e1e')
        self.canvas.pack(fill=tk.BOTH, expand=True)
        
        # 操作提示
        info_text = """操作提示:
• 左键点击: 设置锚点
• 右键拖动: 平移视图
• 滚轮: 缩放视图
• 视图状态全局共享
• 支持像素级精确标注"""
        
        ttk.Label(self.display_frame, text=info_text, foreground="gray", 
                 justify=tk.LEFT).pack(side=tk.BOTTOM, fill=tk.X, pady=5)
        
        # 更新滚动区域
        inner_frame.update_idletasks()
        canvas.configure(scrollregion=canvas.bbox("all"))
        
    def setup_bindings(self):
        """设置事件绑定"""
        self.canvas.bind("<Button-1>", self.on_canvas_click)
        self.canvas.bind("<Button-3>", self.start_pan)
        self.canvas.bind("<B3-Motion>", self.on_pan)
        self.canvas.bind("<ButtonRelease-3>", self.stop_pan)
        self.canvas.bind("<MouseWheel>", self.on_mousewheel)
        self.canvas.bind("<Button-4>", self.on_mousewheel)
        self.canvas.bind("<Button-5>", self.on_mousewheel)
        self.canvas.bind("<Motion>", self.on_mouse_move)
        self.canvas.bind("<Configure>", self.on_canvas_resize)
    
    def import_anchor_info(self):
        """手动导入锚点信息文件"""
        file_path = filedialog.askopenfilename(
            title="选择锚点信息文件",
            filetypes=[("文本文件", "*.txt"), ("所有文件", "*.*")]
        )
        
        if not file_path:
            return
        
        if self.load_anchor_info_from_txt(file_path):
            messagebox.showinfo("成功", f"已从 {os.path.basename(file_path)} 导入锚点信息")
    
    def load_anchor_info_from_txt(self, txt_path):
        """从txt文件加载锚点信息"""
        if not os.path.exists(txt_path):
            return False
        
        try:
            loaded_count = 0
            with open(txt_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()
            
            # 多种可能的格式匹配模式
            patterns = [
                # 格式1: image.png: 锚点(100, 200)
                r'([^:]+):\s*锚点\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)',
                # 格式2: image.png (100, 200)
                r'([^:]+)\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)',
                # 格式3: image.png: x=100, y=200
                r'([^:]+):\s*[Xx]\s*=\s*(\d+)\s*,\s*[Yy]\s*=\s*(\d+)',
                # 格式4: image.png: (100, 200)
                r'([^:]+):\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)',
            ]
            
            for line in lines:
                line = line.strip()
                if not line or line.startswith(("#", "=", "对齐信息", "画布尺寸", "背景颜色", "总帧数", "成功导出")):
                    continue
                
                for pattern in patterns:
                    match = re.search(pattern, line)
                    if match:
                        img_name = match.group(1).strip()
                        try:
                            x = int(match.group(2))
                            y = int(match.group(3))
                            
                            # 检查该图片是否在已加载列表中
                            if img_name in self.image_names:
                                img_index = self.image_names.index(img_name)
                                self.anchor_points[img_name] = (x, y)
                                loaded_count += 1
                                # 如果当前选中的是这个图片，更新显示
                                if self.current_image_index == img_index:
                                    self.anchor_label.config(text=f"当前锚点: ({x}, {y})")
                                    self.x_var.set(str(x))
                                    self.y_var.set(str(y))
                        except ValueError:
                            continue
                        break
            
            if loaded_count > 0:
                self.status_label.config(text=f"已从文件导入 {loaded_count}/{len(self.images)} 个锚点")
                # 重新绘制当前图片以显示新的锚点
                if self.current_image_index >= 0:
                    self.redraw_image()
                return True
            else:
                messagebox.showwarning("警告", f"未从文件中找到有效的锚点信息")
                return False
                
        except Exception as e:
            messagebox.showerror("错误", f"读取锚点信息文件时出错:\n{str(e)}")
            return False
        
    def load_images(self):
        """加载图片文件夹"""
        folder = filedialog.askdirectory(title="选择包含图片的文件夹")
        if not folder:
            return
        
        self.images.clear()
        self.image_paths.clear()
        self.image_names.clear()
        self.anchor_points.clear()
        self.image_listbox.delete(0, tk.END)
        
        # 支持的图片格式
        image_extensions = ('.png', '.jpg', '.jpeg', '.bmp', '.gif')
        
        for file in sorted(os.listdir(folder)):
            if file.lower().endswith(image_extensions):
                file_path = os.path.join(folder, file)
                try:
                    img = Image.open(file_path).convert("RGBA")
                    
                    # 如果是GIF，提取第一帧
                    if img.format == 'GIF':
                        frames = []
                        for frame in ImageSequence.Iterator(img):
                            frames.append(frame.copy())
                        if frames:
                            img = frames[0].convert("RGBA")
                    
                    self.images.append(img)
                    self.image_paths.append(file_path)
                    self.image_names.append(file)
                    
                    self.image_listbox.insert(tk.END, file)
                    # 默认锚点设为图片中心
                    self.anchor_points[file] = (img.width // 2, img.height // 2)
                    
                except Exception as e:
                    print(f"无法加载图片 {file}: {e}")
        
        if self.images:
            self.status_label.config(text=f"已加载 {len(self.images)} 张图片")
            
            # 检查文件夹中是否有对齐信息.txt文件
            anchor_info_path = os.path.join(folder, "对齐信息.txt")
            if os.path.exists(anchor_info_path):
                if messagebox.askyesno("发现锚点信息", 
                                      f"检测到对齐信息.txt文件，是否自动导入锚点坐标？"):
                    self.load_anchor_info_from_txt(anchor_info_path)
            
            # 检查文件夹中是否有其他可能的锚点信息文件
            else:
                # 检查常见的锚点信息文件名
                anchor_file_patterns = ["anchor_info.txt", "锚点信息.txt", "points.txt", "对齐.txt"]
                for pattern in anchor_file_patterns:
                    pattern_path = os.path.join(folder, pattern)
                    if os.path.exists(pattern_path):
                        if messagebox.askyesno("发现锚点信息", 
                                              f"检测到{pattern}文件，是否自动导入锚点坐标？"):
                            self.load_anchor_info_from_txt(pattern_path)
                            break
            
            if self.image_listbox.size() > 0:
                self.image_listbox.selection_set(0)
                self.on_image_select(None)
        else:
            self.status_label.config(text="未找到图片")
    
    def on_image_select(self, event):
        """选择图片列表中的图片"""
        selection = self.image_listbox.curselection()
        if not selection:
            return
        
        index = selection[0]
        if index < 0 or index >= len(self.images):
            return
        
        # 更新当前图片索引（不改变视图状态）
        self.current_image_index = index
        
        # 显示图片（使用全局视图状态）
        self.redraw_image()
        
        # 更新状态
        img_name = self.image_names[index]
        self.status_label.config(text=f"已切换到: {img_name}")
        
        # 更新锚点显示
        if img_name in self.anchor_points:
            anchor_x, anchor_y = self.anchor_points[img_name]
            self.anchor_label.config(text=f"当前锚点: ({anchor_x}, {anchor_y})")
            self.x_var.set(str(anchor_x))
            self.y_var.set(str(anchor_y))
    
    def redraw_image(self):
        """重新绘制图片"""
        if self.current_image_index < 0 or self.current_image_index >= len(self.images):
            return
        
        # 清除画布
        self.canvas.delete("all")
        
        img = self.images[self.current_image_index]
        img_name = self.image_names[self.current_image_index]
        
        # 获取画布尺寸
        canvas_width = self.canvas.winfo_width()
        canvas_height = self.canvas.winfo_height()
        
        if canvas_width <= 1 or canvas_height <= 1:
            return
        
        # 计算缩放后的尺寸
        scaled_width = int(img.width * self.view_scale)
        scaled_height = int(img.height * self.view_scale)
        
        # 缩放图片
        if self.view_scale != 1.0:
            scaled_img = img.resize((scaled_width, scaled_height), Image.Resampling.NEAREST)
        else:
            scaled_img = img
        
        # 转换为PhotoImage
        self.current_image_tk = ImageTk.PhotoImage(scaled_img)
        
        # 计算显示位置（使用全局偏移）
        display_x = (canvas_width // 2) + self.view_offset_x
        display_y = (canvas_height // 2) + self.view_offset_y
        
        # 显示图片
        self.canvas.create_image(display_x, display_y, anchor=tk.CENTER, image=self.current_image_tk)
        
        # 绘制网格
        if self.show_grid_var.get() and self.view_scale >= 2:
            self.draw_grid(display_x, display_y, scaled_width, scaled_height, img.width, img.height)
        
        # 绘制锚点
        if img_name in self.anchor_points:
            anchor_x, anchor_y = self.anchor_points[img_name]
            self.draw_anchor_marker(anchor_x, anchor_y, display_x, display_y, scaled_width, scaled_height, img.width, img.height)
        
        # 显示信息面板
        if self.show_info_var.get():
            self.draw_info_panel(img_name, img.width, img.height)
        
        # 更新状态
        self.status_label.config(text=f"显示: {img_name} ({self.current_image_index+1}/{len(self.images)})")
    
    def draw_grid(self, display_x, display_y, scaled_width, scaled_height, orig_width, orig_height):
        """绘制网格"""
        grid_start_x = display_x - scaled_width // 2
        grid_start_y = display_y - scaled_height // 2
        
        pixel_size_x = scaled_width / orig_width
        pixel_size_y = scaled_height / orig_height
        
        # 根据缩放级别调整网格颜色
        if self.view_scale >= 8:
            grid_color = '#606060'
        elif self.view_scale >= 4:
            grid_color = '#505050'
        elif self.view_scale >= 2:
            grid_color = '#404040'
        else:
            grid_color = '#303030'
        
        canvas_width = self.canvas.winfo_width()
        canvas_height = self.canvas.winfo_height()
        
        # 绘制垂直线
        for i in range(orig_width + 1):
            x = grid_start_x + i * pixel_size_x
            if -10 <= x <= canvas_width + 10:
                self.canvas.create_line(x, grid_start_y, x, grid_start_y + scaled_height,
                                       fill=grid_color, width=1)
        
        # 绘制水平线
        for i in range(orig_height + 1):
            y = grid_start_y + i * pixel_size_y
            if -10 <= y <= canvas_height + 10:
                self.canvas.create_line(grid_start_x, y, grid_start_x + scaled_width, y,
                                       fill=grid_color, width=1)
    
    def draw_anchor_marker(self, anchor_x, anchor_y, display_x, display_y, scaled_width, scaled_height, orig_width, orig_height):
        """绘制锚点标记 - 修复像素中心位置"""
        # 计算锚点在画布上的位置
        pixel_size_x = scaled_width / orig_width
        pixel_size_y = scaled_height / orig_height
        
        grid_start_x = display_x - scaled_width // 2
        grid_start_y = display_y - scaled_height // 2
        
        # 计算锚点的画布坐标 - 加上0.5使标记在像素中心
        canvas_anchor_x = grid_start_x + (anchor_x + 0.5) * pixel_size_x
        canvas_anchor_y = grid_start_y + (anchor_y + 0.5) * pixel_size_y
        
        # 确保在画布范围内
        canvas_width = self.canvas.winfo_width()
        canvas_height = self.canvas.winfo_height()
        
        canvas_anchor_x = max(10, min(canvas_anchor_x, canvas_width - 10))
        canvas_anchor_y = max(10, min(canvas_anchor_y, canvas_height - 10))
        
        # 根据缩放级别调整标记大小
        if self.view_scale >= 8:
            marker_size = 25
            line_width = 3
            circle_radius = 6
        elif self.view_scale >= 4:
            marker_size = 20
            line_width = 2
            circle_radius = 5
        elif self.view_scale >= 2:
            marker_size = 15
            line_width = 2
            circle_radius = 4
        else:
            marker_size = 10
            line_width = 2
            circle_radius = 3
        
        # 确保最小尺寸
        marker_size = max(marker_size, 10)
        
        # 绘制十字线
        self.canvas.create_line(canvas_anchor_x - marker_size, canvas_anchor_y,
                               canvas_anchor_x + marker_size, canvas_anchor_y,
                               fill='red', width=line_width)
        
        self.canvas.create_line(canvas_anchor_x, canvas_anchor_y - marker_size,
                               canvas_anchor_x, canvas_anchor_y + marker_size,
                               fill='red', width=line_width)
        
        # 绘制中心圆点
        self.canvas.create_oval(canvas_anchor_x - circle_radius, canvas_anchor_y - circle_radius,
                               canvas_anchor_x + circle_radius, canvas_anchor_y + circle_radius,
                               fill='red', outline='white', width=2)
    
    def draw_info_panel(self, img_name, img_width, img_height):
        """绘制信息面板"""
        # 背景面板
        self.canvas.create_rectangle(5, 5, 250, 90, fill='#000000', outline='#666666', width=2)
        
        # 文件名
        display_name = img_name if len(img_name) <= 20 else img_name[:17] + "..."
        self.canvas.create_text(10, 10, text=f"图片: {display_name}", anchor=tk.NW,
                               fill='#ffffff', font=('Arial', 10, 'bold'))
        
        # 图片尺寸
        self.canvas.create_text(10, 30, text=f"尺寸: {img_width} × {img_height}", anchor=tk.NW,
                               fill='#66ccff', font=('Arial', 9))
        
        # 缩放比例
        self.canvas.create_text(10, 50, text=f"缩放: {int(self.view_scale * 100)}%", anchor=tk.NW,
                               fill='#ffff66', font=('Arial', 9))
        
        # 偏移量
        self.canvas.create_text(10, 70, text=f"偏移: ({int(self.view_offset_x)}, {int(self.view_offset_y)})", anchor=tk.NW,
                               fill='#99ff99', font=('Arial', 9))
        
        # 锚点信息
        if img_name in self.anchor_points:
            anchor_x, anchor_y = self.anchor_points[img_name]
            self.canvas.create_text(120, 30, text=f"锚点: ({anchor_x}, {anchor_y})", anchor=tk.NW,
                                   fill='#ff6666', font=('Arial', 9, 'bold'))
    
    def canvas_to_image_coords(self, canvas_x, canvas_y):
        """将画布坐标转换为原始图片坐标"""
        if self.current_image_index < 0:
            return None
        
        img = self.images[self.current_image_index]
        canvas_width = self.canvas.winfo_width()
        canvas_height = self.canvas.winfo_height()
        
        scaled_width = int(img.width * self.view_scale)
        scaled_height = int(img.height * self.view_scale)
        
        display_x = (canvas_width // 2) + self.view_offset_x
        display_y = (canvas_height // 2) + self.view_offset_y
        
        img_left = display_x - scaled_width // 2
        img_right = img_left + scaled_width
        img_top = display_y - scaled_height // 2
        img_bottom = img_top + scaled_height
        
        if not (img_left <= canvas_x <= img_right and img_top <= canvas_y <= img_bottom):
            return None
        
        relative_x = (canvas_x - img_left) / self.view_scale
        relative_y = (canvas_y - img_top) / self.view_scale
        
        img_x = int(max(0, min(relative_x, img.width - 1)))
        img_y = int(max(0, min(relative_y, img.height - 1)))
        
        return img_x, img_y
    
    def on_canvas_click(self, event):
        """处理画布点击事件"""
        if self.current_image_index < 0:
            return
        
        coords = self.canvas_to_image_coords(event.x, event.y)
        if not coords:
            return
        
        img_x, img_y = coords
        img_name = self.image_names[self.current_image_index]
        
        self.anchor_points[img_name] = (img_x, img_y)
        self.redraw_image()
        
        self.root.bell()
        self.status_label.config(text=f"已设置锚点: ({img_x}, {img_y})")
        
        # 更新锚点标签
        self.anchor_label.config(text=f"当前锚点: ({img_x}, {img_y})")
        self.x_var.set(str(img_x))
        self.y_var.set(str(img_y))
    
    def on_mouse_move(self, event):
        """鼠标移动时显示坐标"""
        if self.current_image_index < 0:
            return
        
        # 清除之前的坐标文本
        if hasattr(self, 'coord_text'):
            self.canvas.delete(self.coord_text)
        
        coords = self.canvas_to_image_coords(event.x, event.y)
        
        coord_x, coord_y = event.x + 10, event.y - 10
        canvas_width = self.canvas.winfo_width()
        
        if coord_x + 100 > canvas_width:
            coord_x = event.x - 110
        
        if coord_y < 10:
            coord_y = event.y + 10
        
        if coords:
            img_x, img_y = coords
            coord_str = f"({img_x}, {img_y})"
            color = '#ffff66'
        else:
            coord_str = "图片区域外"
            color = '#cccccc'
        
        self.coord_text = self.canvas.create_text(coord_x, coord_y, text=coord_str,
                                                 anchor=tk.NW, fill=color, font=('Arial', 9, 'bold'))
    
    def start_pan(self, event):
        """开始平移视图"""
        self.is_panning = True
        self.last_pan_x = event.x
        self.last_pan_y = event.y
        self.canvas.config(cursor="fleur")
    
    def on_pan(self, event):
        """平移视图"""
        if not self.is_panning or self.current_image_index < 0:
            return
        
        dx = event.x - self.last_pan_x
        dy = event.y - self.last_pan_y
        
        self.view_offset_x += dx
        self.view_offset_y += dy
        
        self.last_pan_x = event.x
        self.last_pan_y = event.y
        
        self.redraw_image()
    
    def stop_pan(self, event):
        """停止平移视图"""
        self.is_panning = False
        self.canvas.config(cursor="")
    
    def on_mousewheel(self, event):
        """鼠标滚轮缩放"""
        if self.current_image_index < 0:
            return
        
        if event.num == 5 or event.delta < 0:
            scale_factor = 0.9
        else:
            scale_factor = 1.1
        
        new_scale = self.view_scale * scale_factor
        if new_scale < 0.1:
            new_scale = 0.1
        elif new_scale > 8.0:
            new_scale = 8.0
        
        if abs(new_scale - self.view_scale) < 0.01:
            return
        
        # 以鼠标位置为中心缩放
        old_coords = self.canvas_to_image_coords(event.x, event.y)
        
        self.view_scale = new_scale
        
        if old_coords:
            img_x, img_y = old_coords
            img = self.images[self.current_image_index]
            
            canvas_width = self.canvas.winfo_width()
            canvas_height = self.canvas.winfo_height()
            
            display_x = (canvas_width // 2) + self.view_offset_x
            display_y = (canvas_height // 2) + self.view_offset_y
            
            new_canvas_x = display_x - (img.width // 2 - img_x) * self.view_scale
            new_canvas_y = display_y - (img.height // 2 - img_y) * self.view_scale
            
            self.view_offset_x += event.x - new_canvas_x
            self.view_offset_y += event.y - new_canvas_y
        
        self.zoom_var.set(f"{int(self.view_scale * 100)}%")
        self.redraw_image()
    
    def on_zoom_change(self, event):
        """通过下拉框改变缩放"""
        zoom_str = self.zoom_var.get().replace("%", "")
        try:
            new_scale = float(zoom_str) / 100.0
            if new_scale > 8.0:
                new_scale = 8.0
                self.zoom_var.set("800%")
            
            self.view_scale = new_scale
            self.redraw_image()
        except ValueError:
            pass
    
    def on_canvas_resize(self, event):
        """画布大小变化时重新显示图片"""
        self.redraw_image()
    
    def reset_view(self):
        """重置视图"""
        if self.current_image_index < 0:
            return
        
        self.view_scale = 1.0
        self.view_offset_x = 0
        self.view_offset_y = 0
        self.zoom_var.set("100%")
        
        self.redraw_image()
    
    def auto_detect_bottom(self):
        """自动检测底部中心点"""
        if self.current_image_index < 0:
            return
        
        img_name = self.image_names[self.current_image_index]
        img = self.images[self.current_image_index]
        img_array = np.array(img)
        
        if img_array.shape[2] == 4:
            alpha = img_array[:, :, 3]
            rows, cols = np.where(alpha > 10)
            
            if len(rows) > 0:
                bottom_row = np.max(rows)
                bottom_pixels = cols[rows == bottom_row]
                
                if len(bottom_pixels) > 0:
                    center_x = int(np.mean(bottom_pixels))
                    anchor_x = center_x
                    anchor_y = bottom_row - max(10, int(img.height * 0.05))
                    
                    self.anchor_points[img_name] = (anchor_x, anchor_y)
                    self.redraw_image()
                    
                    self.anchor_label.config(text=f"当前锚点: ({anchor_x}, {anchor_y})")
                    self.x_var.set(str(anchor_x))
                    self.y_var.set(str(anchor_y))
                    
                    self.status_label.config(text=f"自动检测底部中心: ({anchor_x}, {anchor_y})")
                    return
        
        self.anchor_points[img_name] = (img.width // 2, img.height // 2)
        self.redraw_image()
        
        self.anchor_label.config(text=f"当前锚点: ({img.width//2}, {img.height//2})")
        self.x_var.set(str(img.width//2))
        self.y_var.set(str(img.height//2))
        
        self.status_label.config(text="自动检测失败，使用中心点")
    
    def auto_detect_centroid(self):
        """自动检测质心"""
        if self.current_image_index < 0:
            return
        
        img_name = self.image_names[self.current_image_index]
        img = self.images[self.current_image_index]
        img_array = np.array(img)
        
        if img_array.shape[2] == 4:
            alpha = img_array[:, :, 3]
            rows, cols = np.where(alpha > 10)
            
            if len(rows) > 0:
                center_x = int(np.mean(cols))
                center_y = int(np.mean(rows))
                
                height_range = np.max(rows) - np.min(rows)
                offset = int(height_range * 0.4)
                
                anchor_x = center_x
                anchor_y = center_y + offset
                
                self.anchor_points[img_name] = (anchor_x, anchor_y)
                self.redraw_image()
                
                self.anchor_label.config(text=f"当前锚点: ({anchor_x}, {anchor_y})")
                self.x_var.set(str(anchor_x))
                self.y_var.set(str(anchor_y))
                
                self.status_label.config(text=f"自动检测质心: ({anchor_x}, {anchor_y})")
                return
        
        self.anchor_points[img_name] = (img.width // 2, img.height // 2)
        self.redraw_image()
        
        self.anchor_label.config(text=f"当前锚点: ({img.width//2}, {img.height//2})")
        self.x_var.set(str(img.width//2))
        self.y_var.set(str(img.height//2))
        
        self.status_label.config(text="自动检测失败，使用中心点")
    
    def apply_exact_coords(self):
        """应用精确坐标"""
        if self.current_image_index < 0:
            return
        
        try:
            x = int(self.x_var.get())
            y = int(self.y_var.get())
            
            img = self.images[self.current_image_index]
            x = max(0, min(x, img.width - 1))
            y = max(0, min(y, img.height - 1))
            
            img_name = self.image_names[self.current_image_index]
            self.anchor_points[img_name] = (x, y)
            self.redraw_image()
            
            self.anchor_label.config(text=f"当前锚点: ({x}, {y})")
            self.status_label.config(text=f"已设置精确锚点: ({x}, {y})")
        except ValueError:
            messagebox.showerror("错误", "请输入有效的整数坐标！")
    
    def apply_anchor_to_all(self):
        """将当前锚点应用到所有帧"""
        if self.current_image_index < 0:
            return
        
        current_name = self.image_names[self.current_image_index]
        if current_name not in self.anchor_points:
            return
        
        current_anchor = self.anchor_points[current_name]
        
        for img_name in self.image_names:
            self.anchor_points[img_name] = current_anchor
        
        self.status_label.config(text=f"已将锚点应用到所有 {len(self.images)} 张图片")
        self.redraw_image()
    
    def clear_current_anchor(self):
        """清除当前锚点"""
        if self.current_image_index < 0:
            return
        
        img_name = self.image_names[self.current_image_index]
        img = self.images[self.current_image_index]
        
        self.anchor_points[img_name] = (img.width // 2, img.height // 2)
        self.redraw_image()
        
        self.anchor_label.config(text=f"当前锚点: ({img.width//2}, {img.height//2})")
        self.x_var.set(str(img.width//2))
        self.y_var.set(str(img.height//2))
        
        self.status_label.config(text="已清除当前锚点")
    
    def choose_bg_color(self):
        """选择背景颜色"""
        color = colorchooser.askcolor(title="选择背景颜色", initialcolor='#000000')
        if color[0]:
            r, g, b = [int(c) for c in color[0]]
            self.bg_color = (r, g, b, 255)
            self.status_label.config(text=f"背景颜色: RGB({r}, {g}, {b})")
    
    def calculate_canvas_size(self):
        """计算统一画布的大小"""
        if not self.images:
            return (0, 0)
        
        left_max = right_max = top_max = bottom_max = 0
        
        for i, img_name in enumerate(self.image_names):
            img = self.images[i]
            if img_name in self.anchor_points:
                anchor_x, anchor_y = self.anchor_points[img_name]
                left_max = max(left_max, anchor_x)
                right_max = max(right_max, img.width - anchor_x)
                top_max = max(top_max, anchor_y)
                bottom_max = max(bottom_max, img.height - anchor_y)
        
        margin = 20
        canvas_width = left_max + right_max + margin * 2
        canvas_height = top_max + bottom_max + margin * 2
        
        return canvas_width, canvas_height
    
    def create_aligned_frames(self):
        """创建对齐后的帧列表"""
        if not self.images:
            return []
        
        canvas_width, canvas_height = self.calculate_canvas_size()
        if canvas_width <= 0 or canvas_height <= 0:
            messagebox.showerror("错误", f"无效的画布尺寸: {canvas_width}×{canvas_height}")
            return []
        
        margin = 20
        ref_x = margin
        ref_y = margin
        
        for i in range(len(self.images)):
            img_name = self.image_names[i]
            if img_name in self.anchor_points:
                ref_x = max(ref_x, self.anchor_points[img_name][0])
                ref_y = max(ref_y, self.anchor_points[img_name][1])
        
        frames = []
        for i, img_name in enumerate(self.image_names):
            img = self.images[i]
            
            if img_name not in self.anchor_points:
                anchor_x, anchor_y = img.width // 2, img.height // 2
            else:
                anchor_x, anchor_y = self.anchor_points[img_name]
            
            canvas = Image.new("RGBA", (canvas_width, canvas_height), self.bg_color)
            
            paste_x = ref_x - anchor_x + margin
            paste_y = ref_y - anchor_y + margin
            
            paste_x = max(0, min(paste_x, canvas_width - img.width))
            paste_y = max(0, min(paste_y, canvas_height - img.height))
            
            canvas.paste(img, (paste_x, paste_y), img)
            frames.append(canvas)
        
        return frames
    
    def preview_animation(self):
        """预览动画"""
        frames = self.create_aligned_frames()
        if not frames:
            messagebox.showwarning("警告", "请先加载图片并设置锚点！")
            return
        
        # 计算预览窗口大小
        canvas_width, canvas_height = self.calculate_canvas_size()
        if canvas_width <= 0 or canvas_height <= 0:
            messagebox.showerror("错误", "无法计算画布尺寸！")
            return
        
        # 创建预览窗口
        preview_window = tk.Toplevel(self.root)
        preview_window.title("动画预览")
        
        # 设置窗口尺寸
        window_width = min(800, max(200, canvas_width))
        window_height = min(600, max(150, canvas_height))
        preview_window.geometry(f"{window_width}x{window_height}")
        preview_window.minsize(200, 150)
        
        # 预览画布
        preview_canvas = tk.Canvas(preview_window, bg='gray20')
        preview_canvas.pack(fill=tk.BOTH, expand=True)
        
        # 动画控制变量
        self.preview_frames = frames
        self.preview_index = 0
        self.preview_canvas = preview_canvas
        self.preview_window = preview_window
        
        # 开始动画
        self.animate_preview()
        
        # 关闭窗口时停止动画
        preview_window.protocol("WM_DELETE_WINDOW", self.stop_preview)
    
    def animate_preview(self):
        """动画循环"""
        if not hasattr(self, 'preview_frames') or not hasattr(self, 'preview_window'):
            return
        
        try:
            # 检查窗口是否还存在
            if not self.preview_window.winfo_exists():
                return
            
            # 检查帧列表是否为空
            if not self.preview_frames:
                return
            
            # 计算下一帧
            self.preview_index = (self.preview_index + 1) % len(self.preview_frames)
            frame = self.preview_frames[self.preview_index]
            
            # 计算窗口大小
            window_width = self.preview_window.winfo_width()
            window_height = self.preview_window.winfo_height()
            
            # 确保窗口大小有效
            if window_width <= 10 or window_height <= 10:
                window_width = 400
                window_height = 300
            
            # 计算缩放
            scale_x = window_width / frame.width
            scale_y = window_height / frame.height
            scale = min(scale_x, scale_y, 1.0)
            
            # 确保缩放后的尺寸大于0
            scaled_width = max(1, int(frame.width * scale))
            scaled_height = max(1, int(frame.height * scale))
            
            # 缩放图片
            scaled_frame = frame.resize((scaled_width, scaled_height), Image.Resampling.LANCZOS)
            
            # 转换为PhotoImage
            frame_tk = ImageTk.PhotoImage(scaled_frame)
            
            # 更新显示
            self.preview_canvas.delete("all")
            self.preview_canvas.create_image(window_width//2, window_height//2, 
                                           image=frame_tk, anchor=tk.CENTER)
            self.preview_canvas.image = frame_tk  # 保持引用
            
            # 显示帧信息
            info_text = f"帧 {self.preview_index+1}/{len(self.preview_frames)}"
            self.preview_canvas.create_text(10, 10, text=info_text, 
                                           anchor=tk.NW, fill='white')
            
            # 设置下一帧
            try:
                duration = int(self.duration_var.get())
            except ValueError:
                duration = 100
            
            self.preview_window.after(duration, self.animate_preview)
            
        except tk.TclError:
            # 窗口已关闭
            pass
        except Exception as e:
            print(f"预览动画错误: {e}")
            self.stop_preview()
    
    def stop_preview(self):
        """停止预览"""
        if hasattr(self, 'preview_window'):
            try:
                self.preview_window.destroy()
            except:
                pass
    
    def create_gif(self):
        """创建GIF文件"""
        frames = self.create_aligned_frames()
        if not frames:
            messagebox.showwarning("警告", "请先加载图片！")
            return
        
        try:
            duration = int(self.duration_var.get())
            loop = int(self.loop_var.get())
        except ValueError:
            messagebox.showerror("错误", "请输入有效的数字！")
            return
        
        file_path = filedialog.asksaveasfilename(
            title="保存GIF文件",
            defaultextension=".gif",
            filetypes=[("GIF文件", "*.gif"), ("所有文件", "*.*")]
        )
        
        if not file_path:
            return
        
        self.status_label.config(text="正在创建GIF...")
        self.root.update()
        
        try:
            frames[0].save(
                file_path,
                format='GIF',
                append_images=frames[1:],
                save_all=True,
                duration=duration,
                loop=loop,
                transparency=0 if self.bg_color[3] == 0 else None,
                disposal=2
            )
            
            self.status_label.config(text=f"GIF已保存: {os.path.basename(file_path)}")
            messagebox.showinfo("成功", f"GIF已成功保存到:\n{file_path}")
            
        except Exception as e:
            messagebox.showerror("错误", f"保存GIF时出错:\n{str(e)}")
            self.status_label.config(text="保存失败")
    
    def export_aligned_frames(self):
        """导出对齐后的静态帧"""
        frames = self.create_aligned_frames()
        if not frames:
            messagebox.showwarning("警告", "请先加载图片并设置锚点！")
            return
        
        folder = filedialog.askdirectory(title="选择保存对齐帧的文件夹")
        if not folder:
            return
        
        export_dir = os.path.join(folder, "已对齐")
        os.makedirs(export_dir, exist_ok=True)
        
        self.status_label.config(text="正在导出对齐帧...")
        self.root.update()
        
        success_count = 0
        for i, frame in enumerate(frames):
            if i < len(self.image_names):
                original_name = self.image_names[i]
                name, ext = os.path.splitext(original_name)
                export_name = f"{name}{ext}"
            else:
                export_name = f"frame_{i:03d}.png"
            
            export_path = os.path.join(export_dir, export_name)
            try:
                frame.save(export_path)
                success_count += 1
            except Exception as e:
                print(f"保存失败 {export_name}: {e}")
        
        info_path = os.path.join(export_dir, "对齐信息.txt")
        with open(info_path, "w", encoding="utf-8") as f:
            f.write("对齐帧导出信息\n")
            f.write("=" * 40 + "\n")
            canvas_width, canvas_height = self.calculate_canvas_size()
            f.write(f"画布尺寸: {canvas_width} × {canvas_height}\n")
            f.write(f"背景颜色: {self.bg_color}\n")
            f.write(f"总帧数: {len(frames)}\n")
            f.write(f"成功导出: {success_count} 张\n\n")
            
            for i, img_name in enumerate(self.image_names):
                if i < len(self.image_names) and img_name in self.anchor_points:
                    anchor_x, anchor_y = self.anchor_points[img_name]
                    f.write(f"{img_name}: 锚点({anchor_x}, {anchor_y})\n")
        
        self.status_label.config(text=f"已导出 {success_count}/{len(frames)} 张对齐帧")
        messagebox.showinfo("成功", f"已成功导出 {success_count}/{len(frames)} 张对齐帧到:\n{export_dir}")
    
    def run(self):
        """运行应用程序"""
        self.root.mainloop()

def main():
    """主函数"""
    try:
        import numpy as np
    except ImportError:
        print("错误: 需要安装 numpy")
        print("请运行: pip install numpy")
        return
    
    try:
        from PIL import Image, ImageTk
    except ImportError:
        print("错误: 需要安装 Pillow")
        print("请运行: pip install pillow")
        return
    
    app = GIFAnimator()
    app.run()

if __name__ == "__main__":
    main()