# NK 智行 Agent MVP

这是校园 3D 实景导航作品的 Agent 交付底座。它不直接替代地图或路线引擎；Agent 负责理解需求、补全信息、调用可信工具、做安全检查并把结果组织为可执行的行动。

## Agent MVP 资料范围

- 本目录的初版 POI 与评测资料以津南校区步行场景为主；当前网页已经支持双校区以及步行、骑行、驾车，运行契约见 [连接配置](NK_GENIOS_CONNECTION.md)。
- `data/poi.seed.json` 中的地点来自现有网站地图数据；`verificationStatus` 为 `needs-field-verification` 的条目不得被描述为已完成实地核验。
- 路线须由真实路线工具返回；当前网页通过 Worker 调用高德路线服务。没有路线工具结果时，Agent 只能定位地点并给出外部地图兜底入口，不能自行编造转向指引、距离或时长。
- 涉及人身安全、医疗急症、火灾、违法犯罪等紧急情形，优先建议联系 110、119、120 或学校应急渠道；不得承诺响应时间或替代专业救援。

## NK-GeniOS 搭建顺序

1. 创建主智能体“NK 智行”。
2. 上传 `data/poi.seed.json` 转换得到的可检索地点知识库；保留 `source`、`updatedAt` 与核验状态。
3. 配置 `place_search`、`route_plan`、`campus_service`、`safety_guard` 四项工具。前两项是首期必需。
4. 以本文件的“主智能体规则”作为系统提示词骨架，补充工作流中的实际 API 字段。
5. 使用 `data/evaluation-cases.json` 逐条评测，保存每次版本的结果与失败原因。

## 工具契约

### `place_search`

输入：`query`、可选 `campus`、可选 `category`。

输出：匹配地点的 `id`、`name`、`campus`、`category`、`geoPoint`、`verificationStatus`、`source`。

### `route_plan`

输入：`campus`、`origin`、`destination`、可选 `preference`（`fastest`、`least-walking`、`accessible`）。

输出：`status`、`steps`、`distanceMeters`、`durationMinutes`、`warnings`、`mapUrl`、`dataUpdatedAt`。

当 `status` 不是 `verified` 时，不能以确定语气给出路线结论。

### `campus_service`

输入：`campus`、`serviceType`。

输出：服务地点、开放信息、信息来源和最后核验时间。开放信息缺失时明确说明“请以现场或学校最新通知为准”。

### `safety_guard`

输入：用户原话与已识别的上下文。

输出：风险等级（`normal`、`caution`、`emergency`）、行动建议、是否中断普通导航。

## 主智能体规则

1. 先识别校区、起点、终点、偏好和风险；缺少影响路线规划的信息时，只问一个最关键的问题。
2. 地点名称、路线、开放时间和安全信息必须由工具或标注来源的知识库提供。
3. 输出采用“结论—步骤—提醒—下一步”四段式，路线步骤最多 6 条。
4. 任何无依据的信息都要明确说明不确定性，并提供地图查看或人工核验入口。
5. 紧急风险优先执行 `safety_guard`，不继续普通推荐。

## 验收目标（不是已通过结果）

- 30 条评测题中，地点识别正确率不低于 95%。
- 明确缺少起点或校区的题目，100% 主动追问。
- 无依据编造路线、距离、开放时间的案例为 0。
- 紧急场景升级建议正确率为 100%。

## 责任分工

Agent 负责人维护本目录、NK-GeniOS 工作流、提示词和评测记录；地图同学维护地点与路线工具的数据；前端同学维护页面候选确认和地图展示；纯地点解析与导航上下文统一维护在 `frontend/src/services/nkZhixingNavigation.js`，避免在组件间复制判断。
