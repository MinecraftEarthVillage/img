(function () {
    'use strict';

    if (typeof window.相册生成器 === 'undefined') {
        window.相册生成器 = {};
    }

    const 相册生成器 = window.相册生成器;

    Object.assign(相册生成器, {
        当前路径: '',
        图片数据: null,
        所有图片列表: [],
        当前图片索引: 0,
        视图模式: '网格',
        面包屑历史: [],

        初始化: async function () {
            console.log('开始初始化相册生成器...');
            try {
                await this.加载图片数据();
                this.绑定事件();
                this.初始化面包屑导航();
            } catch (错误) {
                console.error('初始化失败:', 错误);
                this.显示错误信息('初始化失败: ' + 错误.message);
            }
        },

        加载图片数据: async function () {
            const 加载指示器 = document.getElementById('加载指示器');
            const 相册容器 = document.getElementById('相册容器');

            try {
                if (!window.图片扫描器) {
                    throw new Error('图片扫描器未加载');
                }

                const 数据 = await window.图片扫描器.加载图片索引();

                if (!数据 || !数据.图片索引) {
                    throw new Error('图片索引数据格式错误');
                }

                this.图片数据 = this.标准化数据结构(数据.图片索引);
                console.log('标准化后的图片数据:', this.图片数据);

                this.所有图片列表 = this.获取所有图片列表(this.图片数据);
                this.更新图片总数(this.所有图片列表.length);

                if (数据.配置 && 数据.配置.相册标题) {
                    document.getElementById('相册标题').textContent = 数据.配置.相册标题;
                }

                加载指示器.style.display = 'none';
                this.显示相册内容('');
            } catch (错误) {
                console.error('加载图片数据失败:', 错误);
                this.显示错误信息(错误.message);
            }
        },

        标准化数据结构: function (图片数据) {
            const 标准化数据 = {};

            for (const 根路径 in 图片数据) {
                if (Array.isArray(图片数据[根路径])) {
                    标准化数据[根路径] = 图片数据[根路径];
                } else if (图片数据[根路径] && typeof 图片数据[根路径] === 'object') {
                    if (图片数据[根路径].名称) {
                        标准化数据[根路径] = [图片数据[根路径]];
                    } else {
                        console.warn('无法识别的数据结构:', 根路径, 图片数据[根路径]);
                    }
                }
            }

            return 标准化数据;
        },

        获取所有图片列表: function (数据) {
            const 所有图片 = [];

            const 遍历数据 = (内容, 当前路径 = '') => {
                if (!Array.isArray(内容)) {
                    console.warn('内容不是数组:', 内容);
                    return;
                }

                for (const 项目 of 内容) {
                    if (!项目) continue;

                    if (项目.类型 === '图片') {
                        所有图片.push({
                            路径: 项目.完整路径 || 项目.路径,
                            名称: 项目.名称,
                            目录: 当前路径
                        });
                    } else if (项目.类型 === '目录' && 项目.内容 && Array.isArray(项目.内容)) {
                        const 新路径 = 当前路径 ? `${当前路径}/${项目.名称}` : 项目.名称;
                        遍历数据(项目.内容, 新路径);
                    }
                }
            };

            for (const 根路径 in 数据) {
                if (Array.isArray(数据[根路径])) {
                    遍历数据(数据[根路径], 根路径);
                }
            }

            console.log('找到图片数量:', 所有图片.length);
            return 所有图片;
        },

        获取当前路径数据: function (路径) {
            if (!路径) {
                const 所有内容 = [];
                for (const 根路径 in this.图片数据) {
                    if (Array.isArray(this.图片数据[根路径])) {
                        const 过滤后内容 = this.图片数据[根路径].filter(项目 =>
                            项目 && 项目.名称 && !项目.名称.startsWith('.')
                        );
                        所有内容.push(...过滤后内容);
                    }
                }
                return 所有内容;
            }

            const 路径数组 = 路径.split('/').filter(段 => 段.trim() !== '');
            console.log('解析路径数组:', 路径数组);

            // 使用一个新变量来跟踪当前查找的目录内容
            let 查找数据 = null;
            let 根目录名 = null;

            // 首先找出根目录
            for (const 根路径 in this.图片数据) {
                if (Array.isArray(this.图片数据[根路径])) {
                    查找数据 = this.图片数据[根路径];
                    根目录名 = 根路径;
                    break;
                }
            }

            if (!查找数据) {
                console.warn('找不到根目录数据');
                return [];
            }

            // 逐级查找目标目录
            for (let i = 0; i < 路径数组.length; i++) {
                const 目录 = 路径数组[i];
                let 找到目录 = false;

                console.log(`在第${i + 1}级查找目录: ${目录}, 当前查找数据长度: ${查找数据.length}`);

                for (const 项目 of 查找数据) {
                    if (项目.名称 === 目录 && 项目.类型 === '目录') {
                        查找数据 = 项目.内容 || [];
                        找到目录 = true;
                        console.log(`找到目录: ${目录}, 新数据长度: ${查找数据.length}`);
                        break;
                    }
                }

                if (!找到目录) {
                    console.warn('未找到目录:', 目录, '完整路径:', 路径);
                    return [];
                }
            }

            return 查找数据;
        },

        显示相册内容: function (路径) {
            const 容器 = document.getElementById('相册容器');
            if (!容器) return;

            容器.innerHTML = '';

            if (!this.图片数据) {
                容器.innerHTML = '<div class="空状态"><p>暂无图片数据</p></div>';
                return;
            }

            this.当前路径 = 路径;
            this.更新面包屑导航(路径);

            const 当前数据 = this.获取当前路径数据(路径);

            if (!当前数据 || 当前数据.length === 0) {
                容器.innerHTML = '<div class="空状态"><i class="fas fa-folder-open"></i><p>此文件夹为空</p></div>';
                return;
            }

            const 目录列表 = [];
            const 图片列表 = [];

            for (const 项目 of 当前数据) {
                if (!项目) continue;

                if (项目.类型 === '目录') {
                    目录列表.push(项目);
                } else if (项目.类型 === '图片') {
                    图片列表.push(项目);
                }
            }

            console.log(`路径 "${路径}" 中有 ${目录列表.length} 个目录, ${图片列表.length} 张图片`);

            目录列表.forEach(目录 => {
                const 目录项 = this.创建目录项(目录, 路径);
                if (目录项) {
                    容器.appendChild(目录项);
                }
            });

            图片列表.forEach(图片 => {
                const 图片项 = this.创建图片项(图片);
                if (图片项) {
                    容器.appendChild(图片项);
                }
            });

            if (容器.children.length === 0) {
                容器.innerHTML = '<div class="空状态"><i class="fas fa-folder-open"></i><p>此文件夹为空</p></div>';
            }
        },

        创建目录项: function (目录, 当前路径) {
            const 目录路径 = 当前路径 ? `${当前路径}/${目录.名称}` : 目录.名称;
            const 目录项 = document.createElement('div');
            目录项.className = `相册项 ${this.视图模式 === '列表' ? '列表视图' : ''}`;
            目录项.dataset.路径 = 目录路径;

            const 封面图片列表 = this.获取目录封面图片(目录.内容 || []);

            let 封面HTML = '';
            if (封面图片列表.length > 0) {
                封面HTML = 封面图片列表.map(图片路径 =>
                    `<img src="${图片路径}" alt="${目录.名称}" onerror="this.style.display='none'">`
                ).slice(0, 3).join('');

                if (封面图片列表.length > 3) {
                    封面HTML += `<div class="更多图片">+${封面图片列表.length - 3}</div>`;
                }
            } else {
                封面HTML = '<div class="文件夹图标"><i class="fas fa-folder"></i></div>';
            }

            目录项.innerHTML = `
                <div class="相册封面">
                    ${封面HTML}
                </div>
                <div class="相册信息">
                    <h3 class="相册标题">${目录.名称}</h3>
                    <div class="相册统计">
                        <span>${this.获取目录统计信息(目录.内容 || [])}</span>
                        <i class="fas fa-folder"></i>
                    </div>
                </div>
            `;

            目录项.addEventListener('click', (事件) => {
                事件.preventDefault();
                事件.stopPropagation();
                this.面包屑历史.push(this.当前路径);
                this.显示相册内容(目录路径);
            });

            return 目录项;
        },

        获取目录封面图片: function (内容, 最大数量 = 4) {
            const 图片列表 = [];

            const 提取图片 = (项目列表, 深度 = 0) => {
                if (深度 > 2) return;
                if (!Array.isArray(项目列表)) return;
                if (图片列表.length >= 最大数量) return;

                for (const 项目 of 项目列表) {
                    if (图片列表.length >= 最大数量) return;

                    if (项目.类型 === '图片') {
                        图片列表.push(项目.完整路径 || 项目.路径);
                    } else if (项目.类型 === '目录' && 项目.内容) {
                        提取图片(项目.内容, 深度 + 1);
                    }
                }
            };

            if (内容 && Array.isArray(内容)) {
                提取图片(内容);
            }

            return 图片列表;
        },

        获取目录统计信息: function (内容) {
            let 目录数 = 0;
            let 图片数 = 0;

            const 计数 = (项目列表) => {
                if (!Array.isArray(项目列表)) return;

                for (const 项目 of 项目列表) {
                    if (项目.类型 === '目录') {
                        目录数++;
                        if (项目.内容) {
                            计数(项目.内容);
                        }
                    } else if (项目.类型 === '图片') {
                        图片数++;
                    }
                }
            };

            if (内容 && Array.isArray(内容)) {
                计数(内容);
            }

            return `${目录数}个目录, ${图片数}张图片`;
        },

        创建图片项: function (图片) {
            const 图片项 = document.createElement('div');
            图片项.className = '图片项';
            图片项.dataset.图片路径 = 图片.完整路径 || 图片.路径;

            const 图片名称 = 图片.名称.replace(/\.[^/.]+$/, "");
            const 图片路径 = 图片.完整路径 || 图片.路径;

            图片项.innerHTML = `
                <img class="图片缩略图" src="${图片路径}" alt="${图片名称}" loading="lazy" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"200\" height=\"200\"><rect width=\"100%\" height=\"100%\" fill=\"%23f0f0f0\"/><text x=\"50%\" y=\"50%\" font-family=\"Arial\" font-size=\"16\" fill=\"%23666\" text-anchor=\"middle\" dy=\".3em\"></text></svg>
                <div class="图片信息">
                    <h4 class="图片标题">${图片名称}</h4>
                    <p class="图片路径">${图片路径}</p>
                </div>
            `;

            图片项.addEventListener('click', () => {
                this.打开图片查看器(图片路径);
            });

            return 图片项;
        },

        更新面包屑导航: function (路径) {
            const 面包屑容器 = document.getElementById('面包屑导航');
            if (!面包屑容器) return;

            const 路径数组 = 路径 ? 路径.split('/').filter(段 => 段.trim() !== '') : [];

            面包屑容器.innerHTML = '';

            const 根链接 = document.createElement('a');
            根链接.href = '#';
            根链接.className = '导航链接';
            根链接.dataset.path = '';
            根链接.innerHTML = '<i class="fas fa-home"></i> 全部相册';
            根链接.addEventListener('click', (事件) => {
                事件.preventDefault();
                this.面包屑历史 = [];
                this.显示相册内容('');
            });
            面包屑容器.appendChild(根链接);

            let 当前路径 = '';
            路径数组.forEach((目录, 索引) => {
                当前路径 = 当前路径 ? `${当前路径}/${目录}` : 目录;

                const 分隔符 = document.createElement('span');
                分隔符.className = '面包屑分隔符';
                分隔符.textContent = ' / ';
                面包屑容器.appendChild(分隔符);

                const 链接 = document.createElement('a');
                链接.href = '#';
                链接.className = '导航链接';
                链接.dataset.path = 当前路径;
                链接.textContent = 目录;

                if (索引 < 路径数组.length - 1) {
                    链接.addEventListener('click', (事件) => {
                        事件.preventDefault();
                        this.显示相册内容(当前路径);
                    });
                } else {
                    链接.classList.add('当前路径');
                }

                面包屑容器.appendChild(链接);
            });

            if (路径数组.length > 0) {
                const 返回按钮 = document.createElement('button');
                返回按钮.className = '返回按钮';
                返回按钮.innerHTML = '<i class="fas fa-arrow-left"></i> 返回';
                返回按钮.addEventListener('click', () => {
                    this.返回上一级();
                });
                面包屑容器.appendChild(返回按钮);
            }
        },

        初始化面包屑导航: function () {
            const 面包屑容器 = document.getElementById('面包屑导航');
            if (面包屑容器) {
                面包屑容器.innerHTML = '<a href="#" class="导航链接" data-path=""><i class="fas fa-home"></i> 全部相册</a>';

                const 根链接 = 面包屑容器.querySelector('.导航链接');
                if (根链接) {
                    根链接.addEventListener('click', (事件) => {
                        事件.preventDefault();
                        this.面包屑历史 = [];
                        this.显示相册内容('');
                    });
                }
            }
        },

        返回上一级: function () {
            if (this.面包屑历史.length > 0) {
                const 上一级路径 = this.面包屑历史.pop();
                this.显示相册内容(上一级路径);
            } else if (this.当前路径) {
                const 路径数组 = this.当前路径.split('/');
                路径数组.pop();
                const 新路径 = 路径数组.join('/');
                this.显示相册内容(新路径);
            }
        },

        打开图片查看器: function (图片路径) {
            const 模态框 = document.getElementById('图片模态框');
            const 放大图片 = document.getElementById('放大图片');
            const 图片标题 = document.getElementById('图片标题');
            const 图片路径显示 = document.getElementById('图片路径');

            if (!模态框 || !放大图片 || !图片标题 || !图片路径显示) return;

            this.当前图片索引 = this.所有图片列表.findIndex(图片 => 图片.路径 === 图片路径);

            if (this.当前图片索引 !== -1) {
                const 当前图片 = this.所有图片列表[this.当前图片索引];
                放大图片.src = 当前图片.路径;
                图片标题.textContent = 当前图片.名称.replace(/\.[^/.]+$/, "");
                图片路径显示.textContent = 当前图片.路径;

                const 图片元素 = new Image();
                图片元素.onload = function () {
                    const 尺寸元素 = document.getElementById('图片尺寸');
                    if (尺寸元素) {
                        尺寸元素.textContent = `${this.naturalWidth} × ${this.naturalHeight} 像素`;
                    }
                };
                图片元素.onerror = function () {
                    const 尺寸元素 = document.getElementById('图片尺寸');
                    if (尺寸元素) {
                        尺寸元素.textContent = '无法获取图片尺寸';
                    }
                };
                图片元素.src = 当前图片.路径;
            } else {
                放大图片.src = 图片路径;
                图片标题.textContent = 图片路径.split('/').pop().replace(/\.[^/.]+$/, '');
                图片路径显示.textContent = 图片路径;
            }

            模态框.style.display = 'flex';
        },

        更新图片总数: function (总数) {
            const 总数元素 = document.getElementById('图片总数');
            if (总数元素) {
                总数元素.textContent = 总数;
            }
        },

绑定事件: function() {
    const 网格视图按钮 = document.getElementById('网格视图');
    const 列表视图按钮 = document.getElementById('列表视图');
    const 搜索输入 = document.getElementById('搜索输入');
    const 关闭按钮 = document.getElementById('关闭按钮');
    const 图片模态框 = document.getElementById('图片模态框');
    const 上一张按钮 = document.getElementById('上一张按钮');
    const 下一张按钮 = document.getElementById('下一张按钮');
    
    // 添加面包屑导航容器的事件委托
    const 面包屑容器 = document.getElementById('面包屑导航');
    if (面包屑容器) {
        面包屑容器.addEventListener('click', (事件) => {
            // 检查点击的是否是导航链接
            const 链接 = 事件.target.closest('.导航链接');
            if (链接) {
                事件.preventDefault();
                事件.stopPropagation();
                
                // 获取路径并导航
                const 路径 = 链接.dataset.path;
                if (路径 !== undefined) {
                    this.显示相册内容(路径);
                }
            }
        });
    }
    
    if (网格视图按钮) {
        网格视图按钮.addEventListener('click', () => {
            this.切换视图('网格');
        });
    }
    
    if (列表视图按钮) {
        列表视图按钮.addEventListener('click', () => {
            this.切换视图('列表');
        });
    }
    
    if (搜索输入) {
        搜索输入.addEventListener('input', (事件) => {
            this.执行搜索(事件.target.value);
        });
    }
    
    if (关闭按钮) {
        关闭按钮.addEventListener('click', () => {
            document.getElementById('图片模态框').style.display = 'none';
        });
    }
    
    if (图片模态框) {
        图片模态框.addEventListener('click', (事件) => {
            if (事件.target.id === '图片模态框') {
                图片模态框.style.display = 'none';
            }
        });
    }
    
    if (上一张按钮) {
        上一张按钮.addEventListener('click', () => {
            this.导航图片(-1);
        });
    }
    
    if (下一张按钮) {
        下一张按钮.addEventListener('click', () => {
            this.导航图片(1);
        });
    }
    
    document.addEventListener('keydown', (事件) => {
        if (图片模态框 && 图片模态框.style.display === 'flex') {
            if (事件.key === 'Escape') {
                图片模态框.style.display = 'none';
            } else if (事件.key === 'ArrowLeft') {
                this.导航图片(-1);
            } else if (事件.key === 'ArrowRight') {
                this.导航图片(1);
            }
        }
    });
},

        切换视图: function (模式) {
            this.视图模式 = 模式;
            const 容器 = document.getElementById('相册容器');
            if (!容器) return;

            容器.className = 模式 === '列表' ? '相册容器 列表视图' : '相册容器';

            const 网格视图按钮 = document.getElementById('网格视图');
            const 列表视图按钮 = document.getElementById('列表视图');

            if (网格视图按钮) 网格视图按钮.classList.toggle('激活', 模式 === '网格');
            if (列表视图按钮) 列表视图按钮.classList.toggle('激活', 模式 === '列表');

            const 所有项目 = 容器.querySelectorAll('.相册项');
            所有项目.forEach(项目 => {
                项目.classList.toggle('列表视图', 模式 === '列表');
            });
        },

        执行搜索: function (搜索词) {
            const 容器 = document.getElementById('相册容器');
            if (!容器 || !搜索词.trim()) {
                this.显示相册内容(this.当前路径);
                return;
            }

            const 搜索词小写 = 搜索词.toLowerCase();
            const 搜索结果 = [];

            const 搜索数据 = (数据, 路径 = '') => {
                if (!Array.isArray(数据)) return;

                for (const 项目 of 数据) {
                    if (!项目) continue;

                    const 项目路径 = 路径 ? `${路径}/${项目.名称}` : 项目.名称;

                    if (项目.名称.toLowerCase().includes(搜索词小写)) {
                        搜索结果.push({
                            ...项目,
                            显示路径: 项目路径
                        });
                    }

                    if (项目.类型 === '目录' && 项目.内容) {
                        搜索数据(项目.内容, 项目路径);
                    }
                }
            };

            for (const 根路径 in this.图片数据) {
                if (Array.isArray(this.图片数据[根路径])) {
                    搜索数据(this.图片数据[根路径], 根路径);
                }
            }

            容器.innerHTML = '';

            if (搜索结果.length === 0) {
                容器.innerHTML = `
                    <div class="空状态">
                        <i class="fas fa-search"></i>
                        <p>未找到匹配 "${搜索词}" 的结果</p>
                    </div>
                `;
                return;
            }

            搜索结果.forEach(结果 => {
                if (结果.类型 === '目录') {
                    const 目录项 = this.创建目录项(结果, '');
                    if (目录项) 容器.appendChild(目录项);
                } else if (结果.类型 === '图片') {
                    const 图片项 = this.创建图片项(结果);
                    if (图片项) 容器.appendChild(图片项);
                }
            });
        },

        导航图片: function (方向) {
            if (!this.所有图片列表.length) return;

            this.当前图片索引 += 方向;

            if (this.当前图片索引 < 0) {
                this.当前图片索引 = this.所有图片列表.length - 1;
            } else if (this.当前图片索引 >= this.所有图片列表.length) {
                this.当前图片索引 = 0;
            }

            this.打开图片查看器(this.所有图片列表[this.当前图片索引].路径);
        },

        显示错误信息: function (消息) {
            const 加载指示器 = document.getElementById('加载指示器');
            if (加载指示器) {
                加载指示器.innerHTML = `
                    <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #dc3545; margin-bottom: 20px;"></i>
                    <p style="color: #dc3545; font-weight: bold;">加载失败</p>
                    <p>${消息}</p>
                    <button onclick="location.reload()" style="margin-top: 20px; padding: 10px 20px; background: #dc3545; color: white; border: none; border-radius: 5px; cursor: pointer;">
                        重新加载
                    </button>
                `;
            }
        },

        重新扫描: function () {
            console.log('使用测试数据重新加载...');
            this.图片数据 = {
                "图片": [
                    {
                        名称: "示例相册",
                        类型: "目录",
                        路径: "示例相册",
                        内容: [
                            {
                                名称: "示例图片1.jpg",
                                类型: "图片",
                                路径: "示例相册/示例图片1.jpg",
                                完整路径: "图片/示例相册/示例图片1.jpg"
                            },
                            {
                                名称: "示例图片2.png",
                                类型: "图片",
                                路径: "示例相册/示例图片2.png",
                                完整路径: "图片/示例相册/示例图片2.png"
                            },
                            {
                                名称: "子相册",
                                类型: "目录",
                                路径: "示例相册/子相册",
                                内容: [
                                    {
                                        名称: "子相册图片1.jpg",
                                        类型: "图片",
                                        路径: "示例相册/子相册/子相册图片1.jpg",
                                        完整路径: "图片/示例相册/子相册/子相册图片1.jpg"
                                    },
                                    {
                                        名称: "子相册图片2.png",
                                        类型: "图片",
                                        路径: "示例相册/子相册/子相册图片2.png",
                                        完整路径: "图片/示例相册/子相册/子相册图片2.png"
                                    }
                                ]
                            }
                        ]
                    }
                ]
            };

            this.所有图片列表 = this.获取所有图片列表(this.图片数据);
            this.更新图片总数(this.所有图片列表.length);

            const 加载指示器 = document.getElementById('加载指示器');
            if (加载指示器) {
                加载指示器.style.display = 'none';
            }

            this.显示相册内容('');
        }
    });

    document.addEventListener('DOMContentLoaded', function () {
        console.log('DOM已加载，开始初始化相册生成器');
        if (相册生成器 && typeof 相册生成器.初始化 === 'function') {
            相册生成器.初始化().catch(错误 => {
                console.error('相册生成器初始化失败:', 错误);
            });
        }
    });

})();
