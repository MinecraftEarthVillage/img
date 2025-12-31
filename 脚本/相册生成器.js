// 脚本/相册生成器.js
const 相册生成器 = {
    当前路径: '',
    图片数据: null,
    所有图片列表: [],
    当前图片索引: 0,
    视图模式: '网格',

    初始化: function() {
        this.加载图片数据();
        this.绑定事件();
    },

    加载图片数据: function() {
        const 加载指示器 = document.getElementById('加载指示器');
        const 相册容器 = document.getElementById('相册容器');
        
        fetch('图片索引.json')
            .then(响应 => 响应.json())
            .then(数据 => {
                this.图片数据 = 数据.图片索引;
                this.所有图片列表 = this.获取所有图片列表(this.图片数据);
                this.更新图片总数(this.所有图片列表.length);
                
                加载指示器.style.display = 'none';
                this.显示相册内容('', 相册容器);
            })
            .catch(错误 => {
                console.error('加载图片索引失败:', 错误);
                加载指示器.innerHTML = `
                    <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #f0ad4e; margin-bottom: 20px;"></i>
                    <p>无法加载图片数据，请检查图片索引文件是否存在</p>
                `;
            });
    },

    获取所有图片列表: function(数据) {
        const 所有图片 = [];
        
        function 遍历数据(路径, 内容) {
            for (const 项目 of 内容) {
                if (项目.类型 === '图片') {
                    所有图片.push({
                        路径: 项目.完整路径,
                        名称: 项目.名称,
                        目录: 路径
                    });
                } else if (项目.类型 === '目录') {
                    遍历数据(路径 ? `${路径}/${项目.名称}` : 项目.名称, 项目.内容);
                }
            }
        }
        
        for (const 根路径 in 数据) {
            遍历数据('', 数据[根路径]);
        }
        
        return 所有图片;
    },

    显示相册内容: function(路径, 容器) {
        容器.innerHTML = '';
        
        if (!this.图片数据) {
            容器.innerHTML = '<div class="空状态"><p>暂无图片数据</p></div>';
            return;
        }
        
        const 路径数组 = 路径 ? 路径.split('/') : [];
        let 当前数据 = this.图片数据;
        
        // 导航到指定路径
        for (const 目录 of 路径数组) {
            if (当前数据[目录]) {
                当前数据 = 当前数据[目录];
            } else {
                // 查找子目录
                for (const 键 in 当前数据) {
                    if (Array.isArray(当前数据[键])) {
                        const 找到项目 = 当前数据[键].find(项目 => 项目.名称 === 目录);
                        if (找到项目) {
                            当前数据 = 找到项目.内容;
                            break;
                        }
                    }
                }
            }
        }
        
        // 更新面包屑导航
        this.更新面包屑导航(路径);
        
        // 显示内容
        if (!当前数据 || 当前数据.length === 0) {
            容器.innerHTML = '<div class="空状态"><i class="fas fa-folder-open"></i><p>此文件夹为空</p></div>';
            return;
        }
        
        // 分离目录和图片
        const 目录列表 = [];
        const 图片列表 = [];
        
        for (const 项目 of 当前数据) {
            if (项目.类型 === '目录') {
                目录列表.push(项目);
            } else if (项目.类型 === '图片') {
                图片列表.push(项目);
            }
        }
        
        // 生成目录项
        目录列表.forEach(目录 => {
            const 目录项 = this.创建目录项(目录, 路径);
            容器.appendChild(目录项);
        });
        
        // 生成图片项
        图片列表.forEach(图片 => {
            const 图片项 = this.创建图片项(图片, 路径);
            容器.appendChild(图片项);
        });
        
        // 如果没有内容
        if (目录列表.length === 0 && 图片列表.length === 0) {
            容器.innerHTML = '<div class="空状态"><i class="fas fa-folder-open"></i><p>此文件夹为空</p></div>';
        }
    },

    创建目录项: function(目录, 当前路径) {
        const 目录路径 = 当前路径 ? `${当前路径}/${目录.名称}` : 目录.名称;
        const 目录项 = document.createElement('div');
        目录项.className = `相册项 ${this.视图模式 === '列表' ? '列表视图' : ''}`;
        目录项.dataset.路径 = 目录路径;
        
        // 获取目录中的第一张图片作为缩略图
        const 缩略图路径 = this.获取目录缩略图(目录.内容);
        
        目录项.innerHTML = `
            <img class="相册缩略图" src="${缩略图路径 || '占位图.jpg'}" alt="${目录.名称}" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"200\" height=\"200\"><rect width=\"100%\" height=\"100%\" fill=\"%234a6fa5\"/><text x=\"50%\" y=\"50%\" font-family=\"Arial\" font-size=\"20\" fill=\"white\" text-anchor=\"middle\" dy=\".3em\">${目录.名称}</text></svg>'" />
            <div class="相册信息">
                <h3 class="相册标题">${目录.名称}</h3>
                <div class="相册统计">
                    <span>${this.获取目录统计信息(目录.内容)}</span>
                    <i class="fas fa-folder"></i>
                </div>
            </div>
        `;
        
        目录项.addEventListener('click', () => {
            this.当前路径 = 目录路径;
            this.显示相册内容(目录路径, document.getElementById('相册容器'));
        });
        
        return 目录项;
    },

    获取目录缩略图: function(内容) {
        for (const 项目 of 内容) {
            if (项目.类型 === '图片') {
                return 项目.完整路径;
            } else if (项目.类型 === '目录') {
                return this.获取目录缩略图(项目.内容);
            }
        }
        return null;
    },

    获取目录统计信息: function(内容) {
        let 目录数 = 0;
        let 图片数 = 0;
        
        function 计数(项目列表) {
            for (const 项目 of 项目列表) {
                if (项目.类型 === '目录') {
                    目录数++;
                    计数(项目.内容);
                } else if (项目.类型 === '图片') {
                    图片数++;
                }
            }
        }
        
        计数(内容);
        return `${目录数}个目录, ${图片数}张图片`;
    },

    创建图片项: function(图片, 当前路径) {
        const 图片项 = document.createElement('div');
        图片项.className = '图片项';
        图片项.dataset.图片路径 = 图片.完整路径;
        
        // 提取图片名称（不带扩展名）
        const 图片名称 = 图片.名称.replace(/\.[^/.]+$/, "");
        
        图片项.innerHTML = `
            <img class="图片缩略图" src="${图片.完整路径}" alt="${图片.名称}" loading="lazy" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"200\" height=\"200\"><rect width=\"100%\" height=\"100%\" fill=\"%23f0f0f0\"/><text x=\"50%\" y=\"50%\" font-family=\"Arial\" font-size=\"16\" fill=\"%23666\" text-anchor=\"middle\" dy=\".3em\">图片加载失败</text></svg>'">
            <div class="图片信息">
                <h4 class="图片标题">${图片名称}</h4>
                <p class="图片路径">${图片.完整路径}</p>
            </div>
        `;
        
        图片项.addEventListener('click', () => {
            this.打开图片查看器(图片.完整路径);
        });
        
        return 图片项;
    },

    打开图片查看器: function(图片路径) {
        const 模态框 = document.getElementById('图片模态框');
        const 放大图片 = document.getElementById('放大图片');
        const 图片标题 = document.getElementById('图片标题');
        const 图片路径显示 = document.getElementById('图片路径');
        
        // 查找图片在列表中的位置
        this.当前图片索引 = this.所有图片列表.findIndex(图片 => 图片.路径 === 图片路径);
        
        if (this.当前图片索引 !== -1) {
            const 当前图片 = this.所有图片列表[this.当前图片索引];
            放大图片.src = 当前图片.路径;
            图片标题.textContent = 当前图片.名称.replace(/\.[^/.]+$/, "");
            图片路径显示.textContent = 当前图片.路径;
            
            // 获取图片尺寸
            const 图片元素 = new Image();
            图片元素.onload = function() {
                document.getElementById('图片尺寸').textContent = 
                    `${this.naturalWidth} × ${this.naturalHeight} 像素`;
            };
            图片元素.src = 当前图片.路径;
        }
        
        模态框.style.display = 'flex';
    },

    更新面包屑导航: function(路径) {
        const 面包屑容器 = document.getElementById('面包屑导航');
        const 路径数组 = 路径 ? 路径.split('/') : [];
        
        面包屑容器.innerHTML = '<a href="#" class="导航链接" data-path="">全部相册</a>';
        
        let 当前路径 = '';
        路径数组.forEach(目录 => {
            当前路径 = 当前路径 ? `${当前路径}/${目录}` : 目录;
            const 链接 = document.createElement('a');
            链接.href = '#';
            链接.className = '导航链接';
            链接.dataset.path = 当前路径;
            链接.textContent = 目录;
            链接.addEventListener('click', (事件) => {
                事件.preventDefault();
                this.当前路径 = 当前路径;
                this.显示相册内容(当前路径, document.getElementById('相册容器'));
            });
            面包屑容器.appendChild(链接);
        });
    },

    更新图片总数: function(总数) {
        const 总数元素 = document.getElementById('图片总数');
        if (总数元素) {
            总数元素.textContent = 总数;
        }
    },

    绑定事件: function() {
        // 视图切换
        document.getElementById('网格视图').addEventListener('click', () => {
            this.切换视图('网格');
        });
        
        document.getElementById('列表视图').addEventListener('click', () => {
            this.切换视图('列表');
        });
        
        // 搜索功能
        const 搜索输入 = document.getElementById('搜索输入');
        搜索输入.addEventListener('input', (事件) => {
            this.执行搜索(事件.target.value);
        });
        
        // 模态框关闭
        document.getElementById('关闭按钮').addEventListener('click', () => {
            document.getElementById('图片模态框').style.display = 'none';
        });
        
        // 点击模态框背景关闭
        document.getElementById('图片模态框').addEventListener('click', (事件) => {
            if (事件.target.id === '图片模态框') {
                document.getElementById('图片模态框').style.display = 'none';
            }
        });
        
        // 图片导航
        document.getElementById('上一张按钮').addEventListener('click', () => {
            this.导航图片(-1);
        });
        
        document.getElementById('下一张按钮').addEventListener('click', () => {
            this.导航图片(1);
        });
        
        // 键盘导航
        document.addEventListener('keydown', (事件) => {
            if (document.getElementById('图片模态框').style.display === 'flex') {
                if (事件.key === 'Escape') {
                    document.getElementById('图片模态框').style.display = 'none';
                } else if (事件.key === 'ArrowLeft') {
                    this.导航图片(-1);
                } else if (事件.key === 'ArrowRight') {
                    this.导航图片(1);
                }
            }
        });
    },

    切换视图: function(模式) {
        this.视图模式 = 模式;
        const 容器 = document.getElementById('相册容器');
        容器.className = 模式 === '列表' ? '相册容器 列表视图' : '相册容器';
        
        // 更新按钮状态
        document.getElementById('网格视图').classList.toggle('激活', 模式 === '网格');
        document.getElementById('列表视图').classList.toggle('激活', 模式 === '列表');
        
        // 更新所有项目
        const 所有项目 = 容器.querySelectorAll('.相册项, .图片项');
        所有项目.forEach(项目 => {
            if (模式 === '列表' && 项目.classList.contains('相册项')) {
                项目.classList.add('列表视图');
            } else {
                项目.classList.remove('列表视图');
            }
        });
    },

    执行搜索: function(搜索词) {
        if (!搜索词.trim()) {
            this.显示相册内容(this.当前路径, document.getElementById('相册容器'));
            return;
        }
        
        const 容器 = document.getElementById('相册容器');
        容器.innerHTML = '';
        
        const 搜索词小写 = 搜索词.toLowerCase();
        const 搜索结果 = [];
        
        // 搜索目录
        function 搜索数据(数据, 路径) {
            for (const 项目 of 数据) {
                const 项目路径 = 路径 ? `${路径}/${项目.名称}` : 项目.名称;
                
                if (项目.名称.toLowerCase().includes(搜索词小写)) {
                    搜索结果.push({
                        ...项目,
                        显示路径: 项目路径
                    });
                }
                
                if (项目.类型 === '目录') {
                    搜索数据(项目.内容, 项目路径);
                }
            }
        }
        
        for (const 根路径 in this.图片数据) {
            搜索数据(this.图片数据[根路径], '');
        }
        
        if (搜索结果.length === 0) {
            容器.innerHTML = `
                <div class="空状态">
                    <i class="fas fa-search"></i>
                    <p>未找到匹配 "${搜索词}" 的结果</p>
                </div>
            `;
            return;
        }
        
        // 显示搜索结果
        搜索结果.forEach(结果 => {
            if (结果.类型 === '目录') {
                const 目录项 = this.创建目录项(结果, '');
                容器.appendChild(目录项);
            } else if (结果.类型 === '图片') {
                const 图片项 = this.创建图片项(结果, '');
                容器.appendChild(图片项);
            }
        });
    },

    导航图片: function(方向) {
        if (this.所有图片列表.length === 0) return;
        
        this.当前图片索引 += 方向;
        
        if (this.当前图片索引 < 0) {
            this.当前图片索引 = this.所有图片列表.length - 1;
        } else if (this.当前图片索引 >= this.所有图片列表.length) {
            this.当前图片索引 = 0;
        }
        
        this.打开图片查看器(this.所有图片列表[this.当前图片索引].路径);
    }
};

// 初始化相册生成器
document.addEventListener('DOMContentLoaded', () => {
    相册生成器.初始化();
});