@echo off
echo 正在准备本地测试环境...
echo.

echo 1. 检查Node.js环境...
node --version
if errorlevel 1 (
    echo 错误: 未找到Node.js，请先安装Node.js
    echo 访问 https://nodejs.org/ 下载并安装
    pause
    exit /b 1
)
echo Node.js 检测通过
echo.

echo 2. 运行图片扫描器生成索引...
node 脚本\图片扫描器.js
echo.

echo 3. 启动本地服务器...
echo 服务器将在 http://localhost:8080 启动
echo 按 Ctrl+C 停止服务器
echo.

npx http-server -p 8080 -c-1