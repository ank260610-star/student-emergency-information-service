import { jinnanLocations } from './jinnanLocations.js'
import { landmarkNarratives } from './landmarkNarratives.js'
import { gcj02ToWgs84 } from '../utils/mapUtils.js'

export const categoryMeta = {
  emergency: { label: '医疗与应急', symbol: '✚' },
  gate: { label: '校门与出入口', symbol: '↗' },
  teaching: { label: '教学与科研', symbol: '▦' },
  service: { label: '公共服务', symbol: '◆' },
  sports: { label: '体育场馆', symbol: '◎' },
  landscape: { label: '校园地标', symbol: '◇' },
}

export const onlineMapProvider = {
  // OSM's public tile service rejects or times out for some campus networks.
  // AMap's public base tiles keep the online view reachable in mainland China.
  url: 'https://webrd01.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
  attribution: '&copy; <a href="https://ditu.amap.com/">高德地图</a>',
  coordinateSystem: 'GCJ-02',
  maxZoom: 19,
}

export const campusConfigs = {
  balitai: {
    id: 'balitai',
    name: '八里台校区',
    short: '八里台',
    image: '/images/campus-map-balitai.jpg',
    imageAlt: '南开大学八里台校区校园导览图',
    imageSize: { width: 1280, height: 947 },
    // OSM tiles use WGS-84. These values are the WGS-84 conversion of the
    // GCJ-02 field/map coordinates used for the Balitai POI dataset.
    geoCenter: [39.1024928, 117.1611403],
    geoBounds: [[39.0984362, 117.1486181], [39.1060847, 117.1736633]],
    geoZoom: 16,
    geoDataStatus: '八里台在线地图仅显示已核验的现场 POI。',
    sourceLabel: '八里台校区图 · 01–90',
  },
  jinnan: {
    id: 'jinnan',
    name: '津南校区',
    short: '津南',
    image: '/images/campus-map-jinnan.jpg',
    imageAlt: '南开大学津南校区校园导览图，版本日期为 2023 年 8 月 31 日',
    imageSize: { width: 1816, height: 1280 },
    geoCenter: [38.9869388, 117.33941],
    geoBounds: [[38.9810281, 117.3264947], [38.9952273, 117.3519729]],
    geoZoom: 16,
    geoDataStatus: '津南在线地图只显示已核验的楼宇点位。',
    sourceLabel: '津南校区图 v3.0 · 高德地图',
    numberingNote: 'J01–J76 是本站交互检索编号，不是学校官方建筑编号。',
    illustrationCorrections: [
      {
        bounds: { left: 54.5, right: 63.5, top: 39.2, bottom: 48.8 },
        fill: '#8199aa',
        labelLines: ['前沿交叉', '学科中心'],
      },
    ],
  },
}

// The 1–90 legend and positions come from the bundled official-style campus
// illustration. Coordinates are percentages so they stay aligned while zooming.
const balitaiLocationRows = [
  ['01', '东门', 'gate', 93.1, 55.4],
  ['02', '收发室', 'service', 89.8, 61.1],
  ['03', '综合实验楼', 'teaching', 82.7, 60],
  ['04', '蒙民伟楼', 'teaching', 81.3, 66.5],
  ['05', '思源堂', 'teaching', 73.9, 68.5],
  ['06', '花园', 'landscape', 77.4, 59],
  ['07', '幼儿园', 'service', 72.7, 57.1],
  ['08', '芝琴楼', 'teaching', 70.2, 53.3],
  ['09', '东方艺术大楼', 'teaching', 65.6, 52.5],
  ['10', '三教', 'teaching', 60, 52.4],
  ['11', '校钟', 'landscape', 56.2, 47.4],
  ['12', '四教', 'teaching', 47.4, 48.2],
  ['13', '西南联大纪念碑', 'landscape', 44.7, 46.5],
  ['14', '五教', 'teaching', 42.4, 52.8],
  ['15', '六教', 'teaching', 43.8, 56.8],
  ['16', '省身楼', 'teaching', 39.1, 62],
  ['17', '主楼', 'teaching', 54.8, 54.7],
  ['18', '周恩来雕像', 'landscape', 49.8, 61.9],
  ['19', '南门', 'gate', 46.6, 69.9],
  ['20', '元素所', 'teaching', 56.2, 62.5],
  ['21', '汉院教学南楼', 'teaching', 59.9, 56.2],
  ['22', '专家楼', 'service', 62.7, 59.2],
  ['23', '谊园', 'landscape', 64.9, 64.8],
  ['24', '爱大会馆', 'service', 69.1, 71.8],
  ['25', '校车区', 'service', 95.2, 50.1],
  ['26', '工商银行', 'service', 90.2, 42.3],
  ['27', '交通银行', 'service', 95.5, 28],
  ['28', '天南大联合楼', 'teaching', 84.8, 20.9],
  ['29', '办公楼', 'service', 84.2, 35.1],
  ['30', '马蹄湖', 'landscape', 84.3, 43.6],
  ['31', '新开湖', 'landscape', 70.2, 41.8],
  ['32', '老图书馆', 'service', 72.3, 34.6],
  ['33', '新体育馆', 'sports', 74.5, 26.1],
  ['34', '老体育馆', 'sports', 66.4, 21.4],
  ['35', '体育场', 'sports', 60.5, 23.1],
  ['36', '三食堂', 'service', 45, 30.4],
  ['37', '排球场', 'sports', 48.7, 29.9],
  ['38', '六宿舍', 'service', 49.6, 26.9],
  ['39', '五宿舍', 'service', 49.4, 33.4],
  ['40', '文科创新楼', 'teaching', 48.3, 37.1],
  ['41', '二主楼', 'teaching', 59.4, 43.1],
  ['42', '校医院', 'emergency', 59.8, 37.8],
  ['43', '汉院北楼', 'teaching', 64.8, 37],
  ['44', '八宿舍', 'service', 65, 33.3],
  ['45', '十二宿舍', 'service', 65.6, 30.1],
  ['46', '16-19宿舍', 'service', 48.4, 21.1],
  ['47', '二十宿舍', 'service', 62.7, 29.1],
  ['48', '十宿舍', 'service', 59.2, 32.1],
  ['49', '十三宿舍', 'service', 59.8, 28],
  ['50', '化学楼', 'teaching', 38.4, 37.5],
  ['51', '生物楼', 'teaching', 31.6, 48.7],
  ['52', '生物大楼', 'teaching', 26.8, 55.4],
  ['53', '觉悟楼', 'teaching', 25.7, 45.7],
  ['54', '新图书馆', 'service', 31.4, 36.4],
  ['55', '电教中心', 'service', 35.6, 35.4],
  ['56', '伯苓楼', 'teaching', 26.8, 33.4],
  ['57', '经济学院', 'teaching', 22.1, 30.2],
  ['58', '圆阶教室', 'teaching', 18.7, 39.9],
  ['59', '西南村生活服务区', 'service', 16.7, 44.8],
  ['60', '交通银行', 'service', 15.5, 49],
  ['61', '西南门', 'gate', 12.5, 51.2],
  ['62', '崇明桥', 'landscape', 10.3, 53.9],
  ['63', '二食堂', 'service', 40.1, 27.2],
  ['64', '清真食堂', 'service', 40.2, 31.7],
  ['65', '一食堂', 'service', 38, 33.7],
  ['66', '七教', 'teaching', 33.7, 33],
  ['67', '数学楼', 'teaching', 28.9, 32.1],
  ['68', '中心实验室', 'teaching', 31.3, 29.6],
  ['69', '浴园', 'service', 36.2, 22.2],
  ['70', '十五宿', 'service', 40, 21.6],
  ['71', '十四宿', 'service', 42.3, 19.3],
  ['72', '二十一宿', 'service', 38.3, 19],
  ['73', '学生活动中心', 'service', 33.8, 19.5],
  ['74', '西区篮球场', 'sports', 26.3, 28.3],
  ['75', '西区九号楼', 'service', 23.6, 19.3],
  ['76', '西区五号楼', 'service', 28.8, 15.6],
  ['77', '西区六号楼', 'service', 31.1, 13.2],
  ['78', '西区七号楼', 'service', 31.8, 11.6],
  ['79', '西区一号楼', 'service', 24.9, 13.5],
  ['80', '西区二号楼', 'service', 26.1, 11.8],
  ['81', '西区三号楼', 'service', 26.9, 10],
  ['82', '西区四号楼', 'service', 28, 8.8],
  ['83', '西区八号楼', 'service', 30.5, 7],
  ['84', '出版社', 'service', 20.1, 16.3],
  ['85', '高培楼', 'teaching', 16.6, 12.8],
  ['86', '学者公寓', 'service', 14.1, 17.2],
  ['87', '商学院大楼', 'teaching', 10, 15.8],
  ['88', '雷电中心', 'service', 9.8, 31.7],
  ['89', '西门', 'gate', 11.7, 11.8],
  ['90', '加油站', 'service', 13.1, 10.1],
]

const balitaiIdOverrides = {
  '01': 'balitai-east-gate',
  '03': 'balitai-laboratory',
  '09': 'balitai-oriental-art-building',
  '13': 'balitai-memorial',
  '17': 'balitai-main-building',
  '18': 'balitai-zhou-enlai-statue',
  '19': 'balitai-south-gate',
  '30': 'balitai-mati-lake',
  '31': 'balitai-xinkai-lake',
  '32': 'balitai-old-library',
  '33': 'balitai-new-gymnasium',
  '35': 'balitai-stadium',
  '41': 'balitai-second-main-building',
  '42': 'balitai-hospital',
  '73': 'balitai-student-center',
}

const balitaiDescriptions = {
  '01': '八里台校区卫津路方向主要出入口。',
  '13': '西南联大纪念地标，位置以校园导览图为依据。',
  '17': '八里台校区核心教学与行政地标。',
  '18': '周恩来总理纪念雕像，位置以校园导览图为依据。',
  '19': '八里台校区南侧出入口。',
  '30': '八里台校区马蹄形水域地标。',
  '31': '八里台校区水域地标。',
  '42': '校园医疗资源位置；紧急情况请优先拨打专业救援电话。',
  '61': '八里台校区西南侧出入口。',
  '73': '校园活动与公共服务场所。',
  '89': '八里台校区白堤路方向出入口。',
}

const balitaiPriorityOne = new Set(['01', '17', '19', '41', '42'])
const balitaiPriorityTwo = new Set(['03', '09', '13', '18', '28', '32', '33', '35', '54', '61', '65', '73', '89'])

// Field-collected entrance coordinates from “地点经纬度信息采集_导航坐标整理版 -八里台”.
// Although the table says “未做偏移”, the East/West Gate coordinates exactly
// match AMap's published POI coordinates, so the raw values are GCJ-02.
// Keep raw GCJ-02 values for AMap routing and convert only for OSM rendering.
const balitaiVerifiedGeo = {
  '01': { point: [39.1034, 117.178667], aliases: ['东门'], note: '正门入口' },
  '03': { point: [39.102819, 117.176197], aliases: ['实验楼', '实验'], note: '入口' },
  '05': { point: [39.101961, 117.175658], aliases: ['思源堂'], note: '校史路线点位。' },
  '11': { point: [39.102909, 117.171207], aliases: ['校钟'], note: '校史路线点位。' },
  '13': { point: [39.102738, 117.169277], aliases: ['西南联大纪念碑'], note: '校史路线点位。' },
  '17': { point: [39.101921, 117.171236], aliases: ['主楼'], note: '入口' },
  '18': { point: [39.101547, 117.171301], aliases: ['周恩来总理像', '周恩来像'], note: '校史路线点位。' },
  '30': { point: [39.103352, 117.175596], aliases: ['马蹄湖'], note: '校史路线点位。' },
  '35': { point: [39.105049, 117.171261], aliases: ['田径场', '大篮球场'], note: '入口' },
  '41': { point: [39.10335, 117.171422], aliases: ['第二主教学楼', '二主教', '二教'], note: '入口' },
  '50': { point: [39.103001, 117.168224], aliases: ['化学大楼', '化院大楼'], note: '入口' },
  '54': { point: [39.102974, 117.166077], aliases: ['大图书馆', '逸夫图书馆'], note: '入口' },
  '73': { point: [39.105689, 117.163289], aliases: ['南开大学学生活动中心', '学活'], note: '入口' },
  '89': { point: [39.106113, 117.156348], aliases: ['西门'], note: '正门入口' },
}

// These POIs are part of the submitted field data but are not numbered in the
// 01–90 illustration. They intentionally appear on the online map only rather
// than being assigned an invented position on the campus guide image.
const balitaiOnlineOnlyLocations = [
  {
    id: 'balitai-nankai-university-stop',
    number: 'P01',
    name: '南开大学站',
    category: 'service',
    geoPoint: [39.106387, 117.156283],
    aliases: ['612上车点', '点对点上车点'],
    description: '八里台校区周边交通站点；现场采集入口级坐标。',
  },
  {
    id: 'balitai-haibing-building',
    number: 'P02',
    name: '海冰楼',
    category: 'teaching',
    geoPoint: [39.103677, 117.174653],
    aliases: ['校史馆', '校史展览', '海冰楼校史展览馆'],
    description: '八里台校区校史展览相关地点；现场采集入口级坐标。',
  },
  {
    id: 'balitai-zhang-boling-statue',
    number: 'P03',
    name: '张伯苓塑像',
    category: 'landscape',
    geoPoint: [39.102786, 117.175618],
    aliases: ['张伯苓像'],
    description: '八里台校区校史探索路线点位；现场采集坐标。',
  },
  {
    id: 'balitai-jialing-residence',
    number: 'P04',
    name: '迦陵学舍',
    category: 'landscape',
    geoPoint: [39.101938, 117.175099],
    aliases: [],
    description: '八里台校区校史探索路线点位；现场采集坐标。',
  },
  {
    id: 'balitai-chen-shengshen-residence',
    number: 'P05',
    name: '陈省身故居',
    category: 'landscape',
    geoPoint: [39.101948, 117.174691],
    aliases: [],
    description: '八里台校区校史探索路线点位；现场采集坐标。',
  },
  {
    id: 'balitai-zhou-enlai-monument',
    number: 'P06',
    name: '周恩来纪念碑',
    category: 'landscape',
    geoPoint: [39.103977, 117.175556],
    aliases: [],
    description: '八里台校区校史探索路线点位；现场采集坐标。',
  },
  {
    id: 'balitai-yu-fangzhou-statue',
    number: 'P07',
    name: '于方舟烈士像',
    category: 'landscape',
    geoPoint: [39.104238, 117.173887],
    aliases: [],
    description: '八里台校区校史探索路线点位；现场采集坐标。',
  },
  {
    id: 'balitai-cultural-store',
    number: 'P08',
    name: '校园文创店',
    category: 'service',
    geoPoint: [39.10288, 117.174054],
    aliases: ['文创店'],
    description: '八里台校区校史探索路线服务点；现场采集坐标。',
  },
  {
    id: 'balitai-chen-shengshen-monument',
    number: 'P09',
    name: '陈省身碑',
    category: 'landscape',
    geoPoint: [39.100904, 117.170558],
    aliases: [],
    description: '八里台校区校史探索路线点位；现场采集坐标。',
  },
  {
    id: 'balitai-yang-shixian-statue',
    number: 'P10',
    name: '杨石先像',
    category: 'landscape',
    geoPoint: [39.103449, 117.167359],
    aliases: ['杨石先塑像'],
    description: '八里台校区校史探索路线点位；现场采集坐标。',
  },
  {
    id: 'balitai-patriotic-three-questions',
    number: 'P11',
    name: '爱国三问碑',
    category: 'landscape',
    geoPoint: [39.105198, 117.162811],
    aliases: ['爱国三问'],
    description: '八里台校区校史探索路线点位；现场采集坐标。',
  },
]

const balitaiLocations = [
  ...balitaiLocationRows.map(([number, name, category, x, y]) => {
    const verified = balitaiVerifiedGeo[number]
    return {
      id: balitaiIdOverrides[number] || `balitai-location-${number}`,
      campus: 'balitai',
      number,
      name,
      category,
      imagePoint: { x, y },
      geoPoint: verified ? gcj02ToWgs84(verified.point) : null,
      navigationPoint: verified?.point || null,
      geoSource: verified ? '现场采集 GCJ-02 入口坐标' : null,
      aliases: verified?.aliases || [],
      priority: balitaiPriorityOne.has(number) ? 1 : balitaiPriorityTwo.has(number) ? 2 : 3,
      emergency: number === '42',
      description: verified
        ? `${balitaiDescriptions[number] || `${name}。`} 现场核验：${verified.note}。`
        : (balitaiDescriptions[number] || `校园导览图编号 ${number}，${name}。`),
    }
  }),
  ...balitaiOnlineOnlyLocations.map((location) => ({
    ...location,
    campus: 'balitai',
    imagePoint: null,
    geoPoint: gcj02ToWgs84(location.geoPoint),
    navigationPoint: location.geoPoint,
    geoSource: '现场采集 GCJ-02 入口坐标',
    priority: 2,
    emergency: false,
  })),
]

export const campusLocations = [...balitaiLocations, ...jinnanLocations].map((location) => ({
  ...location,
  landmarkNarrative: landmarkNarratives[location.id] || null,
}))

// A curated visit order, not a street-level walking geometry. NK 智行 can use
// each adjacent pair for turn-by-turn routing after a visitor chooses a stop.
export const campusTours = {
  balitai: [
    {
      id: 'balitai-history-tour',
      name: '南开校史探索路线',
      summary: '东门出发，串联已采集校史地标，西门结束。地图紫线表示建议游览顺序，不替代步行道路导航。',
      stopIds: [
        'balitai-east-gate',
        'balitai-haibing-building',
        'balitai-zhang-boling-statue',
        'balitai-location-05',
        'balitai-jialing-residence',
        'balitai-chen-shengshen-residence',
        'balitai-zhou-enlai-monument',
        'balitai-mati-lake',
        'balitai-yu-fangzhou-statue',
        'balitai-cultural-store',
        'balitai-main-building',
        'balitai-zhou-enlai-statue',
        'balitai-location-11',
        'balitai-memorial',
        'balitai-chen-shengshen-monument',
        'balitai-yang-shixian-statue',
        'balitai-patriotic-three-questions',
        'balitai-location-89',
      ],
    },
    {
      id: 'balitai-patriotic-tour',
      name: '爱国主题路线',
      summary: '从东门出发，串联周恩来纪念碑、于方舟烈士像、西南联大纪念碑与爱国三问碑。',
      stopIds: [
        'balitai-east-gate',
        'balitai-zhou-enlai-monument',
        'balitai-yu-fangzhou-statue',
        'balitai-main-building',
        'balitai-zhou-enlai-statue',
        'balitai-memorial',
        'balitai-patriotic-three-questions',
        'balitai-location-89',
      ],
    },
    {
      id: 'balitai-public-ability-tour',
      name: '公能主题路线',
      summary: '围绕南开精神与治学传承，连接张伯苓塑像、海冰楼校史展览馆、主楼、校钟与新图书馆。',
      stopIds: [
        'balitai-east-gate',
        'balitai-haibing-building',
        'balitai-zhang-boling-statue',
        'balitai-main-building',
        'balitai-location-11',
        'balitai-location-54',
        'balitai-location-89',
      ],
    },
    {
      id: 'balitai-striving-tour',
      name: '奋斗主题路线',
      summary: '从东门步入学习与生活空间，串联综合实验楼、二主楼、化学楼、新图书馆、体育场和学生活动中心。',
      stopIds: [
        'balitai-east-gate',
        'balitai-laboratory',
        'balitai-second-main-building',
        'balitai-location-50',
        'balitai-location-54',
        'balitai-stadium',
        'balitai-student-center',
        'balitai-location-89',
      ],
    },
  ],
}

export function getCampusLocations(campusId) {
  return campusLocations.filter((location) => location.campus === campusId)
}
