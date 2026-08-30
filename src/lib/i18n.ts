import { siteConfig } from './site-config';

const messages = {
  en: {
    skip: 'Skip to content', menu: 'Menu', close: 'Close menu', contact: 'Contact', home: 'Home',
    platforms: 'Platform links', activitiesEyebrow: 'Currently exploring', activitiesTitle: 'What I’m up to lately',
    activitiesDescription: 'Recent games, active projects and new uploads.', swipe: 'Swipe to explore →',
    dailyLife: 'Daily Life', smallMoments: 'Small moments', blog: 'Blog', thoughts: 'Thoughts & builds',
    gallery: 'Gallery', latestFrames: 'Latest frames', viewAll: 'View all', listening: 'Currently Listening',
    onRepeat: 'On repeat', about: 'About Me', aboutTitle: 'A few things about me', visit: 'Open link',
    blogTitle: 'Notes, tutorials & experiences.', blogIntro: 'Longer thoughts written in Markdown.',
    lifeTitle: 'Small moments worth keeping.', lifeIntro: 'Short records from everyday life.',
    galleryTitle: 'A collection of scenes.', galleryIntro: 'Photography, illustrations and visual notes.',
    backBlog: 'Back to blog', backLife: 'Back to Daily Life', backGallery: 'Back to gallery',
    previous: 'Previous', next: 'Next', updated: 'Updated', published: 'Published', tag: 'Tag',
    notFoundTitle: 'This page drifted away.', notFoundText: 'The address may have changed or the page no longer exists.',
    returnHome: 'Return home', noContent: 'Nothing published here yet.', photos: 'Photos', readMore: 'Read more',
  },
  'zh-CN': {
    skip: '跳到主要内容', menu: '菜单', close: '关闭菜单', contact: '联系我', home: '首页',
    platforms: '平台链接', activitiesEyebrow: '最近动态', activitiesTitle: '最近在做什么',
    activitiesDescription: '最近的游戏、项目和视频动态。', swipe: '滑动查看更多 →',
    dailyLife: '日常生活', smallMoments: '生活片段', blog: '博客', thoughts: '思考与创作',
    gallery: '画廊', latestFrames: '最近作品', viewAll: '查看全部', listening: '最近在听',
    onRepeat: '循环播放', about: '关于我', aboutTitle: '关于我的几件小事', visit: '打开链接',
    blogTitle: '笔记、教程与经历。', blogIntro: '用 Markdown 写下更完整的思考。',
    lifeTitle: '值得收藏的小瞬间。', lifeIntro: '来自日常生活的短记录。',
    galleryTitle: '一些场景的集合。', galleryIntro: '摄影、插画与视觉笔记。',
    backBlog: '返回博客', backLife: '返回日常生活', backGallery: '返回画廊',
    previous: '上一篇', next: '下一篇', updated: '更新于', published: '发布于', tag: '标签',
    notFoundTitle: '这个页面飘走了。', notFoundText: '地址可能已变化，或者页面已经不存在。',
    returnHome: '返回首页', noContent: '这里还没有发布内容。', photos: '照片', readMore: '阅读全文',
  },
} as const;

export type MessageKey = keyof typeof messages.en;
export const locale = siteConfig.site.locale;
export const t = (key: MessageKey) => messages[locale][key];

export function formatDate(date: Date, options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' }) {
  return new Intl.DateTimeFormat(locale, options).format(date);
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat(locale).format(value);
}
