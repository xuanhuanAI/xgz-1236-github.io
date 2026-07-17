# 仙境玄幻AI - AI视觉创作者网站

基于GitHub Pages部署的AI视觉创作作品展示网站，使用腾讯云COS存储图片、视频等媒体文件。

## 功能特性

- 🎬 **作品展示**：分类展示AI短片、广告、微电影、漫画、品牌视觉等作品
- ☁️ **腾讯云COS存储**：图片、视频、背景图自动上传到腾讯云对象存储
- 🔄 **数据同步**：项目元数据自动同步到COS，所有访客都能看到完整内容
- 🎨 **后台管理**：在线添加/编辑/删除项目，上传封面和视频
- 🖼️ **自定义背景**：支持上传首页主背景和关于区域背景图

## 部署指南

### 1. GitHub Pages 部署

```bash
# 克隆仓库
git clone https://github.com/xuanhuanAI/xgz-1236-github.io.git
cd xgz-1236-github.io

# 推送代码
git add .
git commit -m "完善网站"
git push origin main
```

部署完成后访问：`https://xuanhuanai.github.io/xgz-1236-github.io/`

### 2. 腾讯云COS配置（管理员用）

1. 登录 [腾讯云COS控制台](https://console.cloud.tencent.com/cos)
2. 创建存储桶（推荐：`qaz123456-1454067625`，已有默认配置）
3. 在存储桶的 **权限管理 > CORS设置** 中添加规则：
   - 来源 Origin：`https://xuanhuanai.github.io`（或 `*`）
   - 允许 Methods：`GET, PUT, HEAD, POST`
   - Allow-Headers：`*`
4. 获取 API 密钥：[访问管理 > API密钥管理](https://console.cloud.tencent.com/cam/capi)
5. 在网站后台管理面板中配置 COS（点击右上角 ⚙️ 按钮进入设置）

### 3. 后台管理使用

1. 点击页面右下角的 ⚙️ 按钮打开管理面板
2. 配置腾讯云 COS 存储桶信息
3. 添加/编辑项目，上传封面和视频
4. 点击「同步项目数据到COS」按钮，确保所有访客能看到更新

## 数据流说明

```
管理员上传图片/视频 ──▶ 腾讯云COS ──▶ 生成公网URL
         │
         └──▶ 项目元数据(localStorage) ──▶ 同步到COS(site/projects.json)
                                              │
访客访问页面 ──▶ GitHub Pages ──▶ 从COS加载 ──▶ 显示完整内容
                                  projects.json
```

## 目录结构

```
├── index.html         # 主页面
├── css/style.css      # 样式文件
├── js/
│   ├── main.js        # 主逻辑（COS上传、管理后台、渲染）
│   └── projects.js    # 默认项目数据
└── assets/
    ├── images/        # 本地图片
    └── videos/        # 本地视频
```
"# Force redeploy" 
