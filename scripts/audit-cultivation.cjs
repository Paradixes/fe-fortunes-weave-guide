// Historical JSON migration. Import its output explicitly with catalog-db.py import before building SQLite.
const fs=require('fs'),path=require('path'),assert=require('assert');
const file=path.resolve(__dirname,'../data/catalog.json'),d=JSON.parse(fs.readFileSync(file,'utf8'));
const L='レダ',K='カイ',D='ディートリヒ',T='セオドラ';
const briefs=[
 ['骑乘枪系攻坚','力量决定枪伤害，速度决定攻速；移动力优势用于有效出手，不把全骑乘技能同时练满。','枪术输出与骑乘资格优先；白魔只补终局实际使用的功能。'],
 ['剑／拳物理输出','力量45、速度50，有双物理武器适性；第二成果应补力量或指定格斗能力，不为了凑方向练苦手黑白魔。','剑系主养足够通关；力量或格斗有缺口才开第二方向。'],
 ['剑系攻坚与战技','力量45、速度50，剑系与本线强化战技优先；力量不足时同线土匪补养即可，不存在四线招募分工。','先取得本线剑系战技；不将剑客误写成力量成长职业。'],
 ['弓系高速输出','速度55、力量40，弓伤害与安全射程是主职责；需要补的是实际伤害，不是重复一份弓术经验。','单线弓系主养；力量不足才短修，马术只为弓骑终点。'],
 ['高魔力黑白魔','魔力55、速度30，黑白魔功能可在允许两者的法职中一起训练；速度／生存不足才补第二份成果。','魔法一方向为核心，不默认物理主养；终局黑魔和白魔职业需按可用技能切换。'],
 ['枪系前排与辅助','力量50、防御40，枪伤害与可靠承伤优先；概率减伤不能代替稳定防御。','本线枪系主养，重装或白魔是职责分支，不分配不存在的其他第一部路线。'],
 ['专职治疗','治疗量加成是核心；力量、技巧不能增加治疗次数，擅长弓也不意味着必须培养成狙击手。','默认一条白魔线，魔力和生存够用就停；仅兼任攻击时补负重或输出。'],
 ['再行动与高速辅助','再行动优先于伤害；速度65是生存与兼任弓输出的基础，不强制把力量魔力刷满。','舞者资格与安全站位优先，弓输出／力量只在需要兼任杀敌时追加。'],
 ['高速剑枪／飞行输出','力量35、速度55，力量同时服务物理伤害和负重；个人疾风还要求攻速领先。','两方向：早入队补力量，凯伊飞行速度；魔法剑和重装均为条件支线。'],
 ['白魔治疗与斧系备选','魔力40，低门槛补治疗有实际价值；斧术适性不等于要另占一条高投入物理线。','先完成各线缺少的治疗；只有明确兼任斧输出才补力量。'],
 ['高力量斧拳输出','力量50、速度20，优先单击／战技伤害与生存，不把低速角色强行养成高速追击手。','一条力量输出线；速度补养只在能改变具体战斗结算时选择。'],
 ['枪系输出兼白魔','力量45、魔力35、魔防45，圣枪师的枪伤害与白魔功能有真正互补价值。','白魔／魔力与物理枪系两方向；纯治疗可只养白魔，不默认再开重装线。'],
 ['剑拳先攻输出','力量55、速度45，先攻特性与物理伤害相配；单线成型后只补所需拳剑战技。','默认一方向；缺攻速再转剑职，已有力量成果不重复刷同一武器经验。'],
 ['高速剑拳输出','力量50、速度55，双核心成长较好；主要补命中、生存与选定武器能力，不需要四种属性分线。','单线物理即可；弓或格斗只在终局使用时补资格。'],
 ['飞行剑枪机动','力量35、速度55，飞行与力量互补；各线入队窗口不同，晚招募不能假定还有完整低级成长阶段。','凯伊飞行主养；另一线补力量是可选，剑系熟练按需要短修。'],
 ['弓系远程输出','开局远程职责和弓适性比后期补修更优先；力量35需要检查弓伤害，不能仅看攻速。','一条弓系主养；力量不足才短修，不重复培养四个弓手成果。'],
 ['黑白魔与指挥','魔力45、速度35，法术功能与指挥优先；额外物理线只有负重或明确混合输出收益才投入。','默认法术一方向，白魔功能在可用法职中同步取得。'],
 ['枪骑机动','枪斧马适性与骑乘个人收益相配；力量40、速度35，先满足枪伤害和机动，不因凯伊捕获就迁走本线职责。','一条枪骑方向，物防或力量只补实际缺口。'],
 ['重装物理防线','力量60、防御50、速度15，优势是守线与高伤害反击；剑客速度成长不能抹掉低速定位。','重装一方向；不默认再开完整剑系速度线。'],
 ['黑白魔支援','魔力45、速度40，治疗与攻击可同线取得；低物防需要安全站位，不能靠无限力量补养解决。','一条法术方向，按队伍缺口选黑魔或白魔终点。'],
 ['枪斧骑乘前排','力量50、防御45，骑乘输出与承伤有基础；只能在迪托利希线培养，不能分配其他线补修。','一条枪骑／重骑方向，重装仅为承伤需要切换。'],
 ['枪斧重装防线','力量55、防御45，重量减轻个人能力降低专门补体格的紧迫性；力量仍直接影响伤害。','一条重装主养；机动需求才考虑骑乘资格，不强练剑系速度。'],
 ['攻击黑魔核心','魔力50、黑魔适性服务破防；两条可招募线应择主养，不能将重复黑魔经验当额外收益。','默认迪托利希开局法师；蕾达线只在本线缺法术或能补实际短板时投入。'],
 ['拳斧近战输出','力量45、速度45，格斗／斧伤害与命中是核心；不为职业数量把剑法骑重全部均摊。','物理一方向，格斗与斧按终局武器选择。'],
 ['剑系／飞行输出','力量35、速度55，与卡塔妮雅同样需要物理伤害；但个人技能、入队声望不同，不能复制全部路线。','本线剑／飛行职责先完成；第二份力量成果按实际窗口补。'],
 ['枪斧机动前排','力量45、防御40，枪斧飞行适性支持机动；物理地面与飞行属性重叠，第二线须有独立能力收益。','默认一条机动输出，飞行是终局职责备选，不硬开法师线。'],
 ['持剑黑魔输出','剑黑白魔与马术适性支持混合战术；但只能在赛奥朵拉第一部培养，互补应同线换职而非虚构多线。','黑魔主养，剑术与白魔按终局用途补；需要物理剑输出才短修力量。'],
 ['斧系重装防线','力量60、防御45、速度25，战技伤害与承伤匹配；只能本线培养，不虚构跨线融合。','重装一方向，力量足够时优先有效战技与生存。'],
 ['弓骑远程','弓马适性支持远程机动，力量35需要补伤害；骑乘资格和实际伤害到位后无需重复弓系培养。','弓系一方向；力量短修只在能改善击杀时选择。'],
 ['白魔与魔防支援','魔力45、魔防45，白魔功能是主价值；剑术不擅长，魔法剑不能只凭魔力高就列必修。','默认一条白魔线；另一可入队线仅补具体法术／熟练或生存，魔剑为低优先条件方案。'],
 ['重装枪斧防线','力量50、防御45与固定减伤服务承伤；物防成果已好时，另一条相同重装线没有必然收益。','蕾达重装主养；骑乘或魔防补修要有具体用途，不默认补剑客。'],
 ['剑黑白魔混合输出','力量与魔力均40，既要物理剑伤害，也要法术破防；两份成长成果互补，白魔功能可在法职同练。','两方向：蕾达法术＋赛奥朵拉力量剑；凯伊骑宠仅在能提高魔力成果时补。'],
 ['格斗／剑系物理核心','力量、速度、技巧均50，单线已经全面；剑系速度成果有用途，但格斗勇士与斧勇士不是两份必要力量培养。','默认一方向，攻速或剑系能力不足才加第二方向；不默认白魔或重装主养。'],
 ['攻击魔法兼治疗','魔力50、速度35，魔法必杀个人能力可用于输出，不应只当奶妈；黑白魔功能可以同线取得。','法术一方向为核心，速度／生存第二份成果按实际不足补；斧系非必修。'],
 ['步行弓系输出','力量45、防御40、弓步兵适性，足以单线发挥远程作用；骑飞苦手不应为了统一机动强转。','一条步行弓方向，力量或弓战技按实际缺口补。'],
 ['斧骑／飞行混合候选','力量40、魔力30，斧黑魔马飞行适性只是入口，不足以证明第二条法师主养划算。','先养斧系机动；黑魔仅在确认所需法术或魔法武器收益后选，不默认双线满养。'],
 ['高力量斧系前排','力量55、防御45、速度30，伤害与承伤比追击更稳定；不为高速度职业名额复制培养。','一条力量／防御方向，明确需要追击阈值才补速度。'],
 ['斧弓物理输出','力量50、速度35，斧弓能力可在一线训练，独立技能并不需要独立满级存档。','一条物理主养，按终局远近武器分配训练。'],
 ['枪斧防御前排','防御45、力量40、速度30，优先可靠承伤与武器伤害；马术不是擅长，不默认投入全套骑乘。','一条防御／物理方向；机动仅在资格资源够且确有需求时追加。'],
 ['步行远程压制','弓步兵适性与无反击命中收益相配；力量35需要检查弓伤害，速度40不强求所有敌人都追击。','单线弓系主养，力量副职按实际伤害短修。'],
 ['枪斧骑飞机动','力量40、速度50，地面骑兵与飞行都是物理；新增方向须提供不同成长或明确技能，不能仅换移动图标。','赛奥朵拉剧情主养；凯伊骑宠是条件补养，不默认再开法术方向。'],
 ['剑斧物理输出','力量50、防御40、速度35，力量不缺时补速度比重复勇士更有用；剑斧可同线培养。','一条主养，攻速不足才用剑客／侍道补速度。'],
 ['剑斧备选输出','力量30、速度35，必须核对投入后的实际伤害；即使擅长多武器也不值得默认多线主力。','偏好使用才定向补力量，一条成型线优先，不投入四线补全。'],
 ['弓系与指挥支援','力量35、速度35，弓与指挥功能比追击面板更明确；马术为弓骑资格服务。','一条功能输出方向，力量只补实际弓伤害。'],
 ['高速剑系输出','速度55、力量35，最需要补的是物理伤害与负重；已有高速优势不代表应无限叠速度。','力量主养与剑系速度可互补，已有足够攻速时一条力量线就够。'],
 ['高速剑弓输出','速度60、力量30，输出短板是力量；技能资格和速度优势不能替代每击伤害。','优先一条力量线；剑弓功能短修，不默认另一条完整速度线。'],
 ['剑弓步兵输出','力量40、速度45，物理基础均衡；另一线需要明确伤害／能力收益，不按武器种类机械拆线。','一条物理主养，弓技能仅在终局装备弓时补。'],
 ['剑弓道具辅助／舞者候选','力量35、速度50，输出玩法需要力量，辅助玩法优先剑弓资格与安全；魔力35不是法师必修理由。','功能一方向；需要主输出才加力量格斗，蕾达线不可招募。'],
 ['高速剑弓输出','速度60、力量35，力量影响伤害和负重；再养同样高速剑职未必新增有用成果。','力量一方向优先，剑弓资格和熟练按终局所需补。'],
 ['圣枪师前线治疗','力量魔力均40，魔力／白魔与力量／物防互补；不擅长剑且无远程治疗，不套雷电剑奶妈模板。','两方向：魔法治疗＋枪系物理耐久；不默认第三条飞行。'],
 ['后期骑乘即战力','入队后先检查已有枪骑能力与武器伤害，不倒回第一部造多线培养窗口。','现有主职一方向，缺哪个终局资格就补哪个。'],
 ['后期骑乘即战力','共通后期入队，已有力量、速度与资格比初级职业成长更重要。','一方向补终局骑乘职责，不虚构第一部四线主养。'],
 ['恢复与慢速承伤','速度极低且不能转骑飞，按治疗／承伤用，不按追击输出标准强练力量或速度。','后期一方向，白魔功能与可靠生存优先。'],
 ['后期剑黑魔输出','剑黑魔适性允许混合，但融合窗口不等于普通四线招募；先使用既有法术和职业。','一方向接续黑魔，只有实际物理剑用途才补力量。'],
 ['后期剑斧拳输出','多物理适性与概率追击提供即战力；概率能力不能替代稳定伤害和必要攻速。','后期一条物理方向，终局选定武器后补对应能力。'],
 ['后期格斗黑魔输出','黑魔与格斗适性支持选择不同武器，但晚加入不应回练四份基础属性。','法术主养；格斗备选需核对力量与武器，不因适性自动双修。'],
 ['后期重装防线','敌阶段首次减伤服务承伤，后续战斗仍需物防魔防；枪斧重装适性比骑乘模板更贴合。','按已有重装能力接续，力量服务反击伤害，非四线补修。'],
 ['终战枪白魔前排','第六区分才加入，地图内防御叠加不是永久成长；以已有等级与枪白魔资格发挥即战力。','直接检查终战装备与白魔可用性，不安排前期职业回练。'],
 ['第三部枪系核心','周围冥府加护失效的独特功能优先，力量与生存服务该职责；不存在普通四线招募。','现有枪系核心一方向，指挥和装备按第三部队伍需要补。'],
 ['黑白魔命中支援','魔法命中个人能力直接服务法术；共通／序幕角色不套第一部声望主养分工。','黑白魔同线取得，终局按职业可用技能选择。'],
 ['拳与黑白魔备选','拳命中个人能力有物理用途，法术适性提供选择；是否混合由现有力量魔力和终局职责决定。','选一个主输出方向，另一武器只在有明确收益时补，不默认全满。'],
 ['后期弓系压制','弓命中优势适合远程即战力；第五区分加入后，优先装备与弓资格而非重练低阶。','一条弓系方向，力量影响伤害，指挥按终战功能补。'],
 ['后期格斗战技输出','拳套战技概率追击服务多击伤害，力量仍影响每击；不能把概率追击当稳定追击。','后期格斗一方向，已有格斗资格优先，不额外硬练剑法骑。']
];
assert.equal(briefs.length,63);
const types={
 strength:{label:'力量／物理伤害',initial:'斗士',mid:['土匪'],upper:['勇士'],focus:'剑术 / 力量 / 物理伤害',why:'土匪力量成长＋15、勇士＋20；剑C→B可以接续，力量既增加物理伤害，也可能通过体格改善负重。剑客力量修正为0，不是力量补养主选。',stop:'目标武器伤害与攻速均达标后停止；抵消重量不等于物理伤害已足够。'},
 sword:{label:'剑系速度与熟练',initial:'猎兵',mid:['剑客'],upper:['侍道'],focus:'剑术 / 速度 / 技巧',why:'剑客与侍道速度成长＋15、技巧＋10，沿剑C→B取得剑系能力；用于追击、避免被追击或所需熟练，不承担专门补力量。',stop:'所需攻速与剑系能力取得即可；已有更好的速度成果就不再完整主养。'},
 fist:{label:'力量与格斗',initial:'斗士',mid:['斗拳手','土匪'],upper:['勇士'],focus:'格斗术 / 力量 / 物理伤害',why:'斗拳手用格斗C接续实战，兼顾速度与防御；土匪力量更高但需剑C或斧C。勇士沿格斗B接续，提高每击物理伤害。',stop:'格斗伤害、命中与攻速满足职责就停；不再另开同样勇士的斧系力量主养。'},
 magic:{label:'魔力与黑白魔功能',initial:'诅咒师',mid:['萨满巫师','牧师'],upper:['先知','主教'],focus:'黑魔术 / 魔力 / 白魔术',why:'萨满巫师与先知偏魔力成长，仍允许白魔训练；牧师与主教服务治疗／魔防。黑白功能可同线完成，不按技能名字拆两份满级培养。',stop:'实际使用的法术、魔力与资格完成即停；换职后须重新检查黑白魔是否可用。'},
 white:{label:'白魔功能与魔力',initial:'诅咒师',mid:['牧师','萨满巫师'],upper:['主教','先知'],focus:'白魔术 / 魔力 / 魔防',why:'牧师→主教沿白魔C→B服务治疗与魔防；萨满／先知只有在攻击法术或更高魔力成长有用途时选择，不能给纯治疗者强加物理输出。',stop:'核心白魔功能、治疗量与生存到位即停；治疗不会因攻速变成两次。'},
 wing:{label:'飞行速度与机动',initial:'猎兵',mid:['天翼兵','剑客'],upper:['驭龙兵','侍道'],focus:'枪术 / 飞行术 / 速度',why:'天翼兵取得飞行机动，凯伊线可用飞马友好成长补速度与魔防；驭龙兵需要对应龙宠与枪B或斧B，不能直接沿用天马。无龙宠时剑系侍道为地面速度备选。',stop:'飞行资格、实际攻速及必要枪技到位即停；骑宠临时面板不当成永久融合成果。'},
 mountedWhite:{label:'移动白魔与骑宠',initial:'诅咒师',mid:['牧师'],upper:['游唱诗人','主教'],focus:'白魔术 / 马术 / 魔力',why:'牧师完成白魔C，游唱诗人沿白魔B＋马D提供移动黑白魔；骑宠成长可带来不同属性成果，主教是无对应骑宠时的治疗备选。',stop:'移动治疗、必要白魔与生存够用就停；若与主养成果相同且无更高属性，不重复升级。'},
 lance:{label:'枪系物理与骑乘',initial:'飞鸵兵',mid:['轻骑兵','土匪'],upper:['荣光骑士','勇士'],focus:'枪术 / 马术 / 力量',why:'轻骑兵→荣光骑士沿枪与马术衔接，保持枪系实战和机动；力量修正不如勇士，但无需为了补力量另练剑斧。土匪／勇士只在伤害不足且愿意额外准备剑斧资格时选，且不能持枪。',stop:'枪系伤害、骑乘资格与生存到位即停；无法杀敌时再考虑力量副职。'},
 defense:{label:'物理防御补养',initial:'士兵',mid:['重装步兵'],upper:['巨型重甲兵'],focus:'枪术 / 重装术 / 防御 / 力量',why:'重装步兵防御成长＋25、巨型重甲兵＋30，并有力量成长，服务终局承伤及反击；速度负修正明显，必须由另一份成果提供速度。',stop:'计划承受的物理攻击可存活即可；不打前排或已有足够物防就跳过。'},
 petMagic:{label:'骑宠魔力条件补养',initial:'诅咒师',mid:['萨满巫师'],upper:['神鸵兵','先知'],focus:'黑魔术 / 马术 / 魔力 / 技巧',why:'神鸵兵需黑魔B、马D及凯伊声望7稽古解锁；对应魔法骑宠的成长修正有机会超过普通法师成果。无合适骑宠或剩余升级太少时先知接续，不把重复黑魔经验当收益。',stop:'只有实际魔力／技巧等成果高于已养版本才有融合价值，否则停止；神鸵兵不可用白魔。'}
};
// Explicit assignments, never "one weapon = one complete route".
const assignments={
 c1:[[K,'sword',true],[L,'fist',false]],
 c6:[[T,'white',true],[K,'mountedWhite',false]],
 c8:[[L,'strength',true],[K,'wing',true],[D,'magic',false],[T,'defense',false]],
 c9:[[D,'white',true],[K,'white',false]],
 c11:[[K,'mountedWhite',true],[T,'lance',true]],
 c14:[[K,'wing',true],[L,'strength',false],[D,'sword',false]],
 c24:[[T,'sword',true],[L,'strength',false],[K,'wing',false]],
 c29:[[L,'white',true],[D,'magic',false]],
 c31:[[L,'magic',true],[T,'strength',true],[K,'petMagic',false]],
 c32:[[L,'fist',true],[D,'sword',false]],
 c33:[[L,'magic',true],[K,'mountedWhite',false],[T,'sword',false]],
 c44:[[L,'strength',true],[D,'sword',false]],
 c45:[[D,'strength',true],[K,'sword',false]],
 c47:[[D,'fist',true],[K,'sword',false]],
 c48:[[D,'strength',true],[K,'sword',false]],
 c49:[[K,'white',true],[D,'defense',true]],
};
const spellFinal={c6:'贤士',c11:'圣枪师 / 瓦尔基里姆',c29:'贤士',c31:'德鲁伊 / 高阶墓志铭',c33:'德鲁伊 / 贤士',c49:'圣枪师',c47:'神乐神将 / 探影者'};
const sources=['https://game8.jp/fe-banshisenko/816664','https://game8.jp/fe-banshisenko/816665','https://game8.jp/fe-banshisenko/816652','https://game8.jp/fe-banshisenko/816653','https://gamewith.jp/fefw/577319','https://game8.jp/fe-banshisenko/816429','https://game8.jp/fe-banshisenko/816442','https://game8.jp/fe-banshisenko/816434'];
function qualificationTargets(b,c){const targets=new Map(),ranks='EDCBAS';const rank=r=>ranks.indexOf(r[0])*2+(r.includes('+')?1:0);for(const name of [b.mid[0],b.upper[0]]){const cl=d.database.classes.find(x=>x.cn===name),any=cl.any.find(([s])=>b.focus.includes(s))||cl.any.find(([s])=>(c.good||'').includes(({剑术:'剣術',枪术:'槍術',格斗术:'格闘術',斧术:'斧術',弓术:'弓術'})[s]||s))||cl.any[0];for(const [s,r]of [...cl.must,...(any?[any]:[])])if(!targets.has(s)||rank(r)>rank(targets.get(s)))targets.set(s,r);}return [...targets].map(([s,r])=>s+r).join(' / ');}
function stageReason(cl,c,goal){const g=cl.growth,skills=cl.allowedSkills,physical=skills.some(s=>['剑术','枪术','斧术','弓术','格斗术'].includes(s));let text='';
 if(cl.cn==='土匪')text='力量成长＋15，剑或斧C可进入；补物理伤害比剑客直接，兼有生命与少量防御成长。';
 else if(cl.cn==='勇士')text='力量成长＋20，剑／斧／格斗B之一衔接；能使用剑斧拳，适合物理伤害与战技命中熟练，不是枪系职业。';
 else if(cl.cn==='斗拳手')text='力量＋10、速度＋10、防御＋10，格斗C衔接；相较土匪牺牲少量力量成长，换来格斗实战和更均衡成长。';
 else if(['剑客','侍道','刀剑将领'].includes(cl.cn))text=`速度成长＋${g.spd}、技巧＋${g.dex}，服务攻速与剑系熟练；力量修正${g.str>0?'＋':''}${g.str}，不能当作最强力量补养。`;
 else if(['重装步兵','巨型重甲兵','要塞'].includes(cl.cn))text=`防御成长＋${g.def}，用于计划承受的物理伤害；力量也服务反击，但速度修正${g.spd}，不适合直接作为高速输出唯一成果。`;
 else if(['萨满巫师','先知','德鲁伊'].includes(cl.cn))text=`魔力成长＋${g.mag}，服务攻击法术；${skills.includes('白魔术')?'可同时训练白魔功能，未必另开一线。':'本职业不能使用白魔，已学恢复法术要换允许白魔的职业施放。'}`;
 else if(['牧师','主教','贤士'].includes(cl.cn))text=`魔力＋${g.mag}、魔防＋${g.res}，白魔资格与恢复职责直接；${skills.includes('黑魔术')?'允许黑魔时可兼练需要的攻击法术。':'本职业不能使用黑魔，不能将黑白法术同时可用当作终局收益。'}`;
 else if(cl.cn==='圣枪师')text='枪与白魔共用的终局职责，物理力量成果和魔力成果均有用途；不使用剑、弓、黑魔，不将这些能力默认算进本職输出。';
 else if(['天翼兵','驭龙兵','圣天翼兵','飞龙将领'].includes(cl.cn))text='飞行机动与剑枪／斧攻击服务突击；成长需计入真实骑宠修正，天马与龙宠条件不同；飞行法术权限按本职核对。';
 else if(cl.cn==='游唱诗人')text='马D与黑／白魔B之一衔接，提供移动法术；不持剑枪，物理成果要在另一个允许武器的职业发挥。';
 else if(cl.cn==='神鸵兵')text='黑魔B、马D及凯伊特殊稽古解锁，配对应骑宠争取更高魔力／技巧；不可用白魔，不重复累计同技能EXP。';
 else if(/舞者|神乐/.test(cl.cn))text='再行动与行动效率是主要收益；先完成资格与安全，力量只在兼任物理输出时补，不为了再行动刷满伤害属性。';
 else if(cl.cn==='高阶墓志铭')text='持剑、黑魔与骑乘组合，适合混合战术；资格额外需要剑B、黑魔D、马D，且不能使用白魔，不自动优于德鲁伊。';
 else if(/弓箭|狙击|射手|森林|弓骑|探影|恶棍/.test(cl.cn))text=`${skills.includes('弓术')?'弓系远程与对应战技':'剑系探索'}服务职责；力量影响物理每击伤害，技巧／速度${g.dex}/${g.spd}修正不能替代力量。${skills.includes('马术')?'另需骑乘资格和可用骑宠。':''}`;
 else if(skills.includes('马术'))text='骑乘机动服务本线武器与职责；力量服务物理伤害，不能只按负重停止培养；没有骑宠条件时用地面备选。';
 else text=`${physical?'当前物理武器与伤害':'当前法术／辅助'}服务职责，成长修正：力量${g.str}、魔力${g.mag}、速度${g.spd}；资格和在职效果不等于永久属性。`;
 return {why:c.cn+'：'+goal+'。'+text,stop:physical?'目标武器伤害、攻速与必要生存均达标，或指定熟练取得后停止；同类成果不重复投入。':'所需法术／功能、实际输出或治疗量与生存到位即可，未使用的能力不强练。'};
}
for(const c of d.database.characters){const p=d.planning[c.id],brief=briefs[Number(c.id.slice(1))],oldPrimary=p.primary.primaryRoute;
 const [role,reason,investment]=brief;
 const rows=assignments[c.id]|| (oldPrimary?[[oldPrimary,null,true]]:[]);
 if(spellFinal[c.id])p.summary.end=spellFinal[c.id];
 // Remove plainly unrelated generic branches on specialist frontlines.
 if(['c18','c21','c27','c30','c36','c38','c56'].includes(c.id)){p.summary.mid=['重装步兵'];p.summary.upper=['巨型重甲兵'];p.summary.end='要塞';p.summary.focus=(['c18','c27','c36'].includes(c.id)?'斧术':'枪术')+' / 重装术 / 防御 / 力量';p.initial.name='士兵';}
 if(['c23','c54','c62'].includes(c.id)){p.summary.mid=['斗拳手','土匪'];p.summary.upper=['勇士'];p.summary.end='战斗将领';}
 if(c.id==='c10'){p.summary.mid=['土匪','斗拳手'];p.summary.upper=['勇士'];p.summary.end='战斗将领';}
 if(['c6','c29','c52'].includes(c.id)){p.summary.mid=['牧师'];p.summary.upper=['主教'];p.summary.end='贤士';}
 if(['c22','c55','c53'].includes(c.id)){p.summary.mid=['萨满巫师'];p.summary.upper=['先知'];p.summary.end='德鲁伊';}
 if(['c49','c57'].includes(c.id))p.summary.end='圣枪师';
 if(c.id==='c47'){p.summary.mid=['恶棍','弓箭手'];p.summary.upper=['森林骑士','侍道'];}
 const end=p.summary.end;
 const assigned=new Map(rows.map(([r,type,main])=>[r,{type,main}]));
 for(const [r,v]of Object.entries(p.routes)){const a=assigned.get(r),kind=a?.type&&types[a.type];
   const base=kind?{mid:[...kind.mid],upper:[...kind.upper],end,focus:kind.focus,goals:[kind.label,'终局有效成果'],priority:reason+' '+kind.why+' '+kind.stop}:{...p.summary,mid:[...p.summary.mid],upper:[...p.summary.upper],end,priority:reason+' '+investment};
   if(c.id==='c31'&&a?.type==='magic')base.focus+=' / 剑术';
   v.build=base;v.initial={...p.initial};
   if(kind){v.initial.name=kind.initial;v.initial.reason=`${kind.initial}只在入队等级尚有初级培养窗口时使用，服务${kind.label}；已高阶入队不回练低阶等级。`;}
   v.active=!!a;v.mode=a?(a.main?'主养':'条件补养'):'不重复投入';
   v.rule={label:a?(kind?.label||role):'不重复投入',goal:a?(kind?.label||role):'沿用已有成果，不新增培养方向',stages:[base.mid[0],base.upper[0],end],focus:base.focus.split(' / '),firstPartStop:a?'阶段资格：'+qualificationTargets(base,c)+'；'+(kind?.stop||investment):'本线不安排专门升级；已有能力能补本线战斗缺口时可临时上场。',reason:a?reason+' '+(kind?.why||investment):'此角色的主要终局成果已有更合适路线承担；没有独立属性或所需能力收益，不复制同职业／同技能经验。',thirdPart:investment+' 最终按当前职业可用武器／魔术和装备槽核对。',optional:!a?.main};
 }
 const primaryRoutes=rows.filter(x=>x[2]).map(x=>x[0]);
 p.primary={...p.primary,primaryRoute:primaryRoutes[0]||null,primaryRoutes,optionalRouteIds:rows.filter(x=>!x[2]).map(x=>x[0]),classification:!c.firstPart?'共通／后期单方向':primaryRoutes.length>1?'两方向主养＋按需补修':'单方向主养＋按需补修',analysis:investment,archetypes:[role]};
 if(primaryRoutes.length){const v=p.routes[primaryRoutes[0]];p.summary={...v.build,mid:[...v.build.mid],upper:[...v.build.upper]};p.initial={...v.initial};}
 p.final={...p.summary,mid:[...p.summary.mid],upper:[...p.summary.upper],end,priority:investment};
 const classes=[...new Set([p.initial.name,...p.summary.mid,...p.summary.upper,...end.split(' / '),...Object.values(p.routes).filter(v=>v.active).flatMap(v=>[v.initial.name,...v.build.mid,...v.build.upper])])];
 const classReasons=Object.fromEntries(classes.map(name=>{const cl=d.database.classes.find(x=>x.cn===name);assert(cl,'Missing class '+name);return [name,stageReason(cl,c,role)]}));
 const directions=rows.map(([r,type,main])=>({route:r,type:type||'main',level:main?'主养':'条件补养',label:types[type]?.label||role,reason:types[type]?.why||reason,stop:types[type]?.stop||investment,condition:main?'本线承担核心成果；成型后不继续均摊无关技能':c.id==='c9'?'本线需要低门槛治疗过渡；不当作另一份融合成长收益':'仅在已有成果未满足伤害、攻速、生存或明确能力需求时启用',classes:[p.routes[r].initial.name,p.routes[r].build.mid[0],p.routes[r].build.upper[0]]}));
 p.audit={reviewed:true,date:'2026-10-11',role,reason,investment,defaultDirections:({c8:'2',c11:'1–2',c31:'2',c49:'2',c32:'1–2',c47:'1–2'}[c.id]||'1'),directions,classReasons,success:{damage:/治疗|再行动/.test(role)&&! /输出|枪系|攻坚/.test(role)?'纯辅助不为物理伤害刷力量；兼任攻击另核算':'力量服务物理每击伤害；魔力服务法术／明确魔法攻击战技，按实际武器检查杀敌要求',speed:'按实际装备负重与目标敌人检查追击、被追击及个人技能阈值，不虚构统一毕业速度',survival:'按计划承受的物理／魔法攻击检查生命与双防，后排不默认完整重装主养',skills:'所需战技、特技、法术与职业权限达标即停，同技能EXP取最高，不相加'},sources:[c.url,...sources.slice(0,4)].filter(Boolean)};
 c.plan=investment;c.alt=investment;c.growthNote=reason;c.stop='阶段资格：'+qualificationTargets(p.summary,c)+'；'+p.audit.success.skills;
 if(c.id==='c49')c.gearIds=['heal','magic_staff','aurora_lance','sorel_lance','slender_spear'];
 if(c.id==='c47')c.gearIds=[...new Set([...c.gearIds,'daminafist','daminasword'])];
 // Route summaries and combat learning recommendations remain derived from the same plans.
}
d.crossRoutePolicy.strength='力量首先影响物理每击伤害，其次通过体格／负重影响攻速。物理角色以目标伤害＋攻速共同决定停止线；抵消重量不等于伤害够用。优先让有实际升级窗口的路线养力量，不让纯治疗为物理伤害强转。';
d.crossRoutePolicy.fusion='基础属性逐项取高；同一技能EXP取最高，不相加。不同路线已学有效能力可互补，但必须检查终局职业、武器条件与装备槽。在职属性和骑宠临时面板不算永久融合成长，不默认四线全满。';
d.crossRoutePolicy.healer='纯治疗每条指令治疗一次，攻速不增加治疗次数，不为此专养力量；兼任物理输出时力量同时服务伤害与负重，攻击法师则另看法术攻速与实际负重。';
d.crossRoutePolicy.defense='防御补养只在终局确需承受物理攻击时启用。重装＋25 → 巨型重甲＋30需实际升级，训练职业／技能EXP不等于属性成长；晚加入仍须核对剩余升级空间，不默认占一条完整主养线。';
d.cultivationAudit={version:1,date:'2026-10-11',count:63,basis:'编辑建议：以终局有效伤害、攻速、生存和功能为目标，不宣称已经实测最优；具体击杀阈值随难度、敌人和装备变化。',fusion:d.crossRoutePolicy.fusion,sources};
// Confirmed new character-page entries: retain unknown ranks rather than invent thresholds.
const usherArts=[['两断','剑术','剑','必杀较高','D'],['暗影迫近','剑术','剑','敌处于有利地形时，忽略该地形影响','C'],['必闪一击','剑术','剑','攻击时以技巧÷2的概率使攻击力+5','B'],['警戒射击','弓术','弓','战斗时回避+10','D'],['离脱射击','弓术','弓','战斗后可以移动1格','C'],['螺旋射击','弓术','弓','攻击时以技巧÷2的概率使攻击力+5','B']].map(([name,skill,weapon,description,rank])=>({name,skill,weapon,description,rank,requirementUnknown:false,note:'技能等级门槛据 GameCap 角色技能习得表（2026-10-20 核对）',source:'https://game8.jp/fe-banshisenko/816434',sources:['https://game8.jp/fe-banshisenko/816434','https://gamecap.jp/fe_fw/oboeru.html']}));
d.learning.c47.combatArts=[...d.learning.c47.combatArts,...usherArts].filter((x,i,a)=>a.findIndex(y=>y.name===x.name)===i);
d.planning.c47.recommendations.combatArts=usherArts;
// Keep existing route roles, opening members and user preference behavior intact.
for(const [r,s]of Object.entries(d.routeStrategy)){
 for(const row of s.core){const p=d.planning[row.id];if(row.id==='c49')row.reason=p.audit.reason+' 凯伊第6章剧情入队，白魔先保障本线，另一线重装成果按需融合。';}
 for(const row of s.lateReplacements){if(row.id==='c11'&&r===T){row.roles=['枪系物理','骑乘'];row.reason='声望6，可将可选近战位换为妮涅枪骑，补物理枪系成果；凯伊线已负责移动白魔，不再重复白魔主养。';}if(row.id==='c47'&&r===D){row.roles=['格斗／弓剑','道具辅助'];row.reason='外传完成且声望7后启用；只当道具／舞者辅助时优先剑弓功能，需主输出才用格斗与力量补养。';}}
}
fs.writeFileSync(file,JSON.stringify(d,null,2)+'\n');
console.log('Reviewed all 63 characters; explicit direction assignments and class reasons stored in canonical catalog.');
