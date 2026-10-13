const officialCollegeDirectory = 'https://www.nankai.edu.cn/212/list.htm'

function collegeProfile(title, campus, accountName, website = officialCollegeDirectory) {
  return {
    title,
    kind: '学院建筑',
    brief: `这里是南开大学${title}在${campus}的教学、科研与学生事务场所。`,
    facts: `建筑内具体院系分布、办公地点、开放安排和活动通知可能调整，请以现场标识、学院官网及认证公众号的最新信息为准。`,
    nearbyRadiusMeters: 80,
    sources: [
      { label: `${title}官方信息`, type: '官网', url: website },
      { label: accountName, type: '公众号', url: '/wechat' },
    ],
  }
}

function buildingProfile(title, brief, facts, sources = [], nearbyRadiusMeters = 80) {
  return { title, kind: '校园建筑', brief, facts, sources, nearbyRadiusMeters }
}

export const placeProfiles = {
  'balitai-location-50': collegeProfile('化学学院', '八里台校区', '南开化学'),
  'balitai-location-57': collegeProfile('经济学院', '八里台校区', '南开大学经济学院', 'https://economics.nankai.edu.cn/'),
  'balitai-location-87': collegeProfile('商学院', '八里台校区', '南开商学院', 'https://bs.nankai.edu.cn/'),
  'balitai-location-54': buildingProfile(
    '逸夫图书馆',
    '八里台校区的重要图书馆与学习空间。',
    '馆藏、开馆时间、入馆规则和空间预约安排可能调整，请通过南开大学图书馆官网查询当日信息。',
    [{ label: '南开大学图书馆', type: '官网', url: 'https://lib.nankai.edu.cn/' }],
  ),
  'jinnan-location-j30': collegeProfile('旅游与服务学院', '津南校区', '南开大学旅游与服务学院（青春南旅）'),
  'jinnan-location-j31': collegeProfile('周恩来政府管理学院', '津南校区', '南开大学政府学院'),
  'jinnan-location-j32': collegeProfile('历史学院', '津南校区', '南开史学'),
  'jinnan-location-j33': collegeProfile('马克思主义学院', '津南校区', '南开马院'),
  'jinnan-location-j34': collegeProfile('汉语言文化学院', '津南校区', 'NKU汉院'),
  'jinnan-location-j35': collegeProfile('法学院', '津南校区', '南开大学法学院'),
  'jinnan-location-j36': collegeProfile('哲学院', '津南校区', '南开大学哲学院'),
  'jinnan-location-j37': collegeProfile('金融学院', '津南校区', '南开大学金融学院', 'https://finance.nankai.edu.cn/'),
  'jinnan-environment-college': collegeProfile('环境科学与工程学院', '津南校区', '南开环境', 'https://env.nankai.edu.cn/'),
  'jinnan-location-j46': collegeProfile('软件学院', '津南校区', '南开大学软件学院'),
  'jinnan-location-j47': collegeProfile('药学院', '津南校区', '南开大学药学院'),
  'jinnan-location-j48': collegeProfile('医学院', '津南校区', '南开大学医学院'),
  'jinnan-location-j49': collegeProfile('电子信息与光学工程学院', '津南校区', '南开电光之家NKU'),
  'jinnan-location-j50': collegeProfile('材料科学与工程学院', '津南校区', '南开材料'),
  'jinnan-location-j51': {
    title: '计算机、网安与人工智能学院楼',
    kind: '学院建筑',
    brief: '这里是计算机学院、密码与网络空间安全学院、人工智能学院共同使用的教学科研建筑。',
    facts: '不同学院的办公室、实验室和活动安排应分别以现场标识及各学院官方渠道为准。',
    nearbyRadiusMeters: 90,
    sources: [
      { label: '南开大学院系目录', type: '官网', url: officialCollegeDirectory },
      { label: 'NKU计算机', type: '公众号', url: '/wechat' },
      { label: 'NKU网安', type: '公众号', url: '/wechat' },
      { label: 'NK人工智能', type: '公众号', url: '/wechat' },
    ],
  },
  'jinnan-public-teaching': buildingProfile(
    '公共教学楼A',
    '津南校区承担公共课程教学的重要建筑群。',
    '建筑分为多个区域。前往具体教室时请同时核对区号、楼层和房间号，入口位置以现场标识为准。',
  ),
  'jinnan-integrated-lab': buildingProfile(
    '综合实验楼',
    '津南校区集中开展实验教学与科研活动的建筑群。',
    '建筑分为多个区域，实验空间通常有专门的准入与安全要求，请按课程或实验室通知进入。',
  ),
  'jinnan-library': buildingProfile(
    '中心图书馆',
    '津南校区的主要图书、阅览与学习空间。',
    '开馆时间、入馆规则、座位及空间服务可能调整，请通过南开大学图书馆官网查询。',
    [{ label: '南开大学图书馆', type: '官网', url: 'https://lib.nankai.edu.cn/' }],
  ),
}

const placeProfileAliases = {
  'balitai-location-50': ['化学楼', '化学大楼'],
  'balitai-location-54': ['新图书馆', '大图书馆'],
  'balitai-location-87': ['商学院大楼'],
  'jinnan-location-j51': ['计算机学院', '网安学院', '人工智能学院'],
  'jinnan-public-teaching': ['公共教学楼', '公教', '公教楼', '公教A', '教学楼A'],
  'jinnan-integrated-lab': ['实验楼'],
  'jinnan-library': ['津南图书馆'],
}

export function findPlaceProfile(text) {
  const normalizedText = String(text || '').toLocaleLowerCase('zh-CN').replaceAll(/\s/g, '')
  if (!normalizedText) return null

  return Object.entries(placeProfiles)
    .flatMap(([id, profile]) => [profile.title, ...(placeProfileAliases[id] || [])]
      .map((alias) => ({
        id,
        profile,
        index: normalizedText.lastIndexOf(alias.toLocaleLowerCase('zh-CN')),
        aliasLength: alias.length,
      }))
      .filter((match) => match.index >= 0))
    .sort((left, right) => right.aliasLength - left.aliasLength || right.index - left.index)[0]
    ?.profile || null
}
