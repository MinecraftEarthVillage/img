const 图片扫描器 = {
    加载配置: async function() {
        try {
            const 响应 = await fetch('相册配置.json');
            return await 响应.json();
        } catch (错误) {
            console.warn('无法加载配置文件，使用默认配置');
            return {
                扫描路径: ['图片'],
                排除路径: ['.git', '图标', '其它', 'node_modules'],
                允许的图片格式: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'],
                相册标题: '我的个人相册',
                每行显示数: 4,
                图片描述来源: '文件名'
            };
        }
    },

    加载图片索引: async function() {
        try {
            const 响应 = await fetch('图片索引.json');
            if (!响应.ok) {
                throw new Error(`HTTP ${响应.status}`);
            }
            const 数据 = await 响应.json();
            console.log('成功加载图片索引:', 数据);
            return 数据;
        } catch (错误) {
            console.error('无法加载图片索引文件:', 错误);
            console.log('尝试生成测试数据...');
            return this.生成测试数据();
        }
    },

    生成测试数据: function() {
        console.log('生成测试数据...');
        return {
            配置: {
                相册标题: '我的个人相册 (测试数据)',
                扫描时间: new Date().toISOString()
            },
            图片索引: {
                "图片": [
                    {
                        名称: "虎",
                        类型: "目录",
                        路径: "虎",
                        内容: [
                            {
                                名称: "1",
                                类型: "目录",
                                路径: "虎/1",
                                内容: [
                                    {
                                        名称: "1.png",
                                        类型: "图片",
                                        路径: "虎/1/1.png",
                                        完整路径: "图片/虎/1/1.png"
                                    }
                                ]
                            },
                            {
                                名称: "2",
                                类型: "目录",
                                路径: "虎/2",
                                内容: [
                                    {
                                        名称: "1.jpg",
                                        类型: "图片",
                                        路径: "虎/2/1.jpg",
                                        完整路径: "图片/虎/2/1.jpg"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        名称: "风景",
                        类型: "目录",
                        路径: "风景",
                        内容: [
                            {
                                名称: "山.jpg",
                                类型: "图片",
                                路径: "风景/山.jpg",
                                完整路径: "图片/风景/山.jpg"
                            },
                            {
                                名称: "水.png",
                                类型: "图片",
                                路径: "风景/水.png",
                                完整路径: "图片/风景/水.png"
                            }
                        ]
                    }
                ]
            },
            扫描时间: new Date().toISOString()
        };
    }
};

window.图片扫描器 = 图片扫描器;
console.log('图片扫描器已加载到全局作用域');
