import { gcj02ToWgs84 } from '../utils/mapUtils.js'

// J01–J76 are internal search indexes, not official building numbers. Names and
// image positions are transcribed from the bundled 2023-08-31 Jinnan guide and
// checked against Nankai University's public campus/building descriptions.
const jinnanRows = [
  ['J01', '南开大学医院', 'emergency', 33.8, 18.4],
  ['J02', '西北门', 'gate', 32.4, 10.9],
  ['J03', '北门', 'gate', 55.6, 16.1],
  ['J04', '东门', 'gate', 95.5, 57.7],
  ['J05', '南门', 'gate', 55.2, 95.7],
  ['J06', '西门', 'gate', 10.4, 44.6],
  ['J07', '西南门', 'gate', 30.1, 93.7],
  ['J08', '新校区规划建设指挥部', 'service', 28.5, 21.7],
  ['J09', '文科商业街', 'service', 32.6, 22.3],
  ['J10', '文科食堂', 'service', 35, 29.6],
  ['J11', '教1', 'teaching', 40.2, 20.9],
  ['J12', '教2', 'teaching', 36.6, 21.4],
  ['J13', '教3', 'teaching', 44.2, 22.6],
  ['J14', '学1-A', 'service', 43.8, 31.6],
  ['J15', '学1-B', 'service', 40.6, 29.8],
  ['J16', '学1-C', 'service', 40, 33.2],
  ['J17', '学1-D', 'service', 41.8, 36.1],
  ['J18', '学2-A', 'service', 45, 29.4],
  ['J19', '学2-B', 'service', 44.6, 25.4],
  ['J20', '学4-A', 'service', 35.8, 26.2],
  ['J21', '学4-B', 'service', 37.2, 24],
  ['J22', '学10-A', 'service', 30.3, 25.2],
  ['J23', '学10-B', 'service', 24.8, 26.6],
  ['J24', '留学生公寓A', 'service', 29.7, 34.1],
  ['J25', '留学生公寓B', 'service', 25.7, 29.8],
  ['J26', '留学生公寓C', 'service', 25.4, 33.1],
  ['J27', '留学生公寓D', 'service', 24.5, 36.4],
  ['J28', '留学生公寓E', 'service', 29.3, 36.8],
  ['J29', '专家公寓', 'service', 27, 39],
  ['J30', '旅游与服务学院', 'teaching', 21.2, 44],
  ['J31', '周恩来政府管理学院', 'teaching', 35.4, 38.7],
  ['J32', '历史学院', 'teaching', 39.3, 39.3],
  ['J33', '马克思主义学院', 'teaching', 43, 39.4],
  ['J34', '汉语言文化学院', 'teaching', 33.2, 43.1],
  ['J35', '法学院', 'teaching', 37.6, 43.8],
  ['J36', '哲学院', 'teaching', 44.6, 44],
  ['J37', '金融学院', 'teaching', 42.5, 48],
  ['J38', '文科体育场', 'sports', 49.5, 30],
  ['J39', '体育馆', 'sports', 56.1, 29.8],
  ['J40', '主体育场', 'sports', 64.7, 28],
  ['J41', '木斋图书馆', 'service', 25.9, 50.9],
  ['J42', '思源堂', 'landscape', 30, 49.1],
  ['J43', '秀山堂', 'landscape', 29.5, 53.3],
  ['J44', '新闻与传播学院', 'teaching', 28.7, 55.3],
  ['J45', '环境科学与工程学院', 'teaching', 18.7, 54.6],
  ['J46', '软件学院', 'teaching', 35, 60.5],
  ['J47', '药学院', 'teaching', 19.9, 63.5],
  ['J48', '医学院', 'teaching', 18.2, 69.5],
  ['J49', '电子信息与光学工程学院', 'teaching', 34.4, 67],
  ['J50', '材料科学与工程学院', 'teaching', 40.6, 61.8],
  ['J51', '计算机学院、网络空间安全学院、人工智能学院', 'teaching', 40.4, 67.9],
  ['J52', '实验动物中心', 'teaching', 20.1, 78.3],
  ['J53', '理科体育场', 'sports', 26.1, 77.5],
  ['J54', '理科食堂', 'service', 33.7, 74.8],
  ['J55', '理科商业街', 'service', 36, 75],
  ['J56', '学7-A', 'service', 41.9, 76.3],
  ['J57', '学7-B', 'service', 38.8, 76.1],
  ['J58', '学5-A', 'service', 37.4, 85.5],
  ['J59', '学5-B', 'service', 37.2, 83.1],
  ['J60', '学5-C', 'service', 32.9, 79.9],
  ['J61', '学5-D', 'service', 32.6, 83.2],
  ['J62', '学8', 'service', 41.4, 83],
  ['J63', '学6', 'service', 33.6, 88.8],
  ['J64', '理科教3', 'teaching', 36.6, 88.7],
  ['J65', '学9', 'service', 40.1, 89.7],
  ['J66', '公共教学楼', 'teaching', 51, 53.2],
  ['J67', '综合实验楼', 'teaching', 60.2, 53.2],
  ['J68', '中心图书馆', 'service', 56, 70],
  ['J69', '综合业务西楼', 'service', 51.6, 75.8],
  ['J70', '综合业务东楼', 'service', 59.9, 75.8],
  ['J71', '大通学生活动中心', 'service', 66.5, 56],
  ['J72', '前沿交叉学科中心', 'teaching', 59, 43.5],
  ['J73', '新开湖', 'landscape', 72.2, 54.1],
  ['J74', '马蹄湖', 'landscape', 28, 61.7],
  ['J75', '南开大学警务室', 'emergency', 33.1, 23.2],
  ['J76', '电动车充电处', 'service', 40.8, 15.6],
]

const idOverrides = {
  J01: 'jinnan-hospital',
  J02: 'jinnan-northwest-gate',
  J03: 'jinnan-north-gate',
  J04: 'jinnan-east-gate',
  J05: 'jinnan-south-gate',
  J06: 'jinnan-west-gate',
  J07: 'jinnan-southwest-gate',
  J39: 'jinnan-gymnasium',
  J40: 'jinnan-main-stadium',
  J41: 'jinnan-muzhai-library',
  J45: 'jinnan-environment-college',
  J66: 'jinnan-public-teaching',
  J67: 'jinnan-integrated-lab',
  J68: 'jinnan-library',
  J71: 'jinnan-student-center',
  J75: 'jinnan-campus-police-office',
  J76: 'jinnan-e-bike-charging-area',
}

const verifiedGeo = {
  J01: [[38.9930869, 117.3354414], 'https://www.openstreetmap.org/way/954128563'],
  J02: [[38.9940386, 117.3348347], 'https://www.openstreetmap.org/node/7176188289'],
  J03: [[38.9928608, 117.3413077], 'https://www.openstreetmap.org/node/13338767285'],
  J04: [[38.986498, 117.3511918], 'https://www.openstreetmap.org/node/8830904610'],
  J05: [[38.9821384, 117.3401415], 'https://www.openstreetmap.org/way/1449406047'],
  J06: [[38.9900753, 117.3281921], 'https://www.openstreetmap.org/relation/19841980'],
  J07: [[38.9828622, 117.3332177], 'https://www.openstreetmap.org/node/13153113345'],
  J39: [[38.9909662, 117.3411024], 'https://www.openstreetmap.org/way/1456224127'],
  J40: [[38.9911161, 117.3434146], 'https://www.openstreetmap.org/relation/20162033'],
  J41: [[38.9887377, 117.3331249], 'https://www.openstreetmap.org/way/1430918551'],
  J45: [[38.988187, 117.3309268], 'https://www.openstreetmap.org/way/1434881538'],
  J66: [[38.9871151, 117.3396227], 'https://www.openstreetmap.org/relation/19648366'],
  J67: [[38.9872226, 117.3418429], 'https://www.openstreetmap.org/relation/19920676'],
  J68: [[38.9852884, 117.3405293], 'https://www.openstreetmap.org/way/616829077'],
  J71: [[38.9872244, 117.3440134], 'https://www.openstreetmap.org/way/616829080'],
}

// GCJ-02 coordinates used only for AMap walking-route requests. Online-map
// markers retain their independently verified WGS-84 coordinates above.
const navigationPoints = {
  J66: [38.987655, 117.345517],
  J67: [38.987489, 117.348741],
  J68: [38.9865, 117.347034],
  J71: [38.987807, 117.349894],
}

// Field-collected coordinates match the existing AMap route coordinates, so
// they are retained as GCJ-02 and converted only for OSM marker rendering.
const mvpNavigationPoints = {
  J10: {
    point: [38.992251, 117.3425],
    entryPoints: [[38.992251, 117.3425], [38.992484, 117.342792], [38.992701, 117.342226]],
    aliases: ['第一食堂', '一食堂', '学一食堂'],
    note: '默认导航至第一个入口；已保留三个入口坐标。',
  },
  J17: { point: [38.992014, 117.343256], aliases: ['学生宿舍学1-D', '1D'], note: '正门入口。' },
  J37: { point: [38.990209, 117.343732], aliases: ['南开大学金融学院', '金院'], note: '门口。' },
  J40: { point: [38.991416, 117.349817], aliases: ['南开大学主体育场', '文科操场', '文科田径场', '主田径场', '主操场'], note: '入口需刷脸，使用前请按场馆要求完成注册。' },
  J53: { point: [38.985796, 117.340036], aliases: ['南开大学理科体育场', '理科操场', '理科田径场'], note: '入口需刷脸，使用前请按场馆要求完成注册。' },
  J66: {
    point: [38.987655, 117.345517],
    entryPoints: [[38.987655, 117.345517], [38.987881, 117.346143], [38.988917, 117.346291], [38.989263, 117.345689]],
    aliases: ['公教', '公教A', '教学楼A', '公共教学楼A'],
    note: '默认导航至 A 区入口；已保留 A–D 区入口坐标。',
  },
  J67: {
    point: [38.987489, 117.348741],
    entryPoints: [[38.987489, 117.348741], [38.987798, 117.348079], [38.988842, 117.348217], [38.989063, 117.3489]],
    aliases: ['实验楼A', '实验A', '综合实验楼A'],
    note: '默认导航至 A 区入口；已保留 A–D 区入口坐标。',
  },
  J68: { point: [38.9865, 117.347034], aliases: ['津南校区中心图书馆', '图书馆', '津南图书馆'], note: '正门靠近超市一侧楼梯最下层。' },
  J71: { point: [38.987807, 117.349894], aliases: ['大通', '学生活动中心', '学活中心'], note: '正门 10 米处。' },
}

// These submitted POIs are not separate entries on the J01–J76 guide image.
// They stay online-map only so no invented guide-map position is displayed.
const jinnanOnlineOnlyLocations = [
  ['P01', '公共教学楼B', 'teaching', [38.987881, 117.346143], ['公教B', '教学楼B'], '公共教学楼 B 区入口；现场采集坐标。'],
  ['P02', '公共教学楼C', 'teaching', [38.988917, 117.346291], ['公教C', '教学楼C'], '公共教学楼 C 区入口；现场采集坐标。'],
  ['P03', '公共教学楼D', 'teaching', [38.989263, 117.345689], ['公教D', '教学楼D'], '公共教学楼 D 区入口；现场采集坐标。'],
  ['P04', '综合实验楼B', 'teaching', [38.987798, 117.348079], ['实验楼B', '实验B'], '综合实验楼 B 区入口；现场采集坐标。'],
  ['P05', '综合实验楼C', 'teaching', [38.988842, 117.348217], ['实验楼C', '实验C'], '综合实验楼 C 区入口；现场采集坐标。'],
  ['P06', '综合实验楼D', 'teaching', [38.989063, 117.3489], ['实验楼D', '实验D'], '综合实验楼 D 区入口；现场采集坐标。'],
  ['P07', '清真餐厅', 'service', [38.993018, 117.342183], ['清真食堂'], '清真餐厅门口；现场采集坐标。'],
  ['P08', '麦当劳', 'service', [38.993281, 117.341802], [], '麦当劳门口；现场采集坐标。'],
  ['P09', '快递站', 'service', [38.99442, 117.342483], ['快递柜'], '快递站门口；现场采集坐标。'],
]

const priorityOne = new Set(['J01', 'J02', 'J03', 'J04', 'J05', 'J06', 'J39', 'J66', 'J67', 'J68', 'J71', 'J75'])
const priorityTwo = new Set([
  'J07', 'J10', 'J30', 'J31', 'J32', 'J33', 'J34', 'J35', 'J36', 'J37',
  'J40', 'J41', 'J42', 'J43', 'J44', 'J45', 'J46', 'J47', 'J48', 'J49',
  'J50', 'J51', 'J69', 'J70', 'J72', 'J76',
])

const descriptions = {
  J01: '津南校区医疗资源；紧急情况请优先拨打专业救援电话。',
  J02: '津南校区北侧偏西辅助出入口。',
  J03: '津南校区北侧主要出入口。',
  J04: '津南校区东侧主要出入口。',
  J05: '津南校区礼仪性主要入口。',
  J06: '津南校区西侧主要出入口。',
  J07: '津南校区南侧偏西辅助出入口。',
  J41: '津南校区历史复建区建筑，名称经校方校园介绍核对。',
  J42: '津南校区历史复建区建筑，名称经校方校园介绍核对。',
  J43: '津南校区历史复建区建筑，名称经校方校园介绍核对。',
  J66: '津南校区公共教学楼建筑群。',
  J67: '津南校区综合实验楼建筑群。',
  J68: '津南校区中心图书馆。',
  J71: '津南校区学生活动与公共服务场所。',
  J72: '津南校区教学与科研建筑。',
  J75: '津南校区警务服务点；位置依据用户提供的校园地图标注。',
  J76: '津南校区电动车充电区域；位置依据用户提供的校园地图标注。',
}

const locationPhotos = {
  J01: [
    ['hospital.jpg', '南开大学津南校区校医院实景', '校医院'],
  ],
  J02: [
    ['northwest-gate.jpg', '南开大学津南校区西北门实景', '西北门（北1门）'],
    ['northwest-gate-parcel-station.jpg', '南开大学津南校区西北门快递站实景', '文科生活组团快递站'],
  ],
  J03: [
    ['north-gate.jpg', '南开大学津南校区北门实景', '北门'],
    ['north-gate-delivery-locker.jpg', '南开大学津南校区北门外卖柜实景', '北门外卖柜'],
  ],
  J07: [
    ['southwest-gate.jpg', '南开大学津南校区西南门实景', '西南门（南1门）'],
    ['southwest-gate-entrance.jpg', '南开大学津南校区西南门入口实景', '西南门入口'],
    ['southwest-gate-outside.jpg', '从校外看到的南开大学津南校区西南门', '西南门校外视角'],
    ['southwest-gate-parcel-station.jpg', '南开大学津南校区西南门快递站实景', '理科生活组团快递站'],
  ],
  J39: [
    ['gymnasium-south-entrance.jpg', '南开大学津南校区体育馆南门实景', '体育馆南门'],
  ],
  J66: [
    ['public-teaching-a-exterior.jpg', '南开大学津南校区公共教学楼A区外观', '公共教学楼A区外观'],
    ['public-teaching-a-entrance.jpg', '南开大学津南校区公共教学楼A区入口', '公共教学楼A区入口'],
    ['public-teaching-c-entrance.jpg', '南开大学津南校区公共教学楼C区入口', '公共教学楼C区入口'],
    ['public-teaching-d-entrance.jpg', '南开大学津南校区公共教学楼D区入口', '公共教学楼D区入口'],
  ],
  J67: [
    ['integrated-lab-overview.jpg', '南开大学津南校区综合实验楼全貌', '综合实验楼全貌'],
    ['integrated-lab-a-entrance.jpg', '南开大学津南校区综合实验楼A区入口', '综合实验楼A区入口'],
    ['integrated-lab-b-entrance.jpg', '南开大学津南校区综合实验楼B区入口', '综合实验楼B区入口'],
    ['integrated-lab-d-exterior.jpg', '南开大学津南校区综合实验楼D区外观', '综合实验楼D区外观'],
    ['integrated-lab-d-entrance.jpg', '南开大学津南校区综合实验楼D区入口', '综合实验楼D区入口'],
  ],
  J68: [
    ['library-north-entrance.jpg', '南开大学津南校区中心图书馆北门实景', '图书馆北门'],
  ],
  J71: [
    ['student-center-exterior.jpg', '南开大学津南校区大通学生活动中心外观', '大通学生活动中心'],
    ['student-center-entrance.jpg', '南开大学津南校区大通学生活动中心入口', '大通学生活动中心入口'],
  ],
  J75: [
    ['campus-police-office.jpg', '南开大学津南校区警务室实景', '南开大学警务室'],
  ],
  J76: [
    ['e-bike-charging-area.jpg', '南开大学津南校区电动车充电处实景', '电动车充电处'],
  ],
}

export const jinnanLocations = jinnanRows.map(([number, name, category, x, y]) => {
  const geo = verifiedGeo[number]
  const mvp = mvpNavigationPoints[number]
  const photos = locationPhotos[number]?.map(([file, alt, caption]) => ({
    src: `/images/jinnan-places/${file}`,
    alt,
    caption,
  })) || []
  return {
    id: idOverrides[number] || `jinnan-location-${number.toLowerCase()}`,
    campus: 'jinnan',
    number,
    numberKind: 'internal',
    name,
    category,
    imagePoint: { x, y },
    geoPoint: geo?.[0] || (mvp?.point ? gcj02ToWgs84(mvp.point) : null),
    geoSource: geo?.[1] || (mvp ? '现场采集 GCJ-02 入口坐标' : null),
    navigationPoint: mvp?.point || navigationPoints[number] || null,
    entryPoints: mvp?.entryPoints || (mvp?.point ? [mvp.point] : []),
    aliases: mvp?.aliases || [],
    priority: priorityOne.has(number) ? 1 : priorityTwo.has(number) ? 2 : 3,
    emergency: number === 'J01',
    description: mvp?.note
      ? `${descriptions[number] || `${name}。`} 现场核验：${mvp.note}`
      : (descriptions[number] || `津南校区导览图地点；${number} 为本站交互检索编号。`),
    photos,
  }
})
  .concat(jinnanOnlineOnlyLocations.map(([number, name, category, navigationPoint, aliases, description]) => ({
    id: `jinnan-field-${number.toLowerCase()}`,
    campus: 'jinnan',
    number,
    numberKind: 'field',
    name,
    category,
    imagePoint: null,
    geoPoint: gcj02ToWgs84(navigationPoint),
    geoSource: '现场采集 GCJ-02 入口坐标',
    navigationPoint,
    entryPoints: [navigationPoint],
    aliases,
    priority: 3,
    emergency: false,
    description,
    photos: [],
  })))
