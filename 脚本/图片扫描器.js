// 脚本/图片扫描器.js
const 文件系统 = require('fs');
const 路径工具 = require('path');

// 读取配置文件
const 配置文件路径 = './相册配置.json';
const 配置数据 = JSON.parse(文件系统.readFileSync(配置文件路径, 'utf8'));

const 扫描路径 = 配置数据.扫描路径 || ['图片'];
const 排除路径 = 配置数据.排除路径 || ['.git', '图标'];
const 允许的图片格式 = 配置数据.允许的图片格式 || ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
const 图片索引 = {};

// 检查是否是图片文件
function 是图片文件(文件名) {
  const 扩展名 = 路径工具.extname(文件名).toLowerCase();
  return 允许的图片格式.includes(扩展名);
}

// 检查路径是否应该被排除
function 是否应该排除(路径) {
  return 排除路径.some(排除项 => 路径.includes(排除项));
}

// 递归扫描目录
function 扫描目录(目录路径, 相对路径 = '') {
  const 目录内容 = [];
  
  try {
    const 文件列表 = 文件系统.readdirSync(目录路径, { withFileTypes: true });
    
    for (const 文件项 of 文件列表) {
      const 文件全路径 = 路径工具.join(目录路径, 文件项.name);
      const 文件相对路径 = 相对路径 ? 路径工具.join(相对路径, 文件项.name) : 文件项.name;
      
      // 检查是否应该排除
      if (是否应该排除(文件全路径)) {
        continue;
      }
      
      if (文件项.isDirectory()) {
        // 如果是目录，递归扫描
        const 子目录内容 = 扫描目录(文件全路径, 文件相对路径);
        if (子目录内容.length > 0) {
          目录内容.push({
            名称: 文件项.name,
            类型: '目录',
            路径: 文件相对路径,
            内容: 子目录内容
          });
        }
      } else if (文件项.isFile() && 是图片文件(文件项.name)) {
        // 如果是图片文件，添加到内容
        目录内容.push({
          名称: 文件项.name,
          类型: '图片',
          路径: 文件相对路径,
          完整路径: 文件相对路径
        });
      }
    }
  } catch (错误) {
    console.error(`扫描目录错误: ${目录路径}`, 错误);
  }
  
  return 目录内容;
}

// 主扫描函数
function 执行扫描() {
  console.log('开始扫描图片...');
  
  for (const 路径 of 扫描路径) {
    if (!文件系统.existsSync(路径)) {
      console.warn(`警告: 扫描路径 "${路径}" 不存在`);
      continue;
    }
    
    const 扫描结果 = 扫描目录(路径);
    图片索引[路径] = 扫描结果;
  }
  
  // 生成索引文件
  const 索引文件内容 = JSON.stringify({
    配置: 配置数据,
    图片索引: 图片索引,
    扫描时间: new Date().toISOString()
  }, null, 2);
  
  文件系统.writeFileSync('图片索引.json', 索引文件内容, 'utf8');
  console.log('图片索引已生成: 图片索引.json');
  console.log(`共扫描到 ${Object.keys(图片索引).length} 个目录`);
}

// 执行扫描
执行扫描();