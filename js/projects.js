// ============================================
// LULU AI STUDIO - Projects Data
// ============================================
// 网站数据：可在后台管理面板编辑
// 所有封面使用CSS渐变，无需外部图片

const projects = [
    {
        id: 1,
        title: "破晓",
        type: "short-drama",
        typeLabel: "AI短剧",
        highlight: "全AI工作流 · 72小时从剧本到成片",
        colors: ["#0f0c29", "#302b63", "#24243e"],
        detail: {
            subtitle: "一部完全由AI驱动的科幻短剧，探索人类与AI共生的未来图景。从场景设计到角色表演，从光影氛围到镜头语言，全部由AI生成与编排。",
            highlights: [
                "全AI工作流制作，从剧本到成片仅用72小时",
                "独创的AI镜头调度系统，实现电影级运镜",
                "角色表演由多模型融合驱动，情感表达自然",
                "视觉风格参考《银翼杀手》与《攻壳机动队》"
            ],
            video: ""
        }
    },
    {
        id: 2,
        title: "流转",
        type: "commercial",
        typeLabel: "AI广告片",
        highlight: "高端时尚品牌 · 全AI生成视觉广告",
        colors: ["#1a0a00", "#3d1a00", "#6b3000"],
        detail: {
            subtitle: "为高端时尚品牌打造的全AI生成视觉广告，融合数字美学与品牌调性。每一帧都是一幅独立的艺术作品。",
            highlights: [
                "品牌视觉语言与AI美学的深度融合",
                "动态光影系统模拟自然光的流转",
                "AI生成的超现实场景增强品牌记忆点",
                "全片4K输出，达到商业广告播出标准"
            ],
            video: ""
        }
    },
    {
        id: 3,
        title: "归途",
        type: "micro-film",
        typeLabel: "AI微电影",
        highlight: "记忆与身份 · 入围多个AI电影节竞赛单元",
        colors: ["#0a1a0a", "#1a3d1a", "#0d260d"],
        detail: {
            subtitle: "一部探讨记忆与身份的情感微电影。AI不仅作为创作工具，更成为叙事的一部分，讲述一个关于寻找自我的故事。",
            highlights: [
                "AI辅助剧本创作与情感节奏把控",
                "角色面部微表情由AI精准驱动",
                "环境氛围随情绪变化智能转换",
                "入围多个AI电影节官方竞赛单元"
            ],
            video: ""
        }
    },
    {
        id: 4,
        title: "镜界",
        type: "comic",
        typeLabel: "AI漫剧",
        highlight: "科幻动态漫剧 · 制作周期缩短80%",
        colors: ["#1a0030", "#3d0066", "#2a0040"],
        detail: {
            subtitle: "科幻题材动态漫剧，将漫画美学与动态影像完美融合。AI逐帧生成画面，配合动态镜头语言打造沉浸式阅读体验。",
            highlights: [
                "AI漫画风格化渲染，实现独特视觉语言",
                "动态分镜系统自动适配叙事节奏",
                "配音与音效AI智能匹配画面情绪",
                "单集制作周期较传统漫剧缩短80%"
            ],
            video: ""
        }
    },
    {
        id: 5,
        title: "城市脉络",
        type: "brand",
        typeLabel: "品牌视觉",
        highlight: "城市地标项目 · AI贯穿品牌内容全流程",
        colors: ["#0a0a1a", "#1a1a3d", "#2a2a40"],
        detail: {
            subtitle: "为城市地标项目打造的品牌视觉系统。从静态视觉到动态影像，AI贯穿整个品牌内容创作流程。",
            highlights: [
                "AI生成的城市美学视觉系统",
                "动态品牌视频覆盖全媒体渠道",
                "智能配色系统适配不同应用场景",
                "视觉语言统一且具有高辨识度"
            ],
            video: ""
        }
    },
    {
        id: 6,
        title: "幻光",
        type: "short-drama",
        typeLabel: "AI短剧",
        highlight: "赛博朋克 · 霓虹光影都市传说",
        colors: ["#1a0030", "#30001a", "#0a0030"],
        detail: {
            subtitle: "赛博朋克风格的AI短剧，在霓虹与数据流中展开一段都市传奇。全片AI生成，视觉风格极具冲击力。",
            highlights: [
                "赛博朋克视觉风格AI精准还原",
                "动态霓虹光照系统实时渲染",
                "AI生成的城市夜景充满细节",
                "叙事节奏紧凑，适合短视频平台传播"
            ],
            video: ""
        }
    },
    {
        id: 7,
        title: "味觉旅行",
        type: "commercial",
        typeLabel: "AI广告片",
        highlight: "美食品牌 · 用AI视觉呈现味觉体验",
        colors: ["#1a0a00", "#3d1a00", "#4d2600"],
        detail: {
            subtitle: "用AI视觉语言呈现味觉的奇妙体验。从食材质感、烹饪过程到成品呈现，每一帧都充满食欲美学。",
            highlights: [
                "AI生成的超写实食材质感",
                "动态粒子系统模拟味觉感受",
                "色彩心理学融入视觉设计",
                "社交媒体适配多版本输出"
            ],
            video: ""
        }
    },
    {
        id: 8,
        title: "新生",
        type: "micro-film",
        typeLabel: "AI微电影",
        highlight: "自然主题 · AI视角重新审视人与自然的联结",
        colors: ["#001a0a", "#003d1a", "#002613"],
        detail: {
            subtitle: "一部关于自然与生命的AI微电影。用AI的视角重新审视人类与自然的关系，呈现出生机勃勃的视觉诗篇。",
            highlights: [
                "AI生成的超现实自然景观",
                "生物运动与自然现象的AI模拟",
                "色彩随季节变化情感递进",
                "环保主题引发深度共鸣"
            ],
            video: ""
        }
    },
    {
        id: 9,
        title: "星轨",
        type: "brand",
        typeLabel: "品牌视觉",
        highlight: "AI科技品牌 · 从Logo动态化到全平台视觉系统",
        colors: ["#0a001a", "#1a0040", "#2a0060"],
        detail: {
            subtitle: "为AI科技公司打造的品牌视觉升级方案。从品牌标志动态化到全平台视觉系统，AI辅助设计贯穿全程。",
            highlights: [
                "AI辅助品牌视觉系统设计",
                "动态Logo及品牌识别系统",
                "跨平台视觉一致性管理",
                "品牌视频覆盖宣传全场景"
            ],
            video: ""
        }
    }
];
