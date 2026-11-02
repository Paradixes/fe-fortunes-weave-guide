# 全63角色评级与策略复核（2026-11-02）

## 范围与判断方式

本轮覆盖全部63名角色，包括重新交叉检查此前27名重点候选。评级是编辑判断，不是实机测得的通关排名；比较常规投入下的有效职责、入队窗口、职业权限、独特性与替代性。不按用户是否选择角色调档，也不为保持档位人数而强留低档。

学习、技能效果、成长、基础属性和招募事实保持原基线。唯一结构性事实修复是库拉普卡正式加入后固定卫士（canChangeClass=false、fixedClass=卫士），依据Game8、Altema与HyperWiki；竞技场训练权限未因此推断。

## 相对上一部署的评级变化

|角色|原评级|复核评级|
|---|---|---|
|奇洛伊卡|A|A+|
|杨界|B|A|
|马吉迪|C|A-|
|伊欧|A-|A|
|西提司|B|A+|
|波拿帕尔特|A-|A|
|托比亚斯|A|A+|
|努蒂奴|B|A+|
|大刀|B|A-|
|易尼奥尼|A-|A|
|莉利安|A-|A+|
|希蒙|B|A|
|札可捏|C|B|
|班迪兹|B|A|
|佩佩|B|A-|
|迪雅各|B|A|
|杰斯塔|A-|A|
|齐利科|S-|A+|
|内森|A-|A+|
|库拉普卡|B|A-|
|塔霍尼雅|B|A-|

其余42名保留档次，但逐人核查并改写了定位、限制、投入建议和推荐动作。全部人物均有独立理由与资料来源。新增传送/救出不会自动升S；明确训练适性、初始熟练度未知、行动/次数消耗、任务窗口和转职放弃的收益。

## 实现与语义修正

- 独立投入建议实际进入运行时评级面板，不再被旧通用文案覆盖。
- 可点击备选使用真实分支终点；晚期低阶功能职只作资格接续，不被原最上级尾节点吞掉。大刀冻结分支确实落在主教，盛托利翁白C救出分支落在牧师且不预设回练等级。
- 米迦艾拉在迪托利希线明确走步行弓补远程，终局缺坦再选重装斧；不虚报同一人同时提供两种职业覆盖。
- 努蒂奴未解锁骑法前按地面白魔支援，不提前计骑乘穿越。
- 圣枪师允许枪和白魔；贤士不允许黑魔，瓦尔基里姆不允许剑拳，舞者不施黑白魔。
- 秘传·血牙、哈姆辛、守护尖刺等错误武器/效果描述已移除或纠正。穆主攻不再推荐留敌人1HP的活人拳。
- 未核学习条件的动作保留在资料候选，不冒充已确认配装；固定角色按已证实权限限制编辑器，保存的用户方案不被自动覆盖。
- 重新检查全部既有职业备选，修正黑白魔混用、战象权限叠算、未证成长翻倍，以及仅因外站推荐而强加转职的文案。

## 证据与未决项

- **奇洛伊卡：脱离射击威力**。目录+5与当前角色页-5有正负号冲突；本次不推荐该技，也未改事实。 https://game8.jp/fe-banshisenko/816460
- **哪吒：力量成长**。目录45与当前角色页55不一致；保留目录值，不据单站覆盖或据此加档。 https://game8.jp/fe-banshisenko/816439
- **盖茨：招募窗口**。第4章为出现时间；实际招募另需第12章以后正式赛败退等前置，不以早出现当长培养窗口。 https://game8.jp/fe-banshisenko/816432
- **莱桑达：叠层持续时间**。目录部分技能的“战斗结束”与日文“地图结束”译法不一致；策略明确本图叠层，未改原始说明。 https://game8.jp/fe-banshisenko/816427
- **托比亚斯：学习表完整性**。在线表另列弓A乱射，当前目录未收录；未加入推荐或据此抬档。 https://hyperwiki.jp/fefw/character/ch29/
- **努蒂奴：学习表完整性**。在线表另列指挥B穿越号令，当前目录未收录；本次仅依已有穿越个人能力和已知白魔评价。 https://hyperwiki.jp/fefw/character/ch33/
- **索绯雅：远疗与圣愈等级**。视频转述与目录A/B顺序冲突；沿用目录，评级不依赖该争议顺序。 https://www.bilibili.com/video/BV17XnU69EZp/
- **爱娜特莉亚：黑魔学习等级**。视频作者说明部分等级为自行排布；不以视频重写现有学习事实。 https://www.bilibili.com/video/BV1s2x66WE58/
- **库拉普卡：planning.summary/final/routes/build; database.characters plan/arena**。适用第三部正式加入后的推荐上下文；Game8更新2026-10-31、Altema2026-10-09、HyperWiki2026-11-02工具更新均指固定。没有逐版本实机验证；不得扩大成任何未来版本绝对不能转职。设施训练权限未从这些页面单独证实。 https://game8.jp/fe-banshisenko/817240 https://altema.jp/febansisenkou/kurapuka https://hyperwiki.jp/fefw/growth-tool/
- **库拉普卡：joinDetails**。Game8仍写可能性，不能改成已确定必要条件；保持路线条件待核。 https://game8.jp/fe-banshisenko/817240 https://altema.jp/febansisenkou/kurapuka
- **齐利科：learning.combatArts/learnedSkills**。可确认目录不完整，不能从网页显示推定学习等级。 https://game8.jp/fe-banshisenko/816910
- **特洛伊亚：joinDetails scope**。策略明确缺席窗口，不能把45级武僧算第一二部核心；未修改原始加入事实。 https://game8.jp/fe-banshisenko/816478

## 覆盖索引

每条包含评级、具体理由、限制、投入目标、推荐动作与分支；完整机器可读记录见 `data/research/strategy-rating-review-2026-11-02.json`。

|角色|评级|主定位|角色依据|
|---|---|---|---|
|凯伊|S|机动攻坚／专属范围输出|https://game8.jp/fe-banshisenko/816414|
|古扎岚|A+|低门槛近战主力|https://game8.jp/fe-banshisenko/816440|
|迪托利希|S|专属位移控制／物理攻坚|https://game8.jp/fe-banshisenko/816415|
|奇洛伊卡|A+|弓系多击／异常追击|https://game8.jp/fe-banshisenko/816460|
|绯亚娜|A|高魔力法术／救出备选|https://game8.jp/fe-banshisenko/816456|
|赛奥朵拉|S-|指挥支援／专属物理攻坚|https://game8.jp/fe-banshisenko/816416|
|索绯雅|A+|稳定远程治疗|https://game8.jp/fe-banshisenko/816448|
|蕾达|S|再行动 / 高速支援|https://game8.jp/fe-banshisenko/816417|
|卡塔妮雅|A+|高速飞行或传送支援|https://game8.jp/fe-banshisenko/816442|
|杨界|A|低门槛远程治疗|https://game8.jp/fe-banshisenko/816446|
|马吉迪|A-|单击斧输出／传送功能分支|https://game8.jp/fe-banshisenko/816459|
|妮涅|A+|对魔支援／机动治疗|https://game8.jp/fe-banshisenko/816437|
|哪吒|A+|先攻剑系输出／拳系定身|https://game8.jp/fe-banshisenko/816439|
|努佐|A+|高速特效剑士|https://game8.jp/fe-banshisenko/816462|
|亚历珊德拉|A|现成飞行补位|https://game8.jp/fe-banshisenko/816445|
|皮特鲁|S-|远射程物理／减移动控场|https://game8.jp/fe-banshisenko/816419|
|媞雅拉|A+|双魔指挥 / 舞位备选|https://game8.jp/fe-banshisenko/816418|
|伊欧|A|骑兵先攻突击|https://game8.jp/fe-banshisenko/816441|
|哥莱亚斯|A|重装守线／相邻压制|https://game8.jp/fe-banshisenko/816453|
|丹提|A|冻结控制／远程法术补位|https://game8.jp/fe-banshisenko/816433|
|盖茨|A-|晚入队物理补位／救出分支|https://game8.jp/fe-banshisenko/816432|
|艾丝梅拉尔达|S-|远距投枪攻坚／物理防线|https://game8.jp/fe-banshisenko/816422|
|法毕欧|A+|暗法破防／范围必杀支援|https://game8.jp/fe-banshisenko/816421|
|诺克裘拉|A|均衡斧拳主力|https://game8.jp/fe-banshisenko/816447|
|罗蕾塔|A+|高速回避／飞行或救出分支|https://game8.jp/fe-banshisenko/816451|
|西提司|A+|白魔传送／短程救援或枪系前排|https://game8.jp/fe-banshisenko/816450|
|波拿帕尔特|A|开局双魔／沉默支援|https://game8.jp/fe-banshisenko/816424|
|托比亚斯|A+|低投入重装／斧战技攻坚|https://game8.jp/fe-banshisenko/816425|
|哈尔温|A-|骑弓精准补位／白魔控制备选|https://game8.jp/fe-banshisenko/816457|
|沙兰|A+|位置调整／救出与群疗辅助|https://game8.jp/fe-banshisenko/816438|
|巴卡尼亚|A|低投入物理防线|https://game8.jp/fe-banshisenko/816428|
|西洛可|S-|双魔输出 / 群疗传送|https://game8.jp/fe-banshisenko/816429|
|穆|S|长窗口物理核心／可选传送|https://game8.jp/fe-banshisenko/816431|
|奥琳琵娅|S-|控制法术／魔法输出|https://game8.jp/fe-banshisenko/816430|
|米迦艾拉|A|贴身斧前排／物理防线|https://game8.jp/fe-banshisenko/816423|
|努蒂奴|A+|穿越骑兵／白魔救出|https://game8.jp/fe-banshisenko/816443|
|大刀|A-|低速斧重装／单击补位|https://game8.jp/fe-banshisenko/816455|
|易尼奥尼|A|高力量弓战技|https://game8.jp/fe-banshisenko/816463|
|嘉丝敏|A|重装反击防线|https://game8.jp/fe-banshisenko/816461|
|莉利安|A+|低门槛弓控场／精准输出|https://game8.jp/fe-banshisenko/816426|
|莱桑达|A|早期枪骑／机动清场|https://game8.jp/fe-banshisenko/816427|
|希蒙|A|剑斧物理主力备选|https://game8.jp/fe-banshisenko/816435|
|札可捏|B|高命中斧系／残血收割|https://game8.jp/fe-banshisenko/816458|
|班迪兹|A|战车限定远程输出|https://game8.jp/fe-banshisenko/816444|
|露露蒂雅|A|主动追击／高速剑枪|https://game8.jp/fe-banshisenko/816454|
|佩佩|A-|高速残血收割|https://game8.jp/fe-banshisenko/816449|
|迪雅各|A|均衡物理／追击补刀|https://game8.jp/fe-banshisenko/816436|
|乌修拉|A+|剑弓输出 / 道具支援|https://game8.jp/fe-banshisenko/816434|
|杰斯塔|A|高速剑士／白魔控制备选|https://game8.jp/fe-banshisenko/816452|
|乌尔坦德|A|近身护队／指挥辅助|https://game8.jp/fe-banshisenko/816420|
|齐利科|A+|高速剑骑即战力|https://game8.jp/fe-banshisenko/816910|
|内森|A+|物理骑枪／传送分支|https://game8.jp/fe-banshisenko/816909|
|欧露赫露|S|耐久白魔核心／专属攻坚|https://game8.jp/fe-banshisenko/816884|
|谭利穆恩|S-|专属削弱 / 双魔支援|https://game8.jp/fe-banshisenko/816883|
|贝特兰|A+|后期专属强化物理|https://game8.jp/fe-banshisenko/816882|
|爱娜特莉亚|S-|黑魔爆发 / 传送备选|https://game8.jp/fe-banshisenko/816885|
|盛托利翁|A|首次受击减伤／现成重装|https://game8.jp/fe-banshisenko/816877|
|库拉普卡|A-|终章枪系防守补位|https://game8.jp/fe-banshisenko/817240|
|救世主|S|第三部机制核心／专属范围攻坚|https://game8.jp/fe-banshisenko/816479|
|红花|S-|救出墙法 / 双魔支援|https://game8.jp/fe-banshisenko/816477|
|特洛伊亚|A+|现成拳白魔双职责|https://game8.jp/fe-banshisenko/816478|
|亚丝望|A-|晚加入弓即战力|https://game8.jp/fe-banshisenko/816902|
|塔霍尼雅|A-|固定拳职晚期即战力|https://game8.jp/fe-banshisenko/816903|
