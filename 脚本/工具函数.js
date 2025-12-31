// 脚本/工具函数.js
const 工具函数 = {
    // 防抖函数
    防抖: function(函数, 延迟) {
        let 定时器;
        return function(...参数) {
            clearTimeout(定时器);
            定时器 = setTimeout(() => 函数.apply(this, 参数), 延迟);
        };
    },

    // 节流函数
    节流: function(函数, 间隔) {
        let 上一次时间 = 0;
        return function(...参数) {
            const 当前时间 = Date.now();
            if (当前时间 - 上一次时间 >= 间隔) {
                函数.apply(this, 参数);
                上一次时间 = 当前时间;
            }
        };
    },

    // 格式化文件大小
    格式化文件大小: function(字节数) {
        if (字节数 === 0) return '0 B';
        const 单位 = ['B', 'KB', 'MB', 'GB'];
        const 指数 = Math.floor(Math.log(字节数) / Math.log(1024));
        return Math.round(字节数 / Math.pow(1024, 指数) * 100) / 100 + ' ' + 单位[指数];
    },

    // 获取文件扩展名
    获取文件扩展名: function(文件名) {
        return 文件名.slice((文件名.lastIndexOf('.') - 1 >>> 0) + 2);
    },

    // 获取文件名（不含扩展名）
    获取文件名: function(文件路径) {
        return 文件路径.split('/').pop().replace(/\.[^/.]+$/, '');
    },

    // 生成随机ID
    生成随机ID: function(长度 = 8) {
        return Math.random().toString(36).substring(2, 2 + 长度);
    },

    // 深拷贝对象
    深拷贝: function(对象) {
        return JSON.parse(JSON.stringify(对象));
    },

    // 检查是否是图片文件
    是图片文件: function(文件名) {
        const 图片扩展名 = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
        const 扩展名 = 文件名.slice((文件名.lastIndexOf('.') - 1 >>> 0) + 1).toLowerCase();
        return 图片扩展名.includes('.' + 扩展名);
    },

    // 获取URL参数
    获取URL参数: function(参数名) {
        const 网址参数 = new URLSearchParams(window.location.search);
        return 网址参数.get(参数名);
    },

    // 设置URL参数
    设置URL参数: function(参数名, 参数值) {
        const 网址参数 = new URLSearchParams(window.location.search);
        网址参数.set(参数名, 参数值);
        window.history.replaceState({}, '', `${window.location.pathname}?${网址参数.toString()}`);
    },

    // 加载图片并返回Promise
    加载图片: function(图片路径) {
        return new Promise((解析, 拒绝) => {
            const 图片 = new Image();
            图片.onload = () => 解析(图片);
            图片.onerror = 拒绝;
            图片.src = 图片路径;
        });
    },

    // 复制到剪贴板
    复制到剪贴板: function(文本) {
        return navigator.clipboard.writeText(文本);
    },

    // 下载文件
    下载文件: function(内容, 文件名, 类型 = 'text/plain') {
        const 数据块 = new Blob([内容], { type: 类型 });
        const 数据地址 = URL.createObjectURL(数据块);
        const 链接 = document.createElement('a');
        链接.href = 数据地址;
        链接.download = 文件名;
        document.body.appendChild(链接);
        链接.click();
        document.body.removeChild(链接);
        URL.revokeObjectURL(数据地址);
    }
};