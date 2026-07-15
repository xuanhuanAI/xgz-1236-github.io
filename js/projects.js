// ============================================
// Projects Data - 网站项目数据
// ============================================
// 封面优先级: coverUrl > localStorage上传 > CSS渐变
// 视频优先级: videoUrl > localStorage上传 > 上传按钮
// coverUrl: assets/images/ 下图片的相对路径
// videoUrl: assets/videos/ 下视频的相对路径(或外部URL)

const projects = [
  {
    id: 1,
    title: "破晓",
    type: "short-drama",
    typeLabel: "AI短剧",
    highlight: "全AI工作流 / 72小时从剧本到成片",
    colors: ["#0f0c29", "#302b63", "#24243e"],
    coverUrl: "",
    detail: {
      subtitle: "一部完全由AI驱动的科幻短剧。",
      highlights: ["全AI工作流制作", "独创的AI镜头调度系统"],
      video: "",
      videoUrl: ""
    }
  },
  {
    id: 2,
    title: "流转",
    type: "commercial",
    typeLabel: "AI广告片",
    highlight: "高端时尚品牌 / 全AI生成视觉广告",
    colors: ["#1a0a00", "#3d1a00", "#6b3000"],
    coverUrl: "",
    detail: {
      subtitle: "为高端时尚品牌打造的全AI生成视觉广告。",
      highlights: ["品牌视觉语言与AI美学的深度融合", "动态光影系统模拟自然光的流转"],
      video: "",
      videoUrl: ""
    }
  },
  {
    id: 3,
    title: "归途",
    type: "micro-film",
    typeLabel: "AI微电影",
    highlight: "记忆与身份 / 入围多个AI电影节",
    colors: ["#0a1a0a", "#1a3d1a", "#0d260d"],
    coverUrl: "",
    detail: {
      subtitle: "一部探讨记忆与身份的情感微电影。",
      highlights: ["AI辅助剧本创作与情感节奏把控", "角色面部微表情由AI精准驱动"],
      video: "",
      videoUrl: ""
    }
  },
  {
    id: 4,
    title: "镜界",
    type: "comic",
    typeLabel: "AI漫剧",
    highlight: "科幻动态漫剧 / 制作周期缩短80%",
    colors: ["#1a0030", "#3d0066", "#2a0040"],
    coverUrl: "",
    detail: {
      subtitle: "科幻题材动态漫剧，将漫画美学与动态影像完美融合。",
      highlights: ["AI漫画风格化渲染", "动态分镜系统自动适配叙事节奏"],
      video: "",
      videoUrl: ""
    }
  },
  {
    id: 5,
    title: "城市脉络",
    type: "brand",
    typeLabel: "品牌视觉",
    highlight: "城市地标项目 / AI贯穿品牌内容全流程",
    colors: ["#0a0a1a", "#1a1a3d", "#2a2a40"],
    coverUrl: "",
    detail: {
      subtitle: "为城市地标项目打造的品牌视觉系统。",
      highlights: ["AI生成的城市美学视觉系统", "动态品牌视频覆盖全媒体渠道"],
      video: "",
      videoUrl: ""
    }
  },
  {
    id: 6,
    title: "幻光",
    type: "short-drama",
    typeLabel: "AI短剧",
    highlight: "赛博朋克 / 霓虹光影都市传说",
    colors: ["#1a0030", "#30001a", "#0a0030"],
    coverUrl: "",
    detail: {
      subtitle: "赛博朋克风格的AI短剧。",
      highlights: ["赛博朋克视觉风格AI精准还原", "动态霓虹光照系统实时渲染"],
      video: "",
      videoUrl: ""
    }
  },
  {
    id: 7,
    title: "味觉旅行",
    type: "commercial",
    typeLabel: "AI广告片",
    highlight: "美食品牌 / 用AI视觉呈现味觉体验",
    colors: ["#1a0a00", "#3d1a00", "#4d2600"],
    coverUrl: "",
    detail: {
      subtitle: "用AI视觉语言呈现味觉的奇妙体验。",
      highlights: ["AI生成的超写实食材质感", "动态粒子系统模拟味觉感受"],
      video: "",
      videoUrl: ""
    }
  },
  {
    id: 8,
    title: "新生",
    type: "micro-film",
    typeLabel: "AI微电影",
    highlight: "自然主题 / AI视角重新审视人与自然",
    colors: ["#001a0a", "#003d1a", "#002613"],
    coverUrl: "",
    detail: {
      subtitle: "一部关于自然与生命的AI微电影。",
      highlights: ["AI生成的超现实自然景观", "生物运动与自然现象的AI模拟"],
      video: "",
      videoUrl: ""
    }
  },
  {
    id: 9,
    title: "星轨",
    type: "brand",
    typeLabel: "品牌视觉",
    highlight: "AI科技品牌 / 从Logo动态化到全平台",
    colors: ["#0a001a", "#1a0040", "#2a0060"],
    coverUrl: "",
    detail: {
      subtitle: "为AI科技公司打造的品牌视觉升级方案。",
      highlights: ["AI辅助品牌视觉系统设计", "动态Logo及品牌识别系统"],
      video: "",
      videoUrl: ""
    }
  },
];
