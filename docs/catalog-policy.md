# 资料取值与共享数据

网站、SQLite API、搜索工具和培养计算共用采用后的数据版本。前台只展示采用值和引用来源，来源之间的不同说法不作为产品提示。

## 默认取值规则

`data/source-policy.json` 配置来源与证据优先级；`scripts/catalog-resolution.cjs` 统一执行。优先级用于默认选择，并不表示某个网站的每条记录都准确。

1. 经编辑确认的覆盖值、直接游戏画面证据优先于站点的默认顺序。
2. 同一事实有多份资料时，综合结构化专表、信源优先级、显式置信度和不同域名的一致性选择一个值。平分时按日期、URL和序列化值确定稳定结果。
3. 没有候选值时保持缺失；不借用其他角色的学习等级，不推算缺少的起始面板。
4. 来源优先级按字段类型设置。中文命名和游戏机制可使用不同的来源配置。

通用 `selectFact()` 可供其他资料导入使用；它不执行网络请求，不按数据说明中的文字指令行事。

## 技能的一处定义

- 技能实体以 `abilities[].id` 标识。`description` 和 `parameters` 是统一采用的效果与基础参数，`canonical` 保存所用来源。
- `descriptions` 保留单项兼容形式，不存放互相竞争的展示版本。
- `learning` 的每条记录通过 `abilityId` 关联实体。效果、数值由构建流程同步，角色、等级、专精和习得方式仍是该角色自己的条件。
- 不同角色、不同职业或不同获取方式是不同上下文，不能合并成全角色共用的门槛。同一上下文只发布一条采用记录。
- 个人技能与职业熟练效果同步引用共享实体。推荐判断是独立的编辑建议，不改变事实值。

更改一个已有技能的效果时，在该技能的 `descriptions` 中补充带来源的候选，或提供经确认的 `canonical` 覆盖证据；不要分别修改各角色的效果副本。只有新增技能时，才需要先补相应实体或用 `build-abilities.cjs` 创建索引。

## 构建与检查

```sh
node scripts/build-catalog.cjs
node scripts/verify-catalog-resolution.cjs
node scripts/verify-site.cjs
```

构建先读取 SQLite，执行统一取值，将采用结果写回 SQLite，再生成页面使用的数据包。重复构建必须得到相同结果。构建时选择过的不同候选自动保存在 `data/research/catalog-selection-history.json`；显式核对可另用：

```sh
node scripts/resolve-catalog.cjs --report data/research/catalog-selection-review.json
```

研究记录不进入前台资料包。资料来源页保留正常引用目录；技能速览、详情、角色表、职业奖励、搜索及模型查询只读取采用版本。未知条件保留内部状态，用于限制推荐和计算，不因去掉前台编辑提示就被当作已验证条件。
