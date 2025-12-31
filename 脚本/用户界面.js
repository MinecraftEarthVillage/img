// 脚本/用户界面.js
const 用户界面 = {
    初始化: function() {
        this.初始化主题切换();
        this.初始化加载动画();
        this.初始化响应式设计();
        this.绑定全局事件();
    },

    初始化主题切换: function() {
        // 检查本地存储的主题设置
        const 当前主题 = localStorage.getItem('主题') || '浅色';
        this.切换主题(当前主题);
        
        // 创建主题切换按钮（如果有需要可以添加到界面）
        this.创建主题切换按钮();
    },

    切换主题: function(主题) {
        const 根元素 = document.documentElement;
        
        if (主题 === '深色') {
            根元素.style.setProperty('--背景色', '#1a1a2e');
            根元素.style.setProperty('--卡片背景', '#16213e');
            根元素.style.setProperty('--文字色', '#e6e6e6');
            根元素.style.setProperty('--边框色', '#2d4059');
            根元素.style.setProperty('--主色', '#0f4c75');
        } else {
            根元素.style.setProperty('--背景色', '#f8f9fa');
            根元素.style.setProperty('--卡片背景', '#ffffff');
            根元素.style.setProperty('--文字色', '#333333');
            根元素.style.setProperty('--边框色', '#e0e0e0');
            根元素.style.setProperty('--主色', '#4a6fa5');
        }
        
        localStorage.setItem('主题', 主题);
    },

    创建主题切换按钮: function() {
        const 主题按钮 = document.createElement('button');
        主题按钮.id = '主题切换按钮';
        主题按钮.className = '视图按钮';
        主题按钮.innerHTML = '<i class="fas fa-moon"></i>';
        主题按钮.title = '切换主题';
        
        主题按钮.addEventListener('click', () => {
            const 当前主题 = localStorage.getItem('主题') || '浅色';
            const 新主题 = 当前主题 === '浅色' ? '深色' : '浅色';
            this.切换主题(新主题);
            主题按钮.innerHTML = 新主题 === '浅色' ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
        });
        
        // 添加到控制面板
        const 控制面板 = document.querySelector('.控制面板');
        if (控制面板) {
            const 视图切换 = document.querySelector('.视图切换');
            if (视图切换) {
                视图切换.appendChild(主题按钮);
            }
        }
    },

    初始化加载动画: function() {
        // 可以添加自定义加载动画
        const 样式 = document.createElement('style');
        样式.textContent = `
            @keyframes 浮动 {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-10px); }
            }
            
            .浮动动画 {
                animation: 浮动 3s ease-in-out infinite;
            }
        `;
        document.head.appendChild(样式);
    },

    初始化响应式设计: function() {
        // 监听窗口大小变化
        window.addEventListener('resize', 工具函数.节流(() => {
            this.调整布局();
        }, 250));
        
        this.调整布局();
    },

    调整布局: function() {
        const 窗口宽度 = window.innerWidth;
        const 相册容器 = document.getElementById('相册容器');
        
        if (!相册容器) return;
        
        if (窗口宽度 < 600) {
            // 小屏幕设备
            相册容器.style.gridTemplateColumns = 'repeat(auto-fill, minmax(150px, 1fr))';
        } else if (窗口宽度 < 900) {
            // 中等屏幕设备
            相册容器.style.gridTemplateColumns = 'repeat(auto-fill, minmax(180px, 1fr))';
        } else {
            // 大屏幕设备
            相册容器.style.gridTemplateColumns = 'repeat(auto-fill, minmax(240px, 1fr))';
        }
    },

    绑定全局事件: function() {
        // ESC键关闭模态框
        document.addEventListener('keydown', (事件) => {
            if (事件.key === 'Escape') {
                const 模态框 = document.getElementById('图片模态框');
                if (模态框 && 模态框.style.display === 'flex') {
                    模态框.style.display = 'none';
                }
            }
        });
        
        // 点击外部关闭模态框
        document.addEventListener('click', (事件) => {
            const 模态框 = document.getElementById('图片模态框');
            if (模态框 && 模态框.style.display === 'flex' && 事件.target === 模态框) {
                模态框.style.display = 'none';
            }
        });
    },

    显示通知: function(消息, 类型 = '信息') {
        // 移除已有的通知
        const 现有通知 = document.querySelector('.通知');
        if (现有通知) {
            现有通知.remove();
        }
        
        // 创建新通知
        const 通知 = document.createElement('div');
        通知.className = `通知 通知-${类型}`;
        通知.innerHTML = `
            <div class="通知内容">
                <i class="fas ${类型 === '成功' ? 'fa-check-circle' : 类型 === '错误' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
                <span>${消息}</span>
            </div>
            <button class="通知关闭"><i class="fas fa-times"></i></button>
        `;
        
        // 添加样式
        const 样式 = document.createElement('style');
        样式.textContent = `
            .通知 {
                position: fixed;
                top: 20px;
                right: 20px;
                background: white;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                padding: 15px 20px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                min-width: 300px;
                max-width: 400px;
                z-index: 10000;
                animation: 滑入 0.3s ease-out;
                border-left: 4px solid #4a6fa5;
            }
            
            .通知-成功 { border-left-color: #28a745; }
            .通知-错误 { border-left-color: #dc3545; }
            .通知-警告 { border-left-color: #ffc107; }
            
            .通知内容 {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .通知内容 i {
                font-size: 1.2rem;
            }
            
            .通知-成功 .通知内容 i { color: #28a745; }
            .通知-错误 .通知内容 i { color: #dc3545; }
            .通知-警告 .通知内容 i { color: #ffc107; }
            
            .通知关闭 {
                background: none;
                border: none;
                cursor: pointer;
                color: #666;
                font-size: 1rem;
                margin-left: 15px;
            }
            
            @keyframes 滑入 {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        
        document.head.appendChild(样式);
        document.body.appendChild(通知);
        
        // 添加关闭事件
        通知.querySelector('.通知关闭').addEventListener('click', () => {
            通知.remove();
        });
        
        // 自动关闭
        setTimeout(() => {
            if (通知.parentNode) {
                通知.style.animation = '滑出 0.3s ease-out forwards';
                setTimeout(() => 通知.remove(), 300);
            }
        }, 3000);
        
        // 添加滑出动画
        const 滑出样式 = document.createElement('style');
        滑出样式.textContent = `
            @keyframes 滑出 {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(滑出样式);
    },

    显示确认框: function(消息, 确认回调) {
        // 创建确认框
        const 确认框 = document.createElement('div');
        确认框.className = '模态框 确认框';
        确认框.innerHTML = `
            <div class="模态框内容 确认框内容">
                <div class="模态框主体">
                    <p>${消息}</p>
                </div>
                <div class="模态框底部 确认框底部">
                    <button class="确认按钮 取消按钮">取消</button>
                    <button class="确认按钮 确定按钮">确定</button>
                </div>
            </div>
        `;
        
        // 添加样式
        const 样式 = document.createElement('style');
        样式.textContent = `
            .确认框内容 {
                max-width: 400px;
            }
            
            .确认框底部 {
                display: flex;
                justify-content: flex-end;
                gap: 10px;
            }
            
            .确认按钮 {
                padding: 8px 20px;
                border-radius: 6px;
                border: none;
                cursor: pointer;
                font-weight: 500;
            }
            
            .取消按钮 {
                background: #f0f0f0;
                color: #333;
            }
            
            .确定按钮 {
                background: #4a6fa5;
                color: white;
            }
        `;
        
        document.head.appendChild(样式);
        document.body.appendChild(确认框);
        
        // 显示确认框
        确认框.style.display = 'flex';
        
        // 绑定事件
        const 取消按钮 = 确认框.querySelector('.取消按钮');
        const 确定按钮 = 确认框.querySelector('.确定按钮');
        
        取消按钮.addEventListener('click', () => {
            确认框.remove();
        });
        
        确定按钮.addEventListener('click', () => {
            if (确认回调 && typeof 确认回调 === 'function') {
                确认回调();
            }
            确认框.remove();
        });
        
        // 点击背景关闭
        确认框.addEventListener('click', (事件) => {
            if (事件.target === 确认框) {
                确认框.remove();
            }
        });
    }
};

// 初始化用户界面
document.addEventListener('DOMContentLoaded', () => {
    用户界面.初始化();
});