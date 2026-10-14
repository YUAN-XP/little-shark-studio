import { projectStories } from './projectStories.js';

const asset = (name) => `${import.meta.env.BASE_URL}media/${name}`;
export const profile = {
  name: "袁潇鹏",
  englishName: "Xiaopeng Yuan",
  email: "18122979842@163.com",
  university: "湖北工业大学",
  major: "软件工程",
  studyPeriod: "2023 — 2027",
  portrait: asset("portrait-cutout-v1.webp"),
  horizontalLogo: asset("logos/shark-horizontal-v1.png"),
  logo: asset("logos/shark-circle-v1.png"),
  holographicPattern: asset("patterns/shark-line-pattern-v1.svg"),
  heroPoster: asset("hero-beach-poster-v3-occlusion-v1.webp"),
  heroVideo: asset("hero-beach-v3-occlusion-v1.mp4"),
  palmLayer: asset("palm-layer.png"),
  star: asset("doodle-star.webp"),
  explorer: asset("doodle-explorer.webp"),
  spiral: asset("doodle-spiral.webp"),
};
export const personalIntro = {
  text: "湖北工业大学软件工程大四学生，关注 AI、软件开发与创意表达。我的学习与实践围绕数据分析、机器学习和前后端开发展开，也在尝试将技术用到游戏与个人创作中。喜欢从一个具体问题出发，先理解需求，再通过资料研究、编码与反复调试验证想法，将它逐步打磨成可使用、可体验、能持续改进的作品。",
  interests: ["AI", "多媒体创意", "机器学习", "软件开发"],
};
// Education and production internship only. Project entries remain below.
// Academic figures come from the supplied DOCX; 3.7737/5.0 rounds to 3.77/5.0.
// Internship duties are cross-checked against the 智能制造yxp report and history.
export const experiences = [
  {
    id: "hbut-education",
    title: "湖北工业大学·本科",
    organization: "底特律绿色工业学院·软件工程",
    period: "2023 — 2027",
    start: "2023", end: "2027",
    text: "绩点 3.77 / 5.0，本科均分 88.39 / 100，专业排名 7 / 59。",
    details: [
      {label: "核心课程", text: "软件工程、Java 程序设计、数据结构与算法、操作系统、计算机网络、数据库原理。"},
      {label: "校院荣誉", text: "获湖北工业大学“优秀大学生”、院级优秀学生干部荣誉，连续两年获得奖学金。"},
      {label: "竞赛获奖", text: "APMCM 亚太地区数学建模竞赛本科组三等奖；全国大学生节能减排社会实践与科技竞赛校二等奖，作品获推国赛；第九届“质量杯”机器人创新大赛魔方识别校三等奖。"},
    ],
  },
  {
    id: "neusoft-training",
    title: "东软教育科技集团·生产实习",
    organization: "Java Web前后端开发",
    period: "2026.06 — 2026.07",
    start: "2026-06", end: "2026-07",
    text: "参与智能制造云工厂管理平台开发，使用 Spring Boot、MyBatis-Plus、MySQL、Vue 3 与 Element Plus 完成前后端功能实现与联调。",
    details: [
      {label: "业务实现", text: "完成产品、设备、用户、订单、生产计划、调度与报工等模块的页面和接口，实现分页筛选、图片上传与回显、数据维护及状态流转，衔接从设备产能维护到生产报工的业务流程。"},
      {label: "联调与验证", text: "排查并修复分页总数异常、前后端字段不一致、设备与产能关系未同步写入、图片回显等问题；使用 IDEA Restful Api Tool 测试接口，通过 Navicat 核验数据库数据变化，并整理实习报告与产品管理模块答辩材料。"},
    ],
  },
];
// Six categories; the initial five-item order was selected by the owner on 2026-10-06.
// The owner adopted this cover set for local iteration on 2026-10-04.
// Illustrations are concepts, not screenshots of project results.
export const projects = [
  {
    id: "machine-learning", number: "01", label: "机器学习",
    image: asset("projects/machine-learning-v1.webp"),
    alt: "手绘学习花园与数据光点，机器学习概念封面",
    english: "LEARNING FROM DATA",
    title: "从数据出发，理解学生压力",
    fullTitle: "基于 Python 的网络爬虫、机器学习及数据可视化应用研究",
    period: "2025.04.19 — 2025.06.30", role: "项目组长 · XGBoost", status: "研究与写作",
    intro: "我从学生压力预测出发，在四人小组中负责 XGBoost、部分论文写作与英文汇报；也独立研究机器学习用于暴力与欺凌识别的文献，并参与校园节能减排调研。这里记录这些学习、研究与写作的具体过程。",
    tags: ["Python", "XGBoost", "数据分析", "文献综述", "共同一作调研"],
    metrics: [{"value": "4 人", "label": "学生压力研究小组"}, {"value": "1,100", "label": "压力数据集样本"}, {"value": "10 个", "label": "压力预测特征"}],
    sections: [],
    story: projectStories['machine-learning'],
  },
  {
    id: "ai-robotics", number: "02", label: "AI+机器人",
    image: asset("projects/ai-robotics-v1.webp"),
    alt: "海边木台上的小型轮式机器人，AI 与机器人概念封面",
    english: "IDEAS IN MOTION",
    title: "让技术走进真实的生活场景",
    fullTitle: "卓越工程师教育培养计划创新实践（中国·香港）项目",
    period: "2026 年 1 月 31 日—2 月 6 日", role: "项目组员", status: "实践完成",
    intro: "带着对 AI 与机器人的好奇，我独自赴港参加了 7 日实践。从 UGOT 组装与编程、乐高传感实验，到和同学讨论生活中的应用场景，再尝试制作可持续发展主题的网页原型，这次经历让我把一些课堂知识放进了自己的动手过程。",
    tags: ["UGOT 机器人", "ucode 4", "组装与调试", "超声波传感", "前端原型"],
    metrics: [{"value": "7 日", "label": "香港创新实践"}, {"value": "3 款", "label": "组装与测试的机器人"}, {"value": "8 人", "label": "跨校合作小组"}],
    sections: [],
    story: projectStories['ai-robotics'],
  },
  {
    id: "game-design", number: "03", label: "游戏设计",
    image: asset("projects/game-design-v1.webp"),
    alt: "沙地上的发光故事门与手柄，独立游戏概念封面",
    english: "A WORLD IN THE MAKING",
    title: "为一个新的世界，推开第一扇门",
    fullTitle: "Unity 独立游戏制作探索",
    period: "2026.09 — 持续探索", role: "个人创作探索", status: "探索中",
    intro: "尝试使用 Unity 制作独立游戏，从一个想法开始，逐步走向能够被体验的小型 Demo。创作还在进行，这里先记录它的起点。",
    tags: ["Unity", "独立游戏", "Demo 探索"],
    metrics: [{value: "Unity", label: "开发工具"}, {value: "Demo", label: "当前探索目标"}, {value: "进行中", label: "创作阶段"}],
    sections: [
      {title: "项目起点", text: "简历中将这一方向列为“Steam 独立游戏制作”，主要使用 Unity 开发，目前仍处于尝试阶段。"},
      {title: "当前方向", text: "目标是先做出小型 Demo，让独立游戏的想法逐渐变成可交互的体验。具体玩法、制作过程与可展示成果将在后续补充。"},
      {title: "继续生长", text: "目前尚未在这份简历中提供已经发布的版本或成果指标。封面表达创作的概念与氛围，后续可加入真实游戏画面与体验入口。"},
    ],
  },
  {
    id: "video-design", number: "04", label: "视频设计",
    image: asset("projects/video-design-v1.webp"),
    alt: "海边沙地上的场记板与摄像机，视频设计概念封面",
    english: "STORIES IN FRAMES",
    title: "让画面，把内容说清楚",
    fullTitle: "校园影像与计算机讲解视频创作",
    period: "校园影像 · 录课实践", role: "拍摄与剪辑", status: "创作实践",
    intro: "这些视频都源于我对多媒体艺术及生活的热爱，现在回望，虽然拍摄手法略显青涩、拍摄素材也不够丰富，却也为我的日子注入了很多新鲜元素。",
    tags: ["Premiere Pro", "剪映", "教学讲解", "校园影像"],
    metrics: [],
    sections: [],
    videos: [
      {
        id: "three-body",
        title: "《三体》",
        context: "“英语演说中国”活动 · 学院初赛视频作品",
        src: asset("videos/three-body-v1.mp4"),
        poster: asset("videos/three-body-poster-v1.webp"),
        width: 960, height: 544,
        productionNotes: "《三体》是学院在\"英语演说中国\"活动中的初赛视频作品，在老师的肯定下成功通过初赛并进入决赛。在后续的不断优化与改进中，三体项目组成员也在决赛现场的演绎中获得全场最高分。\n\n视频主体部分由我全程拍摄（除了友情出演的镜头外）与剪辑。开头和结尾借用了网飞剧版《三体》的开头与结尾，由另一位同学剪辑。",
      },
      {
        id: "digital-hubei",
        title: "《数字湖北》",
        context: "“理解当代中国”竞赛 · 企划作品",
        src: asset("videos/digital-hubei-v1.mp4"),
        poster: asset("videos/digital-hubei-poster-v1.webp"),
        width: 1920, height: 1080,
        productionNotes: "《数字湖北》是在“理解当代中国”竞赛中的企划作品，围绕湖北省的“数字文化”与“数字经济”展开，关注“三维数字化”和“无人驾驶汽车”等领域。拍摄与剪辑的过程，也成为我认识数字化社会的一次具体实践，让我对这些概念有了更加直观的理解。\n\n本片由我全程拍摄并完成剪辑。",
      },
    ],
  },
  {
    id: "survey-system", number: "05", label: "问卷系统设计",
    image: asset("projects/survey-system-v1.webp"),
    alt: "海风中的问卷纸张与铅笔，在线问卷系统概念封面",
    english: "FROM QUESTIONS TO INSIGHT",
    title: "把一份问卷，组织成完整的系统",
    fullTitle: "基于 Spring Boot 3 + Vue 3 的在线问卷型考试系统设计",
    period: "2025.12 — 2026.01", role: "独立课程设计", status: "系统设计与前端原型",
    intro: "我独立梳理了在线问卷型考试的需求、角色、业务流程与技术方案，再用 Vue 3 制作核心页面原型。从题目怎样组织，到答卷与成绩怎样关联，这次课程设计让我尝试把一份问卷背后的系统想得更完整。",
    tags: ["Spring Boot 3", "Vue 3", "MySQL", "RESTful", "系统设计"],
    metrics: [{"value": "独立", "label": "设计文档与前端原型"}, {"value": "4 层", "label": "系统架构方案"}, {"value": "6 类", "label": "核心实体关系设计"}],
    sections: [],
    story: projectStories['survey-system'],
  },
  {
    id: "innovation-lidar", number: "06", label: "大创项目",
    image: asset("projects/innovation-lidar-v1.webp"),
    alt: "小型激光雷达与货物点云，大学生创新项目概念封面",
    english: "SENSING NEW POSSIBILITIES",
    title: "用点云，探索更灵活的工业定位",
    fullTitle: "基于激光雷达的自动码垛机定位系统",
    period: "2025.04 — 持续开展", role: "项目组员", status: "开展中",
    intro: "围绕袋装货物自动码垛与装车中的车斗定位，我参与低成本激光雷达方案的研究，主要承担 SolidWorks 关键部件建模与 MATLAB 三维点云处理、仿真分析。项目已获湖北省重点支持，目前仍在继续研究与验证。",
    tags: ["激光雷达", "SolidWorks", "MATLAB", "三维点云"],
    metrics: [{"value": "省级", "label": "湖北省重点支持项目"}, {"value": "3D", "label": "点云处理与仿真"}, {"value": "进行中", "label": "项目阶段"}],
    sections: [],
    story: projectStories['innovation-lidar'],
  },
];
// The owner supplied both the website's intent and the future studio's origin.
export const studioNotes = [
  {
    id: "website",
    title: "这个网站",
    text: "我想用一种有趣的方式归纳和整理自己的经历、作品与想法，让分散在不同领域的尝试，在这里汇总到一起。\n\n无论是申请海外学习，还是寻找工作机会，我都希望这个网站能让大家更完整地认识我，既看到我对创作的热情，也看到我在计算机、AI 与创意表达之间探索、学习和实践的跨学科能力。",
    doodle: "star",
  },
  {
    id: "studio-name",
    title: "Little Shark Studio",
    text: "“Little Shark”是我读书时期的绰号，也来自那些与“小鲨”有关的网名。我希望把这份熟悉与亲切，带进今后的工作、学习和生活。\n\n“Little Shark Studio”是我希望未来创办的工作室名称。我期待它成为承载创意想法与自我表达的地方，在创意、AI 与计算机领域持续探索，把一个个想法做成作品，逐步建立属于自己的创作方向。",
    doodle: "spiral",
  },
];
