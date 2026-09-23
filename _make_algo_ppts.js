/**
 * ============================================================================
 * _make_algo_ppts.js
 * ----------------------------------------------------------------------------
 * 脚本用途：
 *   使用 pptxgenjs 批量生成 DL-Geo「数据-物理融合驱动的岩土工程风险评估」
 *   算法系列介绍 PPT（共四份）：
 *     ① LSTM 单点位移预测          → LSTM/01_LSTM_位移预测_算法介绍.pptx
 *     ② GCN 多点监测网时空预测      → GCN/02_GCN_...pptx
 *     ③ CNN+Transformer 位移预测    → CNN-Transformer/03_...pptx
 *     ④ XGBoost+SHAP 预测与归因    → XGBoost+SHAP/04_...pptx
 *   每份 PPT 均含：封面、系列定位、数据、原理、从零实现、精度检验、
 *   调参、消融/改进、Checklist 与常见坑、小结衔接页。
 *
 * 运行方式：
 *   node _make_algo_ppts.js        （需先 npm install pptxgenjs）
 *   生成文件为相对路径，请在项目根目录（DL-Geo/）下执行；
 *   输出目录需已存在（LSTM/ GCN/ CNN-Transformer/ XGBoost+SHAP/）。
 *
 * 排版约定（新增/修改页时请遵守）：
 *   - 全局常量 W/H/M 为幻灯片宽/高/左右页边距（英寸，LAYOUT_WIDE 13.33×7.5）。
 *   - 中文正文一律用 PingFang SC（常量 F）；代码/公式/超参名用等宽 Menlo（MONO）。
 *   - 【已知坑】Menlo 等宽字体 run 之后再接 CJK（中文）文本段，导出的
 *     PowerPoint 文件会损坏（无法打开/修复提示）。因此：
 *       1) 公式行必须放在「独立文本框」中，整个文本框 fontFace 用 MONO，
 *          绝不能与中文 run 混排在同一个 addText 的多 run 数组里；
 *       2) 同一 addText 多 run 中若出现 MONO run，其余 run 必须也是非 CJK
 *          或改用 F 字体的独立文本框。
 *   - 文本框务必显式 margin: 0，避免 pptxgenjs 默认内边距导致的错位。
 *   - 内容页统一调用 header()（页眉）、chrome()（页脚）、srcNote()（数据来源）。
 * ============================================================================
 */
const pptxgen = require("pptxgenjs");

// 版式常量：幻灯片宽高（LAYOUT_WIDE）与统一页边距（英寸）
const W = 13.33, H = 7.5, M = 0.55;
const INK = "1C2B3A";          // 封面/封底深色底
const INK2 = "2A3E52";         // 封面水印数字（比 INK 略浅的深色）
const PRIMARY = "24425C";      // 主色：深板岩蓝
const MID = "416380";          // 次级蓝（弱化强调）
const SOFT = "EEF2F6";         // 浅色卡片底 A
const SOFT2 = "E3EAF1";        // 浅色卡片底 B（与 SOFT 交替使用）
const TEXT = "1E242E";         // 正文深灰
const MUTED = "6B7480";        // 弱化说明文字
const HAIR = "D7DEE6";         // 发丝分割线颜色
const F = "PingFang SC";       // 中文字体（正文默认）
const MONO = "Menlo";          // 等宽字体：仅用于公式/代码/超参名。
                               // 【坑】MONO run 之后若同框接 CJK 段落，导出 PPT 会损坏；
                               // 公式行必须放独立文本框，不要与中文混排多 run。

/**
 * 四份 PPT 的元数据表：编号、强调色、输出路径、封面标题/副标题/数据来源等。
 * feats 为封面四宫格要点，未提供时使用默认（防泄漏/从零实现/两级口径/调参改进）。
 */
const DECKS = {
  lstm: {
    no: "01", cn: "①", accent: "C2410C", accentDim: "54301C",
    file: "LSTM/01_LSTM_位移预测_算法介绍.pptx",
    title: "LSTM 单点位移预测",
    sub: "完整实现 · 精度检验 · 调参 · 改进",
    src: "01_LSTM_位移预测_实现与调参.ipynb（dl-env 实测输出）",
  },
  gcn: {
    no: "02", cn: "②", accent: "0E7490", accentDim: "1A3A44",
    file: "GCN/02_GCN_多点监测网时空预测_算法介绍.pptx",
    title: "GCN 多点监测网时空预测",
    sub: "KNN 建图 · ST-GCN · 图的物理价值 · 改进",
    src: "02_GCN_多点监测网时空预测_实现与调参.ipynb（dl-env 实测输出）",
  },
  ct: {
    no: "03", cn: "③", accent: "6D28D9", accentDim: "32224A",
    file: "CNN-Transformer/03_CNN_Transformer_位移预测_算法介绍.pptx",
    title: "CNN + Transformer 单点位移预测",
    sub: "CNN 前置提局部模式 · Transformer 抓长依赖",
    src: "03_CNN_Transformer_位移预测_实现与调参.ipynb（dl-env 实测输出）",
  },
  xgb: {
    no: "04", cn: "④", accent: "B45309", accentDim: "4A3116",
    file: "XGBoost+SHAP/04_XGBoost_SHAP_位移预测与归因_算法介绍.pptx",
    title: "XGBoost + SHAP 可解释位移预测",
    sub: "表格式强基线 · TreeSHAP 精确归因 · 物理单调约束",
    src: "04_XGBoost_SHAP_位移预测与归因_实现与调参.ipynb（dl-env 实测输出）",
    feats: [
      ["01", "因果特征工程", "五特征族 24 特征 · 全部 ≤τ"],
      ["02", "从零实现", "二阶泰勒 + CART · 四项暴力验证"],
      ["03", "两级口径评估", "速率 mm/day + 累积重构 mm"],
      ["04", "SHAP 精确归因", "TreeSHAP · 加速期 Top-5 报告"],
    ],
  },
};

/** 生成项目符号选项：U+2022 圆点 + 指定缩进（pptxgenjs bullet 配置）。 */
const bu = (indent = 12) => ({ code: "2022", indent });

/** 统一的外阴影效果（卡片/架构块用）。 */
const shadow = () => ({ type: "outer", color: "1C2B3A", blur: 7, offset: 2, angle: 60, opacity: 0.16 });

/**
 * 新建一份演示文稿实例，并写入统一元数据（宽屏 13.33×7.5、作者、标题）。
 * @param {object} meta - DECKS 中的对应条目
 * @returns {pptxgen} 可继续 addSlide 的演示对象
 */
function newPres(meta) {
  const p = new pptxgen();
  p.layout = "LAYOUT_WIDE";
  p.author = "DL-Geo";
  p.title = `${meta.cn} ${meta.title}`;
  return p;
}

// 内容页页眉：kicker + 标题（无下划线、无色条）
/**
 * 内容页页眉：顶部小字 kicker（系列色）+ 大标题。
 * @param {Slide} s    - 幻灯片对象
 * @param {object} meta - DECKS 元数据（取 accent 作 kicker 颜色）
 * @param {string} kicker - 页眉小字（如“模型原理”）
 * @param {string} title  - 页标题
 */
function header(s, meta, kicker, title) {
  s.addText(kicker, { x: M, y: 0.34, w: 11, h: 0.3, fontFace: F, fontSize: 12, bold: true, color: meta.accent, charSpacing: 2, margin: 0 });
  s.addText(title, { x: M, y: 0.62, w: 11.6, h: 0.58, fontFace: F, fontSize: 26, bold: true, color: TEXT, margin: 0 });
}

/**
 * 内容页页脚：左侧项目名 + 右侧序号与页码（右对齐）。
 * 每个内容页末尾都要调用，保持全系列一致。
 */
function chrome(s, meta, page) {
  s.addText("DL-Geo · 数据-物理融合驱动的岩土工程风险评估", { x: M, y: 7.08, w: 6.5, h: 0.28, fontFace: F, fontSize: 12, color: MUTED, margin: 0 });
  s.addText(`${meta.cn} 算法介绍 · ${page}`, { x: W - M - 3, y: 7.08, w: 3, h: 0.28, align: "right", fontFace: F, fontSize: 12, color: MUTED, margin: 0 });
}

/** 页面底部的数据来源说明（“数据来源：xxx Notebook”），y 默认 6.75。 */
function srcNote(s, meta, y = 6.75) {
  s.addText(`数据来源：${meta.src}`, { x: M, y, w: 11, h: 0.26, fontFace: F, fontSize: 12, color: MUTED, margin: 0 });
}

/**
 * 画一个圆角卡片容器（内容块底板）。
 * @param {string} fill - 填充色；为 "FFFFFF"（白卡）时描边用发丝灰 HAIR，
 *                        其余情况描边与填充同色（视觉上无边框）。
 * @param {boolean} withShadow - 是否加投影（用于白卡浮起效果）。
 */
function card(s, p, x, y, w, h, fill = SOFT, withShadow = false) {
  const o = { x, y, w, h, fill: { color: fill }, line: { color: fill === "FFFFFF" ? HAIR : fill, width: 0.75 } };
  if (withShadow) o.shadow = shadow();
  s.addShape(p.shapes.ROUNDED_RECTANGLE, { ...o, rectRadius: 0.06 });
}

/**
 * KPI 指标块：大号数值 + 灰色标签 + 可选第三行说明（sub）。
 * 三行文字分别独立 addText，垂直间距固定（0.62 / 1.1 偏移）。
 */
function kpi(s, x, y, w, value, label, color = PRIMARY, sub = null) {
  s.addText(value, { x, y, w, h: 0.62, fontFace: F, fontSize: 30, bold: true, color, align: "center", margin: 0 });
  s.addText(label, { x, y: y + 0.62, w, h: 0.52, fontFace: F, fontSize: 12.5, color: MUTED, align: "center", valign: "top", margin: 0 });
  if (sub) s.addText(sub, { x, y: y + 1.1, w, h: 0.3, fontFace: F, fontSize: 12, color: MID, align: "center", margin: 0 });
}

/**
 * 项目符号列表（每项独立段落，段后距 gap）。
 * @param {Array<string|{text:string,options:object}>} items - 纯文本或带局部覆盖
 *   （如 bold / color）的对象。
 * @param {object} opts - size（字号）/ color（字色）/ gap（段后距）/ indent（缩进）。
 */
function bullets(s, items, x, y, w, h, opts = {}) {
  const arr = items.map((t, i) => {
    const o = { bullet: bu(opts.indent ?? 12), breakLine: true };
    if (typeof t === "string") return { text: t, options: o };
    return { text: t.text, options: { ...o, ...t.options } };
  });
  s.addText(arr, { x, y, w, h, fontFace: F, fontSize: opts.size ?? 14.5, color: opts.color ?? TEXT, paraSpaceAfter: opts.gap ?? 9, margin: 0, valign: "top", lineSpacingMultiple: 1.12 });
}

// 编号步骤链（chevron）：n 个箭头形横排等分，最后一步用强调色，其余用主色。
// 步骤文本可含 \n 换行；每步内部为“序号 + 文本”两个 run。
function chevrons(s, p, steps, x, y, w, h, accent = PRIMARY) {
  const n = steps.length, gap = 0.1;
  const cw = (w - gap * (n - 1)) / n;
  steps.forEach((t, i) => {
    s.addText([
      { text: `${i + 1}  `, options: { bold: true, color: "FFFFFF", fontSize: 15 } },
      { text: t, options: { color: "FFFFFF", fontSize: 12.5, bold: true } },
    ], { shape: p.shapes.CHEVRON, x: x + i * (cw + gap), y, w: cw, h, fill: { color: i === n - 1 ? accent : PRIMARY }, align: "center", valign: "middle", margin: 0.04, fontFace: F });
  });
}

// 图表通用外观：白底、灰坐标轴、隐藏图例/标题、统一数据标签字体。
// extra 可覆盖任意项（如 showValue、barDir、chartColors 等），也用于追加系列特有配置。
function chartBase(extra = {}) {
  return {
    chartArea: { fill: { color: "FFFFFF" } },
    catAxisLabelColor: MUTED, valAxisLabelColor: MUTED,
    catAxisLabelFontFace: F, valAxisLabelFontFace: F,
    catAxisLabelFontSize: 12, valAxisLabelFontSize: 12,
    valGridLine: { color: "E5EAf0".toUpperCase(), size: 0.5 },
    catGridLine: { style: "none" },
    showLegend: false, showTitle: false,
    dataLabelColor: TEXT, dataLabelFontFace: F, dataLabelFontSize: 12,
    dataLabelFormatCode: "0.000",
    ...extra,
  };
}

/**
 * 封面页：深色底 + 右侧大号编号水印 + 标题/副标题 + 底部四宫格要点。
 * 要点来自 meta.feats（DECKS.xgb 提供），否则用系列默认四条。
 */
function cover(p, meta) {
  const s = p.addSlide();
  s.background = { color: INK };
  s.addText(meta.no, { x: W - 5.4, y: 0.8, w: 5.0, h: 4.4, fontFace: "Arial", fontSize: 230, bold: true, color: INK2, align: "right", margin: 0 });
  s.addText("DL-GEO · 数据-物理融合驱动的岩土工程风险评估 · 算法系列", { x: M + 0.15, y: 1.45, w: 10, h: 0.32, fontFace: F, fontSize: 13, bold: true, color: meta.accent === undefined ? PRIMARY : meta.accent, charSpacing: 2, margin: 0 });
  s.addText([
    { text: `${meta.cn} `, options: { color: "FFFFFF" } },
    { text: meta.title, options: { color: "FFFFFF" } },
  ], { x: M + 0.15, y: 1.95, w: 10.5, h: 1.05, fontFace: F, fontSize: 40, bold: true, margin: 0 });
  s.addText(meta.sub, { x: M + 0.15, y: 3.05, w: 10, h: 0.45, fontFace: F, fontSize: 17, color: "B9C4CF", margin: 0 });
  const feats = meta.feats || [
    ["01", "防泄漏流水线", "训练段 fit · 按目标时刻划分"],
    ["02", "从零实现", "NumPy 前向反向 + 梯度检查 + 官方对齐"],
    ["03", "两级口径评估", "速率 mm/day + 累积重构 mm"],
    ["04", "调参与改进", "随机搜索 · 消融 · 物理融合 · 不确定性"],
  ];
  feats.forEach(([n, t, d], i) => {
    const x = M + 0.15 + i * 2.62;
    s.addText(n, { x, y: 4.55, w: 2.4, h: 0.34, fontFace: "Arial", fontSize: 15, bold: true, color: meta.accent, margin: 0 });
    s.addText(t, { x, y: 4.9, w: 2.4, h: 0.32, fontFace: F, fontSize: 14.5, bold: true, color: "FFFFFF", margin: 0 });
    s.addText(d, { x, y: 5.24, w: 2.35, h: 0.75, fontFace: F, fontSize: 12, color: "9DAAB8", margin: 0, valign: "top" });
  });
  s.addText("配套 Notebook 与全部结果均为 dl-env 内核实测输出，可直接复现", { x: M + 0.15, y: 6.6, w: 10, h: 0.3, fontFace: F, fontSize: 12, color: "7C8B99", margin: 0 });
}

/**
 * 封底“小结与衔接”页：深色底 + 要点 bullets + 与系列其他算法的衔接说明。
 * @param {string[]} points - 小结要点（每条一行）
 * @param {string} next - 衔接文字（可含 \n 分行列出 ⑤⑥⑧ 等后续算法）
 */
function closing(p, meta, points, next) {
  const s = p.addSlide();
  s.background = { color: INK };
  s.addText(meta.no, { x: W - 5.2, y: 3.1, w: 4.9, h: 4.0, fontFace: "Arial", fontSize: 190, bold: true, color: INK2, align: "right", margin: 0 });
  s.addText("小结与衔接", { x: M + 0.15, y: 0.75, w: 8, h: 0.7, fontFace: F, fontSize: 32, bold: true, color: "FFFFFF", margin: 0 });
  const arr = points.map((t) => ({ text: t, options: { bullet: bu(12), breakLine: true, color: "DEE6EE" } }));
  s.addText(arr, { x: M + 0.15, y: 1.8, w: 8.3, h: 2.9, fontFace: F, fontSize: 15, paraSpaceAfter: 12, margin: 0, lineSpacingMultiple: 1.15 });
  s.addText("与系列其他算法的衔接", { x: M + 0.15, y: 4.95, w: 8, h: 0.35, fontFace: F, fontSize: 14, bold: true, color: meta.accent, margin: 0 });
  s.addText(next, { x: M + 0.15, y: 5.35, w: 9.6, h: 1.3, fontFace: F, fontSize: 13.5, color: "B9C4CF", margin: 0, lineSpacingMultiple: 1.2 });
}

// ============================================================ ① LSTM
/**
 * 构建 ①《LSTM 单点位移预测》整份 PPT（共 13 页 + 封面封底）。
 * 页面顺序：定位 → 数据 → 目标构造反例 → 防泄漏流水线 → 原理 → 从零实现
 *          → PyTorch 实战 → 精度 → 调参 → 结构对比/集成 → 物理融合/不确定性
 *          → Checklist/坑 → 小结。
 * 每页末尾统一 srcNote + chrome(page)。
 */
function buildLSTM() {
  const meta = DECKS.lstm, A = meta.accent;
  const p = newPres(meta);
  cover(p, meta);

  // ---- S2 系列定位
  let s = p.addSlide(); s.background = { color: "FFFFFF" };
  header(s, meta, "算法系列 · 定位", "单点时序预测：整个算法系列的起点");
  chevrons(s, p, ["① 单点时序（本篇）\nLSTM/GRU", "② 多点时空\nGCN 监测网", "③ 混合架构\nCNN+Transformer"], M, 1.6, 7.2, 0.85);
  s.addText("已完成：④ XGBoost+SHAP   待加：⑤ 分位数/Conformal 风险区间   ⑥ PINN   ⑦ 神经算子   ⑧ 时序基础模型", { x: M, y: 2.62, w: 12.2, h: 0.3, fontFace: F, fontSize: 12, color: MUTED, margin: 0 });
  card(s, p, M, 3.15, 7.2, 2.55);
  s.addText("本篇要解决的问题", { x: M + 0.25, y: 3.35, w: 6.6, h: 0.32, fontFace: F, fontSize: 15, bold: true, color: PRIMARY, margin: 0 });
  bullets(s, [
    { text: "场景：边坡/库岸单个 GNSS 测点，日尺度监测", options: {} },
    { text: "输入：过去 30 天环境驱动 + 位移自身历史（自回归）", options: {} },
    { text: "输出：明日位移速率（mm/day）→ 累加重构累积位移", options: {} },
    { text: "难点：目标持续增长（非平稳）、雨季台阶状突变", options: {} },
  ], M + 0.25, 3.75, 6.7, 1.8, { size: 14 });
  card(s, p, 8.05, 3.15, 4.7, 2.55, "FFFFFF", true);
  s.addText("为什么是 LSTM", { x: 8.3, y: 3.35, w: 4.2, h: 0.32, fontFace: F, fontSize: 15, bold: true, color: A, margin: 0 });
  bullets(s, [
    { text: "门控记忆：能记住数月尺度的水文过程", options: {} },
    { text: "多变量：降雨/水位/温度统一编码", options: {} },
    { text: "小样本友好：参数量适中、收敛稳", options: {} },
    { text: "训练轻量：基线 21 秒收敛（早停 epoch 48），CPU 即可复现", options: {} },
  ], 8.3, 3.75, 4.25, 1.7, { size: 14 });
  srcNote(s, meta);
  chrome(s, meta, 2);

  // ---- S3 数据
  s = p.addSlide(); s.background = { color: "FFFFFF" };
  header(s, meta, "演示数据 · 可整体替换", "合成数据：把“位移为什么这样长”写进机制");
  card(s, p, M, 1.55, 7.0, 4.5);
  s.addText("位移速率的物理分解（2190 天 · 6 年日尺度）", { x: M + 0.25, y: 1.75, w: 6.5, h: 0.32, fontFace: F, fontSize: 15, bold: true, color: PRIMARY, margin: 0 });
  const mech = [
    ["蠕变衰减", "0.9·e^(−t/650) mm/day", "长期项：随时间缓慢衰减"],
    ["降雨响应", "0.10·R^eff（τ=12 天指数核）", "事件项：入渗渗流滞后，雨季台阶"],
    ["库水位骤降", "0.9·max(0, −ΔL)", "事件项：只对“骤降”响应"],
    ["观测噪声", "ε ~ N(0, 0.15)", "任何模型都不可预报的底"],
  ];
  mech.forEach(([t, f, d], i) => {
    const y = 2.18 + i * 0.92;
    s.addText(t, { x: M + 0.25, y, w: 1.75, h: 0.3, fontFace: F, fontSize: 13.5, bold: true, color: A, margin: 0 });
    s.addText(f, { x: M + 2.05, y, w: 2.75, h: 0.3, fontFace: MONO, fontSize: 12, color: PRIMARY, margin: 0 });
    s.addText(d, { x: M + 2.05, y: y + 0.3, w: 4.6, h: 0.3, fontFace: F, fontSize: 12, color: MUTED, margin: 0 });
    if (i < 3) s.addShape(p.shapes.LINE, { x: M + 0.25, y: y + 0.72, w: 6.4, h: 0, line: { color: HAIR, width: 0.75 } });
  });
  s.addText("速率 v(t) 逐日累加 → 累积位移 D(t)：雨季呈台阶状增长", { x: M + 0.25, y: 5.7, w: 6.6, h: 0.3, fontFace: F, fontSize: 12.5, color: MID, margin: 0 });
  card(s, p, 7.85, 1.55, 4.9, 4.5, "FFFFFF", true);
  s.addText("数据规格", { x: 8.1, y: 1.75, w: 4.4, h: 0.32, fontFace: F, fontSize: 15, bold: true, color: PRIMARY, margin: 0 });
  const spec = [["时间范围", "2016-01-01 起 · 2190 天"], ["驱动特征", "降雨 / 库水位 / 温度"], ["目标（原始）", "累积位移 disp_mm"], ["目标（建模）", "位移速率 = 一阶差分"], ["数据格式", "长表 CSV（date/驱动/目标）"], ["存储", "demo_geodata.csv"]];
  spec.forEach(([k, v], i) => {
    const y = 2.2 + i * 0.63;
    s.addText(k, { x: 8.1, y, w: 1.5, h: 0.3, fontFace: F, fontSize: 12.5, bold: true, color: MID, margin: 0 });
    s.addText(v, { x: 9.65, y, w: 3.0, h: 0.3, fontFace: F, fontSize: 12.5, color: TEXT, margin: 0 });
    if (i < 5) s.addShape(p.shapes.LINE, { x: 8.1, y: y + 0.44, w: 4.4, h: 0, line: { color: HAIR, width: 0.75 } });
  });
  srcNote(s, meta);
  chrome(s, meta, 3);

  // ---- S4 反例：为什么预测速率
  s = p.addSlide(); s.background = { color: "FFFFFF" };
  header(s, meta, "目标构造 · 一个重要的反例", "直接预测累积位移？错得非常彻底");
  s.addChart(p.charts.BAR, [{
    name: "累积位移口径 RMSE (mm)",
    labels: ["(c) 速率-重构（主方案）", "(b) 趋势-残差分解", "(a) 直接预测累积"],
    values: [14.07, 126.54, 389.61],
  }], chartBase({
    x: M, y: 1.6, w: 7.1, h: 3.5, barDir: "bar",
    chartColors: [PRIMARY, MID, A], varyColors: true,
    showValue: true, dataLabelPosition: "outEnd", dataLabelFormatCode: "0.00",
    valAxisMaxVal: 420, barGapWidthPct: 60,
  }));
  s.addText("同一模型、同一调参，只换目标构造 —— 累积口径 RMSE (mm)", { x: M, y: 5.2, w: 7.1, h: 0.3, fontFace: F, fontSize: 12.5, color: MUTED, align: "center", margin: 0 });
  card(s, p, 8.0, 1.6, 4.75, 4.35);
  s.addText("三种处理", { x: 8.25, y: 1.8, w: 4.2, h: 0.3, fontFace: F, fontSize: 15, bold: true, color: PRIMARY, margin: 0 });
  const tri = [
    ["(a) 直接预测累积", "R² = −13.05：测试段超出训练范围，无法外推", A],
    ["(b) 趋势-残差分解", "R² = −0.48：趋势外推形式是软肋", MID],
    ["(c) 速率-重构", "R² = 0.982：差分自动处理趋势，最稳健", PRIMARY],
  ];
  tri.forEach(([t, d, c], i) => {
    const y = 2.25 + i * 1.05;
    s.addText(t, { x: 8.25, y, w: 4.3, h: 0.3, fontFace: F, fontSize: 13.5, bold: true, color: c, margin: 0 });
    s.addText(d, { x: 8.25, y: y + 0.32, w: 4.3, h: 0.62, fontFace: F, fontSize: 12.5, color: TEXT, margin: 0, valign: "top" });
  });
  s.addText("结论：位移类“持续增长”目标，一律先差分出速率再建模", { x: 8.25, y: 5.5, w: 4.4, h: 0.55, fontFace: F, fontSize: 12.5, bold: true, color: A, margin: 0 });
  srcNote(s, meta);
  chrome(s, meta, 4);

  // ---- S5 防泄漏流水线
  s = p.addSlide(); s.background = { color: "FFFFFF" };
  header(s, meta, "数据流水线", "防泄漏五步：标准化器永远不见未来");
  chevrons(s, p, ["差分出速率", "插值 + 4σ 截尾", "训练段 fit scaler", "滑窗 30→1", "按目标时刻 70/15/15"], M, 1.65, 12.2, 0.9);
  const leak = [
    ["训练段 fit", "StandardScaler 只用前 70% 拟合，val/test 只 transform"],
    ["速率共用 scaler", "目标列同时是输入（自回归）→ 输入输出同一标准化，递归预测可直接回填"],
    ["按目标时刻划分", "样本归属由“标签在哪天”决定，绝不随机打乱"],
    ["y 保持二维", "(M,1)：避免 (B,1) 与 (B,) 的 MSE 错误广播"],
  ];
  leak.forEach(([t, d], i) => {
    const x = M + (i % 2) * 6.25, y = 3.0 + Math.floor(i / 2) * 1.62;
    card(s, p, x, y, 5.95, 1.4);
    s.addText(t, { x: x + 0.22, y: y + 0.16, w: 5.5, h: 0.3, fontFace: F, fontSize: 14, bold: true, color: PRIMARY, margin: 0 });
    s.addText(d, { x: x + 0.22, y: y + 0.5, w: 5.5, h: 0.8, fontFace: F, fontSize: 12.5, color: TEXT, margin: 0, valign: "top" });
  });
  s.addText("为什么要防泄漏：scaler 若在全量上 fit，“未来”的均值方差就渗进了训练 → 测试精度虚高", { x: M, y: 6.35, w: 12.2, h: 0.3, fontFace: F, fontSize: 12.5, bold: true, color: A, margin: 0 });
  srcNote(s, meta);
  chrome(s, meta, 5);

  // ---- S6 LSTM 原理
  s = p.addSlide(); s.background = { color: "FFFFFF" };
  header(s, meta, "模型原理", "LSTM：用三道门控制“记什么、忘什么”");
  // cell state 传送带示意
  card(s, p, M, 1.6, 7.2, 3.1, SOFT2);
  s.addShape(p.shapes.LINE, { x: M + 0.5, y: 2.55, w: 6.2, h: 0, line: { color: PRIMARY, width: 3 } });
  s.addText("细胞状态 C(t) —— 贯穿时间的“传送带”", { x: M + 0.5, y: 2.15, w: 6.2, h: 0.3, fontFace: F, fontSize: 13, bold: true, color: PRIMARY, margin: 0 });
  const gates = [["遗忘门 f", "丢弃旧记忆", "×"], ["输入门 i", "写入新事件", "+"], ["输出门 o", "暴露为输出", "→"]];
  gates.forEach(([g, d, op], i) => {
    const x = M + 0.55 + i * 2.1;
    s.addShape(p.shapes.OVAL, { x: x + 0.55, y: 2.32, w: 0.46, h: 0.46, fill: { color: [MID, A, PRIMARY][i] } });
    s.addText(op, { x: x + 0.55, y: 2.32, w: 0.46, h: 0.46, fontFace: F, fontSize: 15, bold: true, color: "FFFFFF", align: "center", valign: "middle", margin: 0 });
    s.addText(g, { x, y: 2.95, w: 1.9, h: 0.3, fontFace: F, fontSize: 13, bold: true, color: TEXT, align: "center", margin: 0 });
    s.addText(d, { x, y: 3.25, w: 1.9, h: 0.3, fontFace: F, fontSize: 12, color: MUTED, align: "center", margin: 0 });
  });
  // LSTM 公式行：独立文本框 + 整框 MONO 字体（【坑】Menlo run 后不能接 CJK 段落，
  // 否则导出 PPT 损坏；公式必须与中文分框排版）
  s.addText("h(t) = o(t) ⊙ tanh(C(t))    C(t) = f(t)⊙C(t−1) + i(t)⊙c̃(t)    门 = σ(W·[h(t−1), x(t)])", { x: M + 0.5, y: 3.75, w: 6.3, h: 0.75, fontFace: MONO, fontSize: 12, color: PRIMARY, margin: 0, valign: "top" });
  card(s, p, 8.05, 1.6, 4.7, 3.1);
  s.addText("岩土含义", { x: 8.3, y: 1.8, w: 4.2, h: 0.3, fontFace: F, fontSize: 15, bold: true, color: A, margin: 0 });
  bullets(s, [
    { text: "遗忘门 ≈ 蠕变记忆的缓慢衰减", options: {} },
    { text: "输入门 ≈ 暴雨/骤降事件写入记忆", options: {} },
    { text: "细胞状态 ≈ 坡体内“储存的水与变形”", options: {} },
    { text: "输出门 ≈ 把状态翻译成当日速率", options: {} },
    { text: "门控把“事件响应”与“背景蠕变”分开建模", options: {} },
  ], 8.3, 2.2, 4.25, 2.3, { size: 13.5 });
  card(s, p, M, 4.95, 12.2, 1.55);
  s.addText([
    { text: "相比普通 RNN：", options: { bold: true, color: PRIMARY } },
    { text: "梯度沿细胞状态近似线性流动，长序列训练不易梯度消失 —— 这正是“数月尺度水文记忆”能被学到的结构保障。", options: { color: TEXT, breakLine: true } },
    { text: "实测：48 个 epoch 早停、val MSE 0.1869 —— 门控结构在小样本上收敛稳定，无需特殊技巧。", options: { color: MID } },
  ], { x: M + 0.25, y: 5.12, w: 11.7, h: 1.25, fontFace: F, fontSize: 14, margin: 0, valign: "middle", paraSpaceAfter: 6 });
  srcNote(s, meta);
  chrome(s, meta, 6);

  // ---- S7 从零实现
  s = p.addSlide(); s.background = { color: "FFFFFF" };
  header(s, meta, "从零实现", "NumPy 手写 LSTM + BPTT：先吃透，再用框架");
  const impl = [
    ["前向", "逐时间步：4 个门的仿射 + sigmoid/tanh，细胞状态与隐状态双通道传递", "W_f/W_i/W_o/W_c 堆叠为一次矩阵乘"],
    ["反向", "BPTT：沿时间反向遍历，细胞状态梯度分两路（经 C(t−1) 与经 h(t)）", "门梯度 = δ⊙激活导数⊙x"],
    ["验证", "解析梯度 vs 中心差分数值梯度，逐参数最大相对误差 < 1e-5", "梯度检查 ✅ BPTT 实现正确"],
  ];
  impl.forEach(([t, d1, d2], i) => {
    const y = 1.65 + i * 1.5;
    card(s, p, M, y, 12.2, 1.28, i === 2 ? SOFT2 : SOFT);
    s.addText(t, { x: M + 0.25, y: y + 0.14, w: 1.3, h: 0.35, fontFace: F, fontSize: 15, bold: true, color: i === 2 ? A : PRIMARY, margin: 0 });
    s.addText(d1, { x: M + 1.7, y: y + 0.12, w: 7.6, h: 1.05, fontFace: F, fontSize: 13, color: TEXT, margin: 0, valign: "middle" });
    s.addText(d2, { x: M + 9.5, y: y + 0.12, w: 2.5, h: 1.05, fontFace: F, fontSize: 12, color: MID, margin: 0, valign: "middle" });
  });
  s.addText([
    { text: "为什么要手写：", options: { bold: true, color: A } },
    { text: "框架会隐藏维度错误与梯度细节；亲手推一遍 BPTT，后面调参时才分得清“数据问题 / 模型问题 / 优化问题”。", options: { color: TEXT } },
  ], { x: M, y: 6.25, w: 12.2, h: 0.5, fontFace: F, fontSize: 13.5, margin: 0 });
  srcNote(s, meta);
  chrome(s, meta, 7);

  // ---- S8 PyTorch 模型与训练
  s = p.addSlide(); s.background = { color: "FFFFFF" };
  header(s, meta, "实战与训练", "PyTorch 实现：结构可切换，训练组件标准化");
  card(s, p, M, 1.6, 5.9, 4.4);
  s.addText("模型结构（可切换）", { x: M + 0.25, y: 1.8, w: 5.4, h: 0.32, fontFace: F, fontSize: 15, bold: true, color: PRIMARY, margin: 0 });
  // 模型结构行：纯代码文本（无中文混排），整框 MONO 安全
  s.addText("nn.LSTM(4 → hidden, num_layers, dropout, bidirectional)", { x: M + 0.25, y: 2.28, w: 5.4, h: 0.32, fontFace: MONO, fontSize: 12, color: PRIMARY, margin: 0 });
  bullets(s, [
    { text: "结构开关：LSTM / GRU / BiLSTM 一键切换（§9.2 对比）", options: {} },
    { text: "回归头：Linear(hidden→32) → ReLU → Dropout → Linear(32→1)", options: {} },
    { text: "取最后时刻隐状态 h(T) 汇总整个窗口", options: {} },
    { text: "输出 (M,1) → inverse_transform 回物理量纲（mm/day）", options: {} },
  ], M + 0.25, 2.75, 5.4, 2.4, { size: 13.5 });
  s.addText("基线配置：hidden=64 · layers=2 · dropout=0.2 · SEQ_LEN=30", { x: M + 0.25, y: 5.45, w: 5.4, h: 0.35, fontFace: F, fontSize: 12.5, color: MID, margin: 0 });
  card(s, p, 6.85, 1.6, 5.9, 4.4, "FFFFFF", true);
  s.addText("训练四件套（系列统一标准）", { x: 7.1, y: 1.8, w: 5.4, h: 0.32, fontFace: F, fontSize: 15, bold: true, color: A, margin: 0 });
  const tr4 = [
    ["AdamW", "lr=1e-3, weight_decay=1e-4，自适应 + 解耦权重衰减"],
    ["早停回滚", "val 20 轮无改善即停，回滚到最优权重（防过拟合后段）"],
    ["LR 调度", "ReduceLROnPlateau：val 平台期 lr 减半"],
    ["梯度裁剪", "max_norm=5.0：RNN 训练的防爆阀"],
  ];
  tr4.forEach(([t, d], i) => {
    const y = 2.28 + i * 0.78;
    s.addText(t, { x: 7.1, y, w: 1.6, h: 0.3, fontFace: F, fontSize: 13.5, bold: true, color: PRIMARY, margin: 0 });
    s.addText(d, { x: 8.75, y, w: 3.85, h: 0.62, fontFace: F, fontSize: 12, color: TEXT, margin: 0, valign: "top" });
  });
  s.addText("实测：早停于 epoch 48，最佳 val MSE = 0.1869（用时 21s）", { x: 7.1, y: 5.5, w: 5.5, h: 0.35, fontFace: F, fontSize: 12.5, bold: true, color: A, margin: 0 });
  srcNote(s, meta);
  chrome(s, meta, 8);

  // ---- S9 精度检验
  s = p.addSlide(); s.background = { color: "FFFFFF" };
  header(s, meta, "精度检验", "两级口径：速率空间建模，累积空间应用");
  const kpis = [["0.2595", "test RMSE (mm/day)", A], ["0.719", "test R² / NSE", PRIMARY], ["14.07", "累积重构 RMSE (mm)", PRIMARY], ["0.982", "累积重构 R²", A]];
  kpis.forEach(([v, l, c], i) => {
    card(s, p, M + i * 3.13, 1.6, 2.85, 1.55, i % 2 ? SOFT : SOFT2);
    kpi(s, M + i * 3.13, 1.78, 2.85, v, l, c);
  });
  const rows = [
    [{ text: "划分", options: { bold: true, color: "FFFFFF", fill: { color: PRIMARY } } }, { text: "RMSE (mm/day)", options: { bold: true, color: "FFFFFF", fill: { color: PRIMARY } } }, { text: "MAE", options: { bold: true, color: "FFFFFF", fill: { color: PRIMARY } } }, { text: "MAPE", options: { bold: true, color: "FFFFFF", fill: { color: PRIMARY } } }, { text: "R²", options: { bold: true, color: "FFFFFF", fill: { color: PRIMARY } } }],
    ["train", "0.3211", "0.2170", "22.3%", "0.767"],
    ["val", "0.2856", "0.2246", "31.7%", "0.739"],
    [{ text: "test", options: { bold: true } }, { text: "0.2595", options: { bold: true, color: A } }, { text: "0.2022", options: { bold: true } }, { text: "36.4%", options: { bold: true } }, { text: "0.719", options: { bold: true, color: A } }],
  ];
  s.addTable(rows, { x: M, y: 3.55, w: 7.0, colW: [1.2, 1.7, 1.3, 1.3, 1.5], fontFace: F, fontSize: 12.5, color: TEXT, align: "center", valign: "middle", border: { pt: 0.75, color: HAIR }, rowH: 0.42, fill: { color: "FFFFFF" } });
  s.addText("检验要点", { x: 8.0, y: 3.55, w: 4.6, h: 0.32, fontFace: F, fontSize: 15, bold: true, color: PRIMARY, margin: 0 });
  bullets(s, [
    { text: "train RMSE 最高≠异常：train 段含早期高速蠕变，量级天然更大", options: {} },
    { text: "NSE 与 R² 在速率口径下等价，水文审稿口径友好", options: {} },
    { text: "MAPE 对近零速率敏感，需配合 RMSE/MAE 一起报告", options: {} },
    { text: "另附递归多步预测：45 天滚动外推 + 误差随步长增长曲线", options: {} },
  ], 8.0, 3.95, 4.6, 2.4, { size: 12.5, gap: 7 });
  srcNote(s, meta);
  chrome(s, meta, 9);

  // ---- S10 调参
  s = p.addSlide(); s.background = { color: "FFFFFF" };
  header(s, meta, "调参", "随机搜索 12 组：最优配置并不贵");
  s.addChart(p.charts.BAR, [{
    name: "val RMSE (mm/day)",
    labels: ["trial0", "trial1", "trial2", "trial3", "trial4", "trial5/6", "trial7", "trial8", "trial9", "trial10", "trial11"],
    values: [0.2860, 0.2928, 0.2834, 0.2874, 0.2855, 0.2958, 0.2819, 0.2872, 0.2821, 0.2844, 0.2886],
  }], chartBase({
    x: M, y: 1.6, w: 7.0, h: 3.4, barDir: "col",
    chartColors: [A], showValue: false,
    valAxisMinVal: 0.27, valAxisMaxVal: 0.30, barGapWidthPct: 45,
    catAxisLabelRotate: 45,
  }));
  s.addText("12 组随机搜索的 val RMSE：全距仅 0.014 mm/day —— 对超参不敏感，把时间花在数据上更值", { x: M, y: 5.1, w: 7.0, h: 0.5, fontFace: F, fontSize: 12.5, color: MUTED, margin: 0 });
  card(s, p, 8.0, 1.6, 4.75, 4.35);
  s.addText("最优配置（val RMSE 0.2819）", { x: 8.25, y: 1.8, w: 4.3, h: 0.32, fontFace: F, fontSize: 15, bold: true, color: A, margin: 0 });
  // 超参小卡片：单框多 run（键名灰色小字 + 值加粗），键值均为 ASCII，
  // 整框 MONO 安全；中文说明文字一律放在框外用 F 字体的独立文本框
  const cfg = [["hidden", "64"], ["layers", "2"], ["dropout", "0.0"], ["lr", "1e-3"], ["batch", "32"]];
  cfg.forEach(([k, v], i) => {
    const x = 8.25 + (i % 3) * 1.55, y = 2.3 + Math.floor(i / 3) * 0.75;
    card(s, p, x, y, 1.4, 0.62, SOFT2);
    s.addText([{ text: `${k} `, options: { fontSize: 11, color: MUTED } }, { text: v, options: { fontSize: 13, bold: true, color: PRIMARY } }], { x, y, w: 1.4, h: 0.62, fontFace: MONO, align: "center", valign: "middle", margin: 0 });
  });
  s.addText("调参心法（按重要性）", { x: 8.25, y: 4.05, w: 4.3, h: 0.3, fontFace: F, fontSize: 13.5, bold: true, color: PRIMARY, margin: 0 });
  bullets(s, [
    { text: "容量先行：hidden / layers 定上下限", options: {} },
    { text: "再稳优化：lr × dropout 联动", options: {} },
    { text: "数据 <1k：hidden≤64、layers≤2、加大 dropout", options: {} },
  ], 8.25, 4.4, 4.3, 1.5, { size: 12.5, gap: 6 });
  srcNote(s, meta);
  chrome(s, meta, 10);

  // ---- S11 结构对比与集成
  s = p.addSlide(); s.background = { color: "FFFFFF" };
  header(s, meta, "改进 I", "结构对比与集成：差异小，集成稳");
  s.addChart(p.charts.BAR, [{
    name: "test RMSE (mm/day)",
    labels: ["LSTM×3 集成", "BiLSTM", "LSTM(调参后)", "GRU"],
    values: [0.2562, 0.2554, 0.2570, 0.2598],
  }], chartBase({
    x: M, y: 1.6, w: 6.9, h: 3.5, barDir: "bar",
    chartColors: [MID, A, PRIMARY, MID], varyColors: true,
    showValue: true, dataLabelPosition: "outEnd", dataLabelFormatCode: "0.0000",
    valAxisMinVal: 0.24, valAxisMaxVal: 0.265, barGapWidthPct: 55,
  }));
  s.addText("速率口径 test RMSE（越低越好）", { x: M, y: 5.2, w: 6.9, h: 0.3, fontFace: F, fontSize: 12.5, color: MUTED, align: "center", margin: 0 });
  card(s, p, 7.9, 1.6, 4.85, 4.35);
  s.addText("怎么读这张图", { x: 8.15, y: 1.8, w: 4.3, h: 0.32, fontFace: F, fontSize: 15, bold: true, color: PRIMARY, margin: 0 });
  bullets(s, [
    { text: "四个模型差距 < 2%：结构不是瓶颈，数据质量才是", options: {} },
    { text: "BiLSTM 速率口径最好（0.2554），累积口径也最佳（9.47mm，R²=0.992）——双向上下文捕获雨季前后形态", options: {} },
    { text: "BiLSTM 部署注意：需整段历史可用，严禁混入未来驱动", options: {} },
    { text: "LSTM×3 集成：RMSE 0.2562 且更稳，代价 ×3 训练", options: {} },
  ], 8.15, 2.25, 4.4, 3.5, { size: 13, gap: 9 });
  srcNote(s, meta);
  chrome(s, meta, 11);

  // ---- S12 物理融合 + 不确定性
  s = p.addSlide(); s.background = { color: "FFFFFF" };
  header(s, meta, "改进 II", "物理软约束 + MC Dropout：给点预测装上“物理”与“区间”");
  card(s, p, M, 1.6, 12.2, 1.35, SOFT2);
  s.addText([
    { text: "L = MSE(v̂, v) ", options: { bold: true, color: PRIMARY, fontSize: 16 } },
    { text: "+ λ · ", options: { color: TEXT, fontSize: 16 } },
    { text: "MSE(v̂, v_phys)", options: { bold: true, color: A, fontSize: 16 } },
    { text: "　　v_phys = 最小二乘率定的机理模型（蠕变 + 有效降雨 + 骤降，系数只用训练段）", options: { color: MUTED, fontSize: 13 } },
  ], { x: M + 0.25, y: 1.78, w: 11.7, h: 1.0, fontFace: F, margin: 0, valign: "middle" });
  s.addText("λ 扫描（test RMSE, mm/day）", { x: M, y: 3.25, w: 6.0, h: 0.32, fontFace: F, fontSize: 14.5, bold: true, color: PRIMARY, margin: 0 });
  s.addChart(p.charts.LINE, [
    { name: "val", labels: ["0", "0.1", "0.3", "1.0", "3.0"], values: [0.2819, 0.2831, 0.2863, 0.2935, 0.3051] },
    { name: "test", labels: ["0", "0.1", "0.3", "1.0", "3.0"], values: [0.2570, 0.2581, 0.2614, 0.2579, 0.2670] },
  ], chartBase({
    x: M, y: 3.65, w: 6.0, h: 2.6, lineSize: 2.5,
    chartColors: [MID, A], showLegend: true, legendPos: "b", legendFontFace: F, legendFontSize: 12,
    showValue: false, lineSmooth: false,
  }));
  s.addText("λ 大 → 被粗糙机理模型拖累；λ=0 即纯数据模型", { x: M, y: 6.3, w: 6.0, h: 0.3, fontFace: F, fontSize: 12, color: MUTED, align: "center", margin: 0 });
  card(s, p, 7.0, 3.25, 5.75, 3.0);
  s.addText("MC Dropout 不确定性", { x: 7.25, y: 3.45, w: 5.2, h: 0.32, fontFace: F, fontSize: 14.5, bold: true, color: A, margin: 0 });
  bullets(s, [
    { text: "预测时保持 Dropout，采样 50 次 → 均值 + 95% 区间", options: {} },
    { text: "实测 PICP = 0.378（理想 0.95）→ 区间过自信", options: { bold: true } },
    { text: "诊断：MC Dropout 只覆盖模型不确定性，不覆盖噪声底", options: {} },
    { text: "升级路线：Conformal / 分位数回归（算法⑤）", options: {} },
  ], 7.25, 3.85, 5.3, 2.2, { size: 13, gap: 8 });
  srcNote(s, meta);
  chrome(s, meta, 12);

  // ---- S13 Checklist + 坑
  s = p.addSlide(); s.background = { color: "FFFFFF" };
  header(s, meta, "落地指南", "接入真实数据 Checklist 与常见坑");
  card(s, p, M, 1.6, 6.6, 4.9);
  s.addText("Checklist", { x: M + 0.25, y: 1.8, w: 6.0, h: 0.32, fontFace: F, fontSize: 15, bold: true, color: PRIMARY, margin: 0 });
  const cl = ["CSV 放入 LSTM/：时间列 + 驱动列 + 目标列（等间隔、缺测已插值）", "改 §2.2 配置区：DATA_PATH / FEATURE_COLS / TARGET_COL", "位移类目标先一阶差分出速率列（反例见 §9.1）", "SEQ_LEN 用降雨-位移互相关滞后分析确定，覆盖 1~2 个主导周期", "先基线 → 损失曲线定过拟合方向 → §8 随机搜索/Optuna", "样本 <1k：hidden≤64、layers≤2、加大 dropout、优先集成", "两级口径都报告 + 过程线 + 散点图（论文标准配置）", "§9.4 区间宽度/超越概率接入风险矩阵"];
  s.addText(cl.map((t, i) => ({ text: `${i + 1}.  ${t}`, options: { breakLine: true } })), { x: M + 0.25, y: 2.25, w: 6.15, h: 4.1, fontFace: F, fontSize: 12.5, color: TEXT, paraSpaceAfter: 8, margin: 0, valign: "top" });
  card(s, p, 7.45, 1.6, 5.3, 4.9, SOFT2);
  s.addText("常见坑速查", { x: 7.7, y: 1.8, w: 4.8, h: 0.32, fontFace: F, fontSize: 15, bold: true, color: A, margin: 0 });
  const pits = ["随机打乱划分样本 ❌", "全量数据 fit scaler ❌", "直接预测持续增长的累积值 ❌", "MAPE 用于近零速率目标 ❌", "BiLSTM 混入未来驱动序列 ❌", "test 反复调参（变成第二验证集）❌", "MinMax 遇超范围极值崩溃 ❌"];
  s.addText(pits.map((t) => ({ text: t, options: { bullet: bu(12), breakLine: true } })), { x: 7.7, y: 2.25, w: 4.85, h: 3.3, fontFace: F, fontSize: 13, color: TEXT, paraSpaceAfter: 10, margin: 0 });
  s.addText("每一条都对应 Notebook 中可复现的实验或讨论", { x: 7.7, y: 5.9, w: 4.8, h: 0.4, fontFace: F, fontSize: 12, color: MUTED, margin: 0 });
  srcNote(s, meta);
  chrome(s, meta, 13);

  closing(p, meta, [
    "交付：可复现 Notebook（NumPy 从零 + PyTorch 实战 + 调参 + 改进）与两级口径结果 CSV",
    "基线 test RMSE 0.2595 mm/day（R²=0.719），累积重构 14.07 mm（R²=0.982）",
    "速率-重构目标构造、防泄漏流水线、训练四件套是全系列共享的工程地基",
    "物理软约束与 MC Dropout 给出“融合模板 + 不确定性模板”，后续算法直接复用",
  ], "② GCN：把单个测点扩展成监测网，测点间信息互通、欠观测点借邻居 —— 空间维度的补全。\n③ CNN+Transformer：同一场景换更强架构 —— CNN 前置提局部模式、注意力抓长依赖。\n④ SHAP 归因、⑤ 风险区间、⑥ PINN：在 ① 打好的速率口径上直接叠加。");
  p.writeFile({ fileName: meta.file }).then(() => console.log("written:", meta.file));
}

// ============================================================ ② GCN
/**
 * 构建 ②《GCN 多点监测网时空预测》整份 PPT（共 12 页 + 封面封底）。
 * 页面顺序：定位（单点模型两大盲区）→ 数据（扰动传播）→ 建图 → 时空流水线
 *          → GCN 原理/从零 → ST-GCN 架构 → 精度 → 调参 → 消融+缺测（核心实验）
 *          → 改进（GAT/图平滑/区间）→ Checklist/坑 → 小结。
 */
function buildGCN() {
  const meta = DECKS.gcn, A = meta.accent;
  const p = newPres(meta);
  cover(p, meta);

  // ---- S2 定位
  let s = p.addSlide(); s.background = { color: "FFFFFF" };
  header(s, meta, "算法系列 · 定位", "单点模型的两个盲区，一张图补全");
  card(s, p, M, 1.6, 5.95, 1.95, SOFT);
  s.addText("盲区一：信息不互通", { x: M + 0.25, y: 1.78, w: 5.4, h: 0.3, fontFace: F, fontSize: 15, bold: true, color: PRIMARY, margin: 0 });
  s.addText("逐点独立建模时，邻居测点“当前”的异常速率（扰动正在扩散）对本点完全不可见。例：GNSS-07 速率突增，相邻测点的模型毫无感知。", { x: M + 0.25, y: 2.14, w: 5.45, h: 1.3, fontFace: F, fontSize: 13, color: TEXT, margin: 0, valign: "top" });
  card(s, p, 6.8, 1.6, 5.95, 1.95, SOFT);
  s.addText("盲区二：欠观测无解", { x: 7.05, y: 1.78, w: 5.4, h: 0.3, fontFace: F, fontSize: 15, bold: true, color: PRIMARY, margin: 0 });
  s.addText("传感器故障、传输中断、测点后装是监测网常态，空间欠观测的测点只能硬吃缺口。例：速率通道缺测一天，逐点模型只能拿均值填充。", { x: 7.05, y: 2.14, w: 5.45, h: 1.3, fontFace: F, fontSize: 13, color: TEXT, margin: 0, valign: "top" });
  chevrons(s, p, ["监测网建图\nKNN / 物理连接", "GCN 空间混合\n每步聚合邻居", "GRU 时间演化\n逐节点记忆", "一次预测全网\n12 个测点同时输出"], M, 3.8, 12.2, 0.95, A);
  s.addText("GCN 的回答：把监测网建成图，让信息沿“空间边”流动 —— 时空联合建模（ST-GCN）", { x: M, y: 5.0, w: 12.2, h: 0.35, fontFace: F, fontSize: 14.5, bold: true, color: A, margin: 0 });
  card(s, p, M, 5.5, 12.2, 0.95, SOFT2);
  s.addText([
    { text: "先睹为快（§9.1 实测）：", options: { bold: true, color: A } },
    { text: "单测点速率通道缺测时，图模型 RMSE 仅退化 7.5%，无图模型退化 99.8% —— 图的价值在欠观测场景。", options: { color: TEXT } },
  ], { x: M + 0.25, y: 5.62, w: 11.7, h: 0.72, fontFace: F, fontSize: 13.5, margin: 0, valign: "middle" });
  srcNote(s, meta);
  chrome(s, meta, 2);

  // ---- S3 数据：扰动传播
  s = p.addSlide(); s.background = { color: "FFFFFF" };
  header(s, meta, "演示数据", "12 测点监测网：把“图为什么有用”写进数据");
  card(s, p, M, 1.6, 7.1, 4.5);
  s.addText("三层设计", { x: M + 0.25, y: 1.8, w: 6.5, h: 0.32, fontFace: F, fontSize: 15, bold: true, color: PRIMARY, margin: 0 });
  const lay = [
    ["空间", "易损性因子 g_i 随坐标平滑变化：临空面/坡脚大、后缘小 → 各测点量级差异显著但空间连续"],
    ["驱动", "共享降雨（τ=12 天滞后核）/ 库水位 / 温度 —— 全网同源，与算法①同一套物理机制"],
    ["噪声", "空间相关新息场 w_t：在图上扩散平滑 —— 任何模型都不可预报的底"],
  ];
  lay.forEach(([t, d], i) => {
    const y = 2.25 + i * 1.25;
    s.addText(t, { x: M + 0.25, y, w: 1.0, h: 0.3, fontFace: F, fontSize: 13.5, bold: true, color: A, margin: 0 });
    s.addText(d, { x: M + 1.35, y, w: 5.55, h: 1.1, fontFace: F, fontSize: 12.5, color: TEXT, margin: 0, valign: "top" });
  });
  card(s, p, 7.95, 1.6, 4.8, 4.5, SOFT2);
  s.addText("图的物理依据：扰动传播项", { x: 8.2, y: 1.8, w: 4.4, h: 0.32, fontFace: F, fontSize: 14.5, bold: true, color: A, margin: 0 });
  // 扰动传播公式：独立文本框 + 整框 MONO（【坑】勿与中文 run 混排，见文件头说明）
  s.addText("ε(t) = 0.5·ε(t−1) + w(t) + 0.8·P·w(t−1)", { x: 8.2, y: 2.25, w: 4.4, h: 0.35, fontFace: MONO, fontSize: 12.5, bold: true, color: PRIMARY, margin: 0 });
  bullets(s, [
    { text: "P = 行归一化传播算子：降雨/库水扰动沿坡体渗流扩散", options: {} },
    { text: "邻居“昨日”的扰动“今日”传导至本点", options: {} },
    { text: "单点模型只能靠自身历史 —— 图模型一步聚合邻居当前速率即可见", options: { bold: true } },
    { text: "这是 GCN 相对逐点建模的本质收益来源（§9.1 消融直接验证）", options: {} },
  ], 8.2, 2.75, 4.35, 3.1, { size: 12.5, gap: 8 });
  s.addText("数据规格：长表 date / node_id / x / y / 驱动列 / disp_mm + 测点坐标表，12 测点 × 6 年日尺度", { x: M, y: 6.3, w: 12.2, h: 0.3, fontFace: F, fontSize: 12.5, color: MUTED, margin: 0 });
  srcNote(s, meta);
  chrome(s, meta, 3);

  // ---- S4 建图
  s = p.addSlide(); s.background = { color: "FFFFFF" };
  header(s, meta, "图构建", "监测网 → 图：KNN 是缺省，物理连接优先");
  card(s, p, M, 1.6, 6.0, 3.3);
  s.addText("三步建图", { x: M + 0.25, y: 1.8, w: 5.4, h: 0.32, fontFace: F, fontSize: 15, bold: true, color: PRIMARY, margin: 0 });
  bullets(s, [
    { text: "节点 = 监测点；边 = 空间邻近（K 近邻 K=4）", options: {} },
    { text: "对称化 A ← (A+Aᵀ)>0：无向图", options: {} },
    { text: "归一化 Â = D^(−1/2)(A+I)D^(−1/2)：加自环保留自身信息，度归一化防高度数节点支配", options: {} },
  ], M + 0.25, 2.25, 5.5, 2.5, { size: 13.5 });
  card(s, p, 6.85, 1.6, 5.9, 3.3, SOFT2);
  s.addText("实测图指标", { x: 7.1, y: 1.8, w: 5.3, h: 0.32, fontFace: F, fontSize: 15, bold: true, color: A, margin: 0 });
  kpi(s, 7.1, 2.4, 2.6, "12", "节点（测点）", PRIMARY);
  kpi(s, 9.9, 2.4, 2.6, "5.2", "平均度", PRIMARY);
  s.addText("KNN_K 可作为超参搜索：K 过小图断裂、过大过度平滑", { x: 7.1, y: 4.15, w: 5.4, h: 0.6, fontFace: F, fontSize: 12.5, color: TEXT, margin: 0 });
  card(s, p, M, 5.15, 12.2, 1.3);
  s.addText([
    { text: "建图优先级：", options: { bold: true, color: A } },
    { text: "有明确结构关系（同一断面、同一地质单元）→ 用物理连接建图；没有 → KNN 缺省。地质分区可作为图的社区结构（进阶）。", options: { color: TEXT } },
  ], { x: M + 0.25, y: 5.35, w: 11.7, h: 0.95, fontFace: F, fontSize: 13.5, margin: 0, valign: "middle" });
  srcNote(s, meta);
  chrome(s, meta, 4);

  // ---- S5 时空流水线
  s = p.addSlide(); s.background = { color: "FFFFFF" };
  header(s, meta, "数据流水线", "图版防泄漏：与 ① 同一原则，多一个空间维度");
  chevrons(s, p, ["长表 → 宽表\n(T, N)", "逐测点差分出速率", "训练段 fit\n双 scaler", "全网滑窗\n(30, 12, 4)", "按目标日划分\ntrain/val/test"], M, 1.65, 12.2, 0.95);
  const pts = [
    ["两套 scaler", "共享驱动（降雨/水位/温度）全网一套；速率按测点分别标准化 —— 各测点量级差异大"],
    ["速率通道共用", "输入与输出同一 y_scaler → 递归多步预测可直接回填预测速率"],
    ["样本形状", "全网窗口 (SEQ_LEN, N, F) → 目标日全网速率 (N, 1)，一次预测 12 个测点"],
    ["划分口径", "样本按“目标日期”划分，与 ① 完全一致，防止时序泄漏"],
  ];
  pts.forEach(([t, d], i) => {
    const x = M + (i % 2) * 6.25, y = 3.05 + Math.floor(i / 2) * 1.62;
    card(s, p, x, y, 5.95, 1.4);
    s.addText(t, { x: x + 0.22, y: y + 0.16, w: 5.5, h: 0.3, fontFace: F, fontSize: 14, bold: true, color: PRIMARY, margin: 0 });
    s.addText(d, { x: x + 0.22, y: y + 0.5, w: 5.5, h: 0.85, fontFace: F, fontSize: 12.5, color: TEXT, margin: 0, valign: "top" });
  });
  s.addText("共享参数 + 全网样本 = 相当于单点模型 12 倍的数据量 —— 这是图模型的隐性红利", { x: M, y: 6.4, w: 12.2, h: 0.32, fontFace: F, fontSize: 12.5, bold: true, color: A, margin: 0 });
  srcNote(s, meta);
  chrome(s, meta, 5);

  // ---- S6 GCN 原理与从零
  s = p.addSlide(); s.background = { color: "FFFFFF" };
  header(s, meta, "模型原理 · 从零实现", "GCN：一次矩阵乘完成“邻居信息聚合”");
  card(s, p, M, 1.6, 7.1, 2.5, SOFT2);
  s.addText("谱图卷积的一阶近似（Kipf & Welling, ICLR 2017）", { x: M + 0.25, y: 1.8, w: 6.6, h: 0.32, fontFace: F, fontSize: 14.5, bold: true, color: PRIMARY, margin: 0 });
  // GCN 层公式：独立文本框 + 整框 MONO（公式勿与中文混排）
  s.addText("H^(l+1) = σ( Â · H^(l) · W^(l) )", { x: M + 0.25, y: 2.3, w: 6.6, h: 0.45, fontFace: MONO, fontSize: 16, bold: true, color: A, margin: 0 });
  bullets(s, [
    { text: "Â·H = 一次传播聚合 1 阶邻居；L 层 = L 跳感受野", options: {} },
    { text: "W 在所有节点间共享 —— 平移不变性的图版本", options: {} },
    { text: "岩土含义：每层 GCN = 变形场做一次空间扩散/插值", options: {} },
  ], M + 0.25, 2.85, 6.6, 1.2, { size: 12.5, gap: 6 });
  card(s, p, 7.95, 1.6, 4.8, 2.5);
  s.addText("从零实现 + 双重验证", { x: 8.2, y: 1.8, w: 4.3, h: 0.32, fontFace: F, fontSize: 14.5, bold: true, color: A, margin: 0 });
  bullets(s, [
    { text: "NumPyGCN：两层前向 + 手推反向（利用 Â 的对称性）", options: {} },
    { text: "数值梯度检查 ✅ 全部参数 < 1e-5", options: { bold: true } },
    { text: "与 PyG 官方 GCNConv 对齐 ✅ 最大差 1.71e-08", options: { bold: true } },
  ], 8.2, 2.25, 4.35, 1.75, { size: 12.5, gap: 8 });
  card(s, p, M, 4.4, 12.2, 1.95);
  s.addText("为什么从零实现 GCN 特别值：传播算子 Â 就是“混在矩阵乘里的物理”", { x: M + 0.25, y: 4.58, w: 11.7, h: 0.32, fontFace: F, fontSize: 14, bold: true, color: PRIMARY, margin: 0 });
  s.addText([
    { text: "手推 dL/dH = Âᵀ·(·) 会直观看到：梯度也沿边流动，与前向的信息流对称 —— 之后用 PyG 才能分清“图建错了”还是“训练没调好”。", options: { color: TEXT, breakLine: true } },
    { text: "对齐验证的意义：从零实现容易“自洽但不对”——把同一组权重灌进 PyG GCNConv 比对前向输出，1.71e-08 属 float32 精度级，数学逻辑一致。", options: { color: MID } },
  ], { x: M + 0.25, y: 4.98, w: 11.7, h: 1.3, fontFace: F, fontSize: 12.5, margin: 0, valign: "top", paraSpaceAfter: 6 });
  srcNote(s, meta);
  chrome(s, meta, 6);

  // ---- S7 ST-GCN 架构
  s = p.addSlide(); s.background = { color: "FFFFFF" };
  header(s, meta, "时空架构", "ST-GCN：空间混合 × 时间演化，一次输出全网");
  const arch = [
    ["输入", "全网窗口\n(30 天, 12 点, 4 特征)", MID],
    ["空间：GCN×2", "每个时间步\nÂ·H·W 聚合邻居", PRIMARY],
    ["时间：GRU", "每个节点一条序列\n最后时刻隐状态", PRIMARY],
    ["节点回归头", "Linear→ReLU→Linear\n输出 (12 点, 1)", A],
  ];
  arch.forEach(([t, d, c], i) => {
    const x = M + i * 3.15;
    s.addShape(p.shapes.ROUNDED_RECTANGLE, { x, y: 1.75, w: 2.85, h: 1.75, fill: { color: c }, line: { color: c, width: 0.75 }, rectRadius: 0.06, shadow: shadow() });
    s.addText(t, { x, y: 1.95, w: 2.85, h: 0.35, fontFace: F, fontSize: 15, bold: true, color: "FFFFFF", align: "center", margin: 0 });
    s.addText(d, { x: x + 0.1, y: 2.4, w: 2.65, h: 1.0, fontFace: F, fontSize: 12, color: "E8EEF4", align: "center", margin: 0, valign: "top" });
    if (i < 3) s.addText("→", { x: x + 2.85, y: 2.35, w: 0.3, h: 0.5, fontFace: F, fontSize: 20, bold: true, color: MUTED, align: "center", margin: 0 });
  });
  const sw = [
    ["conv_type = gcn", "均匀聚合（默认）", "§9.1 消融基准"],
    ["conv_type = gat", "注意力聚合：让模型学“该听谁的”", "§9.2 对比"],
    ["conv_type = id", "不聚合 = 无图基线（各点独立 GRU）", "§9.1 消融"],
    ["use_rnn = false", "去掉时间记忆 = GCN-only", "§9.1 消融"],
  ];
  sw.forEach(([t, d, tag], i) => {
    const x = M + (i % 2) * 6.25, y = 3.95 + Math.floor(i / 2) * 1.28;
    card(s, p, x, y, 5.95, 1.08);
    s.addText([{ text: t + "  ", options: { fontFace: MONO, fontSize: 13, bold: true, color: PRIMARY } }, { text: tag, options: { fontFace: F, fontSize: 11.5, color: A, bold: true } }], { x: x + 0.22, y: y + 0.12, w: 5.5, h: 0.32, margin: 0 });
    s.addText(d, { x: x + 0.22, y: y + 0.5, w: 5.5, h: 0.5, fontFace: F, fontSize: 12, color: TEXT, margin: 0, valign: "top" });
  });
  s.addText("所有开关都是为 §9 消融实验准备的：图和时序各贡献多少，拆开验证", { x: M, y: 6.5, w: 12.2, h: 0.3, fontFace: F, fontSize: 12.5, bold: true, color: A, margin: 0 });
  srcNote(s, meta);
  chrome(s, meta, 7);

  // ---- S8 训练与精度
  s = p.addSlide(); s.background = { color: "FFFFFF" };
  header(s, meta, "精度检验", "全网口径 + 逐节点口径：平均好 ≠ 每点都好");
  const kpis2 = [["0.3346", "test RMSE (mm/day)", A], ["0.805", "test R² / NSE", PRIMARY], ["13.98", "累积重构 RMSE (mm)", PRIMARY], ["11.59", "递归 30 步误差 (mm)", MID]];
  kpis2.forEach(([v, l, c], i) => {
    card(s, p, M + i * 3.13, 1.6, 2.85, 1.55, i % 2 ? SOFT : SOFT2);
    kpi(s, M + i * 3.13, 1.78, 2.85, v, l, c);
  });
  bullets(s, [
    { text: "训练即“12 倍数据”：全网所有测点联合优化，共享参数，早停于 epoch 64（val 0.2401）", options: {} },
    { text: "逐节点指标表按 RMSE 降序：找出“预测得最差”的关键测点 —— 往往是易损性高、量级大的坡脚点", options: {} },
    { text: "空间误差图：节点颜色 = 该测点 RMSE，直接服务风险评价（哪些区域预测不可靠）", options: {} },
    { text: "递归多步：预测速率回填输入通道，45 天滚动，误差随步长近线性增长", options: {} },
    { text: "审稿提醒：累积口径 R²≈1.000 有量级“稀释”效应（位移基数大），不能单独作为精度证据，须与速率口径同报", options: { color: A } },
  ], M, 3.55, 12.2, 2.9, { size: 14, gap: 9 });
  srcNote(s, meta);
  chrome(s, meta, 8);

  // ---- S9 调参
  s = p.addSlide(); s.background = { color: "FFFFFF" };
  header(s, meta, "调参", "随机搜索 10 组：图模型特有的两个超参");
  card(s, p, M, 1.6, 7.0, 4.4);
  s.addText("最优配置（val RMSE 0.3649）", { x: M + 0.25, y: 1.8, w: 6.5, h: 0.32, fontFace: F, fontSize: 15, bold: true, color: A, margin: 0 });
  const cfg2 = [["hidden", "64"], ["gcn_layers", "1"], ["rnn_layers", "2"], ["dropout", "0.0"], ["lr", "3e-4"], ["batch", "64"]];
  cfg2.forEach(([k, v], i) => {
    const x = M + 0.25 + (i % 3) * 2.2, y = 2.35 + Math.floor(i / 3) * 0.8;
    card(s, p, x, y, 2.0, 0.65, SOFT2);
    s.addText([{ text: `${k} `, options: { fontSize: 11, color: MUTED } }, { text: v, options: { fontSize: 13.5, bold: true, color: PRIMARY } }], { x, y, w: 2.0, h: 0.65, fontFace: MONO, align: "center", valign: "middle", margin: 0 });
  });
  bullets(s, [
    { text: "gcn_layers=1 赢：N=12 的小网，1 跳邻居已够，2 层反而过平滑", options: {} },
    { text: "rnn_layers=2 + 小 lr：时间记忆比空间混合更吃容量", options: {} },
    { text: "搜索空间：hidden / gcn_layers / rnn_layers / dropout / lr / batch", options: {} },
  ], M + 0.25, 4.15, 6.5, 1.7, { size: 13, gap: 8 });
  card(s, p, 7.85, 1.6, 4.9, 4.4, SOFT2);
  s.addText("图模型特有超参", { x: 8.1, y: 1.8, w: 4.4, h: 0.32, fontFace: F, fontSize: 15, bold: true, color: A, margin: 0 });
  bullets(s, [
    { text: "KNN_K（建图近邻数）：过小图断裂、过大过度平滑\n建议结合测点间距与影响范围设定，或作为超参搜索", options: {} },
    { text: "GCN 层数 = 感受野跳数：N<50 时 1~2 层足够\n层数多会过平滑，所有测点趋于同值", options: {} },
    { text: "其余清单与 ① §8.1 一致：lr / hidden / dropout / batch / seq_len", options: {} },
  ], 8.1, 2.25, 4.4, 3.5, { size: 13, gap: 10 });
  srcNote(s, meta);
  chrome(s, meta, 9);

  // ---- S10 消融 + 缺测（killer）
  s = p.addSlide(); s.background = { color: "FFFFFF" };
  header(s, meta, "消融实验", "图的真正价值，在“缺测”时才显现");
  s.addChart(p.charts.BAR, [{
    name: "单测点速率缺测后 RMSE 退化 (%)",
    labels: ["ST-GCN（图）", "GRU-only（无图）"],
    values: [7.5, 99.8],
  }], chartBase({
    x: M, y: 1.7, w: 6.4, h: 3.3, barDir: "bar",
    chartColors: [PRIMARY, A], varyColors: true,
    showValue: true, dataLabelPosition: "outEnd", dataLabelFormatCode: "0.0",
    valAxisMaxVal: 110, barGapWidthPct: 70,
  }));
  s.addText("情景：某测点速率通道缺测（传感器故障/传输中断，以训练均值填充）", { x: M, y: 5.1, w: 6.4, h: 0.55, fontFace: F, fontSize: 12.5, color: MUTED, margin: 0 });
  card(s, p, 7.3, 1.7, 5.45, 4.3);
  s.addText("两层结论", { x: 7.55, y: 1.9, w: 4.9, h: 0.32, fontFace: F, fontSize: 15, bold: true, color: PRIMARY, margin: 0 });
  bullets(s, [
    { text: "信息充分时（全测点历史完整）：GRU-only 0.3237 ≈ ST-GCN 0.3319 —— 共享权重的逐点模型已接近信息充分，图增益有限（GCN-only 0.3456 最差：时间记忆更基础）", options: {} },
    { text: "欠观测时（监测网常态）：图模型靠邻居聚合把缺口补上 —— 平均退化 7.5% vs 99.8%", options: { bold: true } },
    { text: "这一条是论文里论证“为什么要建图”的决定性实验", options: { color: A, bold: true } },
  ], 7.55, 2.3, 4.95, 3.5, { size: 13, gap: 10 });
  srcNote(s, meta);
  chrome(s, meta, 10);

  // ---- S11 改进
  s = p.addSlide(); s.background = { color: "FFFFFF" };
  header(s, meta, "改进", "GAT 注意力 · 图平滑物理正则 · MC Dropout");
  const imp = [
    ["GAT 注意力聚合", "为每条边学注意力系数 α_ij：坡脚受扰动的邻居应比稳定区邻居权重更高", "ST-GAT test RMSE 0.3275（优于调参后 ST-GCN 的 0.3319）", A],
    ["图平滑物理正则", "变形场空间连续先验：相邻测点速率不应突变 →\nDirichlet 能量作为软约束，λ 验证集选择", "λ*=0：先验与数据一致；累积口径 RMSE 10.30mm（全表最优）", PRIMARY],
    ["MC Dropout 区间", "保持 Dropout 采样 50 次 → 全网 95% 区间；逐测点区间宽度可做空间分布图", "PICP = 0.462 → 过自信；升级路线 Conformal / 分位数（算法⑤）", MID],
  ];
  imp.forEach(([t, d, r, c], i) => {
    const y = 1.65 + i * 1.58;
    card(s, p, M, y, 12.2, 1.4, i === 1 ? SOFT2 : SOFT);
    s.addText(t, { x: M + 0.25, y: y + 0.14, w: 3.1, h: 1.1, fontFace: F, fontSize: 15, bold: true, color: c, margin: 0, valign: "top" });
    s.addText(d, { x: M + 3.5, y: y + 0.12, w: 5.6, h: 1.2, fontFace: F, fontSize: 12.5, color: TEXT, margin: 0, valign: "middle" });
    s.addText(r, { x: M + 9.3, y: y + 0.12, w: 2.75, h: 1.2, fontFace: F, fontSize: 12, bold: true, color: c, margin: 0, valign: "middle" });
  });
  s.addText("与 ① 的物理软约束同一模板：把“物理上不该发生的事”变成损失项 —— 全系列通用的融合范式", { x: M, y: 6.42, w: 12.2, h: 0.3, fontFace: F, fontSize: 12.5, bold: true, color: A, margin: 0 });
  srcNote(s, meta);
  chrome(s, meta, 11);

  // ---- S12 Checklist + 坑
  s = p.addSlide(); s.background = { color: "FFFFFF" };
  header(s, meta, "落地指南", "接入真实数据 Checklist 与常见坑");
  card(s, p, M, 1.6, 6.6, 4.9);
  s.addText("Checklist", { x: M + 0.25, y: 1.8, w: 6.0, h: 0.32, fontFace: F, fontSize: 15, bold: true, color: PRIMARY, margin: 0 });
  const cl2 = ["监测长表 + 测点坐标表放入 GCN/", "改配置区 DATA_PATH / EXOG_COLS / TARGET_COL，逐测点差分", "建图优先物理关系（同断面/地质单元），没有再用 KNN", "N<8 图收益有限回退 ①；N>50 用 1~2 层防过平滑", "先基线 → §9.1 消融 + 缺测情景论证图的价值（审稿人必问）→ 调参 → GAT/物理正则", "风险评估：§9.4 逐测点区间 → 不确定性空间分布图"];
  s.addText(cl2.map((t, i) => ({ text: `${i + 1}.  ${t}`, options: { breakLine: true } })), { x: M + 0.25, y: 2.25, w: 6.15, h: 3.6, fontFace: F, fontSize: 12.5, color: TEXT, paraSpaceAfter: 9, margin: 0, valign: "top" });
  card(s, p, 7.45, 1.6, 5.3, 4.9, SOFT2);
  s.addText("常见坑速查", { x: 7.7, y: 1.8, w: 4.8, h: 0.32, fontFace: F, fontSize: 15, bold: true, color: A, margin: 0 });
  const pits2 = ["无向图忘了对称化 ❌", "A+I 忘加自环（节点丢失自身特征）❌", "层数堆太深 → 过平滑 ❌", "全量数据 fit scaler ❌", "直接预测累积位移 ❌", "随机划分样本 ❌", "全网平均指标掩盖薄弱测点 ❌"];
  s.addText(pits2.map((t) => ({ text: t, options: { bullet: bu(12), breakLine: true } })), { x: 7.7, y: 2.25, w: 4.85, h: 3.4, fontFace: F, fontSize: 13, color: TEXT, paraSpaceAfter: 10, margin: 0 });
  s.addText("缺测情景实验模板可直接迁移到任何监测网", { x: 7.7, y: 5.95, w: 4.8, h: 0.4, fontFace: F, fontSize: 12, color: MUTED, margin: 0 });
  srcNote(s, meta);
  chrome(s, meta, 12);

  closing(p, meta, [
    "交付：KNN 建图 + NumPy 从零 GCN（对齐 PyG）+ ST-GCN/ST-GAT + 消融与缺测实验 + 物理正则 + 全网区间",
    "基线 test RMSE 0.3346 mm/day（R²=0.805），全网联合训练 = 12 倍样本红利",
    "核心实证：信息充分时图增益有限；缺测时图退化 7.5% vs 无图 99.8% —— 图的价值在欠观测",
  ], "③ CNN+Transformer：把 ST-GCN 里的 GRU 换成注意力，时间维度升级（ST-Transformer 是自然延伸）。\n⑤ 分位数/Conformal：把 MC Dropout 的过自信区间换成覆盖有保障的风险区间。\n⑥ 图 PINN：把渗流/固结 PDE 残差写到图上，物理正则从“平滑先验”升级为“方程约束”。");
  p.writeFile({ fileName: meta.file }).then(() => console.log("written:", meta.file));
}

// ============================================================ ③ CNN-Transformer
/**
 * 构建 ③《CNN + Transformer 单点位移预测》整份 PPT（共 12 页 + 封面封底）。
 * 页面顺序：定位（CNN/注意力分工）→ 数据与口径 → CNN 原理 → Attention 原理
 *          → 从零实现 → 完整架构 → 精度 → 调参+窗口敏感性 → 消融
 *          → 可解释/物理先验/区间 → Checklist/坑 → 小结。
 */
function buildCT() {
  const meta = DECKS.ct, A = meta.accent;
  const p = newPres(meta);
  cover(p, meta);

  // ---- S2 定位：分工
  let s = p.addSlide(); s.background = { color: "FFFFFF" };
  header(s, meta, "算法系列 · 定位", "CNN 前置提局部模式，Transformer 抓长依赖");
  card(s, p, M, 1.6, 5.95, 3.0, SOFT);
  s.addText("CNN = 局部模式扫描仪", { x: M + 0.25, y: 1.8, w: 5.4, h: 0.32, fontFace: F, fontSize: 15.5, bold: true, color: PRIMARY, margin: 0 });
  bullets(s, [
    { text: "卷积核只看相邻几天：周期波动、短期趋势、事件响应形态", options: {} },
    { text: "权值共享 + 局部感受野 → 参数少、归纳偏置强", options: {} },
    { text: "小样本下比注意力更稳，是“兜底”的特征提取器", options: {} },
  ], M + 0.25, 2.25, 5.45, 2.2, { size: 13.5, gap: 9 });
  card(s, p, 6.8, 1.6, 5.95, 3.0, SOFT);
  s.addText("Transformer = 全局观察者", { x: 7.05, y: 1.8, w: 5.4, h: 0.32, fontFace: F, fontSize: 15.5, bold: true, color: A, margin: 0 });
  bullets(s, [
    { text: "任意两个时间步直接相连：信息路径 O(1)（RNN 是 O(T)）", options: {} },
    { text: "建模“事件在几十步后的延迟影响”这类长距离依赖", options: {} },
    { text: "整窗并行计算，训练快；注意力矩阵可解释", options: {} },
  ], 7.05, 2.25, 5.45, 2.2, { size: 13.5, gap: 9 });
  s.addText("① LSTM 的两个结构痛点：信息逐步传递、窗口加长梯度路径变长、无法并行 —— 本篇一次解决", { x: M, y: 4.85, w: 12.2, h: 0.35, fontFace: F, fontSize: 13.5, bold: true, color: A, margin: 0 });
  card(s, p, M, 5.35, 12.2, 1.15);
  s.addText([
    { text: "流水线：", options: { bold: true, color: PRIMARY } },
    { text: "原始序列 → (CNN 前置) 含局部模式的特征图 → (+ 位置编码) → Transformer 编码器 → 最后时刻表示 → 未来速率", options: { color: TEXT } },
  ], { x: M + 0.25, y: 5.5, w: 11.7, h: 0.85, fontFace: F, fontSize: 14, margin: 0, valign: "middle" });
  srcNote(s, meta);
  chrome(s, meta, 2);

  // ---- S3 数据与窗口
  s = p.addSlide(); s.background = { color: "FFFFFF" };
  header(s, meta, "数据与口径", "与 ① 同一数据、同一口径：只换架构，公平对比");
  card(s, p, M, 1.6, 6.6, 4.5);
  s.addText("完全一致的工程标准", { x: M + 0.25, y: 1.8, w: 6.0, h: 0.32, fontFace: F, fontSize: 15, bold: true, color: PRIMARY, margin: 0 });
  bullets(s, [
    { text: "同一份合成机制（蠕变 + τ=12 天有效降雨 + 骤降 + 噪声，2190 天）", options: {} },
    { text: "同一套防泄漏流水线：训练段 fit scaler、按目标时刻 70/15/15", options: {} },
    { text: "同一目标：位移速率（mm/day），累积重构口径评估", options: {} },
    { text: "同一训练四件套：AdamW + 早停回滚 + LR 调度 + 梯度裁剪", options: {} },
  ], M + 0.25, 2.25, 6.1, 2.6, { size: 13.5, gap: 9 });
  s.addText("→ 三本 Notebook 的结果可以横向比较：架构差异不被工程差异污染", { x: M + 0.25, y: 5.35, w: 6.1, h: 0.6, fontFace: F, fontSize: 12.5, bold: true, color: A, margin: 0 });
  card(s, p, 7.45, 1.6, 5.3, 4.5, SOFT2);
  s.addText("本篇特有：SEQ_LEN = 60", { x: 7.7, y: 1.8, w: 4.8, h: 0.32, fontFace: F, fontSize: 15, bold: true, color: A, margin: 0 });
  bullets(s, [
    { text: "① 用 30 天：RNN 窗口越长梯度路径越长", options: {} },
    { text: "本篇用 60 天：注意力任意两步直连，加长窗口没有结构代价", options: { bold: true } },
    { text: "为“长依赖”留出发挥空间（§8.3 用 30/60/90 做敏感性）", options: {} },
    { text: "HORIZON=1，多步预测走递归回填（§7）", options: {} },
  ], 7.7, 2.25, 4.8, 2.8, { size: 13.5, gap: 10 });
  s.addText("输入特征：降雨 / 库水位 / 温度 / 位移速率（自回归）", { x: 7.7, y: 5.5, w: 4.8, h: 0.5, fontFace: F, fontSize: 12.5, color: MUTED, margin: 0 });
  srcNote(s, meta);
  chrome(s, meta, 3);

  // ---- S4 CNN 原理
  s = p.addSlide(); s.background = { color: "FFFFFF" };
  header(s, meta, "组件原理 I", "因果卷积：CNN 核就是一个“可学习的响应核”");
  card(s, p, M, 1.6, 7.1, 2.6, SOFT2);
  s.addText("因果一维卷积", { x: M + 0.25, y: 1.78, w: 6.5, h: 0.32, fontFace: F, fontSize: 14.5, bold: true, color: PRIMARY, margin: 0 });
  // 因果卷积公式：独立文本框 + 整框 MONO
  s.addText("out(t) = Σ_j w(j)·x(t−K+1+j) + b", { x: M + 0.25, y: 2.2, w: 6.5, h: 0.4, fontFace: MONO, fontSize: 15, bold: true, color: A, margin: 0 });
  bullets(s, [
    { text: "只在左侧补 K−1 个零：t 时刻只依赖 ≤t 的输入（时间不倒流）", options: {} },
    { text: "权值共享：同一核扫全序列，参数量与序列长度无关", options: {} },
    { text: "膨胀卷积 d：隔 d 天采样；堆两层 RF = 1+4+8 = 13 天", options: {} },
  ], M + 0.25, 2.7, 6.6, 1.4, { size: 12.5, gap: 6 });
  card(s, p, 7.95, 1.6, 4.8, 2.6);
  s.addText("岩土含义", { x: 8.2, y: 1.78, w: 4.3, h: 0.32, fontFace: F, fontSize: 14.5, bold: true, color: A, margin: 0 });
  s.addText("第一层作用在降雨通道上的卷积核 = “过去 K 天降雨对当前速率的响应系数”。若它学成非负、滞后衰减形态，正好对应降雨入渗的渗流滞后（τ≈12 天）—— §9.3 据此设计物理软约束。", { x: 8.2, y: 2.2, w: 4.35, h: 1.9, fontFace: F, fontSize: 12.5, color: TEXT, margin: 0, valign: "top" });
  card(s, p, M, 4.5, 12.2, 1.75);
  s.addText("为什么 CNN 前置而不是后置", { x: M + 0.25, y: 4.68, w: 11.7, h: 0.32, fontFace: F, fontSize: 14, bold: true, color: PRIMARY, margin: 0 });
  bullets(s, [
    { text: "原始特征噪声大、局部结构强 → 先用 CNN 把局部模式压进特征，注意力在更“干净”的特征上找长依赖", options: {} },
    { text: "CNN 参数少、归纳偏置强，在小样本时充当正则器 —— 这是“前置”相对“后置融合”的核心优势", options: {} },
  ], M + 0.25, 5.08, 11.7, 1.1, { size: 13, gap: 7 });
  srcNote(s, meta);
  chrome(s, meta, 4);

  // ---- S5 Attention 原理
  s = p.addSlide(); s.background = { color: "FFFFFF" };
  header(s, meta, "组件原理 II", "自注意力：一张可读的“长依赖地图”");
  card(s, p, M, 1.6, 7.1, 2.6, SOFT2);
  s.addText("缩放点积注意力（Vaswani et al., 2017）", { x: M + 0.25, y: 1.78, w: 6.5, h: 0.32, fontFace: F, fontSize: 14.5, bold: true, color: PRIMARY, margin: 0 });
  // 注意力公式：独立文本框 + 整框 MONO
  s.addText("Attention(Q,K,V) = softmax( QKᵀ / √d_k ) · V", { x: M + 0.25, y: 2.2, w: 6.5, h: 0.4, fontFace: MONO, fontSize: 15, bold: true, color: A, margin: 0 });
  bullets(s, [
    { text: "Q/K/V 由同一序列投影（自注意力）；softmax 行 = 各历史时刻的重要度", options: {} },
    { text: "多头：并行多组低秩投影，一头看周期、一头看突变", options: {} },
    { text: "代价：O(T²) 矩阵 + 顺序信息丢失 → 必须加位置编码", options: {} },
  ], M + 0.25, 2.7, 6.6, 1.4, { size: 12.5, gap: 6 });
  card(s, p, 7.95, 1.6, 4.8, 2.6);
  s.addText("位置编码（正弦）", { x: 8.2, y: 1.78, w: 4.3, h: 0.32, fontFace: F, fontSize: 14.5, bold: true, color: A, margin: 0 });
  // 位置编码公式：独立文本框 + 整框 MONO
  s.addText("PE(pos,2i)=sin(pos/10000^(2i/d)), cos 交替", { x: 8.2, y: 2.18, w: 4.35, h: 0.3, fontFace: MONO, fontSize: 11.5, color: PRIMARY, margin: 0 });
  bullets(s, [
    { text: "无需训练，每行是唯一的位置指纹", options: {} },
    { text: "相邻位置编码相近 → 注意力可感知时间距离", options: {} },
    { text: "加在 CNN 输出后、注意力前", options: {} },
  ], 8.2, 2.62, 4.35, 1.5, { size: 12.5, gap: 6 });
  card(s, p, M, 4.5, 12.2, 1.75);
  s.addText("长依赖的直观对照", { x: M + 0.25, y: 4.68, w: 11.7, h: 0.32, fontFace: F, fontSize: 14, bold: true, color: PRIMARY, margin: 0 });
  bullets(s, [
    { text: "RNN：暴雨(第 1 天) → 影响(第 30 天)，信号要走 30 步，梯度路径同样 30 步", options: {} },
    { text: "Attention：两步直连，注意力权重直接告诉你“看了第 1 天多少” —— 延迟影响变成可读、可画、可核查的证据（§9.2）", options: {} },
  ], M + 0.25, 5.08, 11.7, 1.1, { size: 13, gap: 7 });
  srcNote(s, meta);
  chrome(s, meta, 5);

  // ---- S6 从零实现
  s = p.addSlide(); s.background = { color: "FFFFFF" };
  header(s, meta, "从零实现", "NumPy 手写两个组件：四个验证全绿");
  const impl = [
    ["NumPyCausalConv1d", "滑窗矩阵 (K,T) 前向；反向 dw=cols·dout，dx=convolve(dout,w)", "梯度检查 ✅（w 与 x）", "与 F.conv1d 对齐 ✅ 差 0.0"],
    ["NumPySelfAttention", "softmax 前向（平移不变数值稳定）；反向用雅可比 dS=A∘(dA−行和(A∘dA))", "梯度检查 ✅（Wq/Wk/Wv）", "与官方 sdpa 对齐 ✅ 差 2.2e-16"],
  ];
  impl.forEach(([t, d1, d2, d3], i) => {
    const y = 1.65 + i * 1.72;
    card(s, p, M, y, 12.2, 1.5, i ? SOFT2 : SOFT);
    s.addText(t, { x: M + 0.25, y: y + 0.14, w: 2.9, h: 1.2, fontFace: MONO, fontSize: 13.5, bold: true, color: PRIMARY, margin: 0, valign: "top" });
    s.addText(d1, { x: M + 3.3, y: y + 0.12, w: 4.9, h: 1.28, fontFace: F, fontSize: 12.5, color: TEXT, margin: 0, valign: "middle" });
    s.addText(d2 + "\n" + d3, { x: M + 8.4, y: y + 0.12, w: 3.6, h: 1.28, fontFace: F, fontSize: 12, bold: true, color: A, margin: 0, valign: "middle" });
  });
  card(s, p, M, 5.25, 12.2, 1.2);
  s.addText([
    { text: "最难的片段是 softmax 雅可比：", options: { bold: true, color: A } },
    { text: " ∂A_ij/∂S_ik = A_ij(δ_jk − A_ik)，与上游 dA 收缩得 dS_ij = A_ij(dA_ij − Σ_k A_ik·dA_ik)。用线性探针 L=⟨dO,O⟩ 做数值检查。", options: { color: TEXT } },
  ], { x: M + 0.25, y: 5.4, w: 11.7, h: 0.95, fontFace: F, fontSize: 12.5, margin: 0, valign: "middle" });
  srcNote(s, meta);
  chrome(s, meta, 6);

  // ---- S7 完整架构
  s = p.addSlide(); s.background = { color: "FFFFFF" };
  header(s, meta, "完整架构", "五段流水线：每一段都有明确的分工");
  const arch = [
    ["输入窗口", "(60 天, 4 特征)", MID],
    ["因果 CNN 塔", "2 层 × 48 通道\nK=5, d=(1,2)\nRF = 13 天", PRIMARY],
    ["投影 + PE", "Linear→d_model\n+ 正弦位置编码", PRIMARY],
    ["Transformer ×L", "pre-LN 自注意力\n+ FFN(GELU)", A],
    ["回归头", "取 h(T) → MLP\n输出速率", PRIMARY],
  ];
  arch.forEach(([t, d, c], i) => {
    const x = M + i * 2.52;
    s.addShape(p.shapes.ROUNDED_RECTANGLE, { x, y: 1.7, w: 2.25, h: 1.95, fill: { color: c }, line: { color: c, width: 0.75 }, rectRadius: 0.06, shadow: shadow() });
    s.addText(t, { x, y: 1.88, w: 2.25, h: 0.34, fontFace: F, fontSize: 13.5, bold: true, color: "FFFFFF", align: "center", margin: 0 });
    s.addText(d, { x: x + 0.08, y: 2.28, w: 2.1, h: 1.25, fontFace: F, fontSize: 11.5, color: "E8EEF4", align: "center", margin: 0, valign: "top" });
    if (i < 4) s.addText("→", { x: x + 2.2, y: 2.4, w: 0.35, h: 0.5, fontFace: F, fontSize: 19, bold: true, color: MUTED, align: "center", margin: 0 });
  });
  const notes = [
    ["pre-LN 而非 post-LN", "先归一化再子层：小数据、无 warmup 下稳定得多"],
    ["取最后时刻 h(T)", "因果卷积保证只汇总 ≤t 信息，与递归部署一致"],
    ["开关化设计", "use_cnn / use_attn 可关 → §9.1 消融"],
    ["规模", "基线约 11.8 万参数，CPU 数十秒可复现"],
  ];
  notes.forEach(([t, d], i) => {
    const x = M + (i % 2) * 6.25, y = 4.05 + Math.floor(i / 2) * 1.16;
    card(s, p, x, y, 5.95, 1.0);
    s.addText(t, { x: x + 0.22, y: y + 0.1, w: 5.5, h: 0.3, fontFace: F, fontSize: 13.5, bold: true, color: PRIMARY, margin: 0 });
    s.addText(d, { x: x + 0.22, y: y + 0.42, w: 5.5, h: 0.5, fontFace: F, fontSize: 12, color: TEXT, margin: 0, valign: "top" });
  });
  s.addText("自定义 TransformerBlock（基于 nn.MultiheadAttention）：注意力权重可取出，供 §9.2 可视化", { x: M, y: 6.42, w: 12.2, h: 0.3, fontFace: F, fontSize: 12.5, bold: true, color: A, margin: 0 });
  srcNote(s, meta);
  chrome(s, meta, 7);

  // ---- S8 精度
  s = p.addSlide(); s.background = { color: "FFFFFF" };
  header(s, meta, "精度检验", "两级口径：单步精度与累积应用都站得住");
  const kpis3 = [["0.2632", "test RMSE (mm/day)·调参后", A], ["0.711", "test R² / NSE", PRIMARY], ["10.42", "累积重构 RMSE (mm)", PRIMARY], ["0.990", "累积重构 R²", A]];
  kpis3.forEach(([v, l, c], i) => {
    card(s, p, M + i * 3.13, 1.6, 2.85, 1.55, i % 2 ? SOFT : SOFT2);
    kpi(s, M + i * 3.13, 1.78, 2.85, v, l, c);
  });
  bullets(s, [
    { text: "与 ① 同口径对比：LSTM 调参后 0.2570 vs 本篇 0.2632 —— 单步精度相当；结构优势体现在别处（下两页）", options: {} },
    { text: "累积重构 R²=0.990，优于 ① 基线的 0.982：多步误差累积更慢", options: {} },
    { text: "递归 45 天滚动预测：误差随步长近线性增长（无递归结构爆炸）", options: {} },
    { text: "检验面板：速率过程线 + 累积重构 + 残差直方图 + 多起点 RMSE 曲线", options: {} },
  ], M, 3.6, 12.2, 2.5, { size: 14, gap: 10 });
  srcNote(s, meta);
  chrome(s, meta, 8);

  // ---- S9 调参 + SEQ_LEN
  s = p.addSlide(); s.background = { color: "FFFFFF" };
  header(s, meta, "调参", "随机搜索 + 窗口敏感性：长上下文是 Transformer 的主场");
  s.addChart(p.charts.LINE, [
    { name: "val", labels: ["30", "60", "90"], values: [0.2828, 0.2791, 0.2824] },
    { name: "test", labels: ["30", "60", "90"], values: [0.2624, 0.2632, 0.2631] },
  ], chartBase({
    x: M, y: 1.7, w: 6.4, h: 3.4, lineSize: 2.5,
    chartColors: [MID, A], showLegend: true, legendPos: "b", legendFontFace: F, legendFontSize: 12,
    showValue: true, dataLabelPosition: "t", dataLabelFormatCode: "0.000", lineSmooth: false,
  }));
  s.addText("SEQ_LEN 敏感性（天）：加长窗口只增大注意力矩阵，不拉长信号路径", { x: M, y: 5.2, w: 6.4, h: 0.35, fontFace: F, fontSize: 12.5, color: MUTED, align: "center", margin: 0 });
  card(s, p, 7.3, 1.7, 5.45, 4.3);
  s.addText("最优配置（val RMSE 0.2791）", { x: 7.55, y: 1.9, w: 4.9, h: 0.32, fontFace: F, fontSize: 15, bold: true, color: A, margin: 0 });
  const cfg3 = [["d_model", "32"], ["nhead", "2"], ["layers", "1"], ["kernel", "3"], ["dropout", "0.1"], ["lr", "3e-4"]];
  cfg3.forEach(([k, v], i) => {
    const x = 7.55 + (i % 3) * 1.72, y = 2.4 + Math.floor(i / 3) * 0.75;
    card(s, p, x, y, 1.58, 0.62, SOFT2);
    s.addText([{ text: `${k} `, options: { fontSize: 10.5, color: MUTED } }, { text: v, options: { fontSize: 12.5, bold: true, color: PRIMARY } }], { x, y, w: 1.58, h: 0.62, fontFace: MONO, align: "center", valign: "middle", margin: 0 });
  });
  bullets(s, [
    { text: "容量三件套宁小勿大：2119 个训练窗口撑不起大模型", options: {} },
    { text: "nhead 必须整除 d_model", options: {} },
    { text: "SEQ_LEN 读法：60 天内已覆盖有效信息；若物理记忆更长（跨雨季水文记忆）应加长并重训", options: {} },
  ], 7.55, 4.0, 4.95, 1.9, { size: 12.5, gap: 8 });
  srcNote(s, meta);
  chrome(s, meta, 9);

  // ---- S10 消融
  s = p.addSlide(); s.background = { color: "FFFFFF" };
  header(s, meta, "消融实验", "CNN 前置与注意力各贡献了多少");
  s.addChart(p.charts.BAR, [{
    name: "test RMSE (mm/day)",
    labels: ["CNN-Transformer(完整)", "CNN-only(无注意力)", "Transformer-only(无CNN)"],
    values: [0.2632, 0.2639, 0.2941],
  }], chartBase({
    x: M, y: 1.7, w: 6.6, h: 3.3, barDir: "bar",
    chartColors: [A, PRIMARY, MID], varyColors: true,
    showValue: true, dataLabelPosition: "outEnd",
    valAxisMinVal: 0.25, valAxisMaxVal: 0.30, barGapWidthPct: 60,
  }));
  s.addText("同一最优配置，只关开关", { x: M, y: 5.1, w: 6.6, h: 0.3, fontFace: F, fontSize: 12.5, color: MUTED, align: "center", margin: 0 });
  card(s, p, 7.5, 1.7, 5.25, 4.3);
  s.addText("怎么读", { x: 7.75, y: 1.9, w: 4.7, h: 0.32, fontFace: F, fontSize: 15, bold: true, color: PRIMARY, margin: 0 });
  bullets(s, [
    { text: "本数据局部模式主导：CNN-only 已接近完整模型 —— 日尺度 + 一阶雨响应，CNN 的归纳偏置即可覆盖", options: {} },
    { text: "去掉 CNN 掉得最狠（0.2941）：注意力能学局部模式，但小样本下又慢又费参数 —— CNN 前置的收益是样本效率与稳定性", options: { bold: true } },
    { text: "另两点不体现在单步 RMSE：并行训练速度、长窗口可扩展性（§8.3）", options: {} },
  ], 7.75, 2.3, 4.75, 3.5, { size: 13, gap: 10 });
  srcNote(s, meta);
  chrome(s, meta, 10);

  // ---- S11 可解释 + 物理 + 不确定性
  s = p.addSlide(); s.background = { color: "FFFFFF" };
  header(s, meta, "改进", "注意力可视化 · 响应核物理先验 · MC Dropout");
  const imp = [
    ["注意力可视化", "最后时刻 query 的注意力按滞后展开，与渗流滞后核 e^(−k/τ) 叠加对照；热图 + 滞后曲线", "峰值滞后 ~30 天、分布分散 —— 是证据不是因果归因，解读需谨慎", A],
    ["卷积核物理先验", "K 加宽到 15(≈2τ) 才能装下衰减形状：L = MSE + λ[1−cos(k_rain, k_exp) + 非负罚]", "λ*=0：无正则核已部分呈衰减形态（最一致通道 cos=0.58）—— 核可直接读出响应形状", PRIMARY],
    ["MC Dropout 区间", "采样 50 次 → 95% 区间；区间宽度分布 + PICP 检查", "PICP = 0.512 → 过自信；升级路线 Conformal / 分位数（算法⑤）", MID],
  ];
  imp.forEach(([t, d, r, c], i) => {
    const y = 1.65 + i * 1.58;
    card(s, p, M, y, 12.2, 1.4, i === 1 ? SOFT2 : SOFT);
    s.addText(t, { x: M + 0.25, y: y + 0.14, w: 2.6, h: 1.15, fontFace: F, fontSize: 14.5, bold: true, color: c, margin: 0, valign: "top" });
    s.addText(d, { x: M + 3.05, y: y + 0.12, w: 5.9, h: 1.2, fontFace: F, fontSize: 12.5, color: TEXT, margin: 0, valign: "middle" });
    s.addText(r, { x: M + 9.15, y: y + 0.12, w: 2.9, h: 1.2, fontFace: F, fontSize: 11.5, bold: true, color: c, margin: 0, valign: "middle" });
  });
  s.addText("核正则与 ② 的图平滑同一模板：把物理先验写成损失项，λ 扫描就是数据-物理权衡的显式表达", { x: M, y: 6.42, w: 12.2, h: 0.3, fontFace: F, fontSize: 12.5, bold: true, color: A, margin: 0 });
  srcNote(s, meta);
  chrome(s, meta, 11);

  // ---- S12 Checklist + 坑
  s = p.addSlide(); s.background = { color: "FFFFFF" };
  header(s, meta, "落地指南", "接入真实数据 Checklist 与常见坑");
  card(s, p, M, 1.6, 6.6, 4.9);
  s.addText("Checklist", { x: M + 0.25, y: 1.8, w: 6.0, h: 0.32, fontFace: F, fontSize: 15, bold: true, color: PRIMARY, margin: 0 });
  const cl3 = ["单点长表 CSV 放入 CNN-Transformer/（多测点配合 ②）", "改 §2.2 配置区，位移类目标先差分出速率列", "SEQ_LEN 按物理记忆尺度选（跨雨季 → 90~180 天），§8.3 敏感性定窗", "样本 <1k：保住 CNN 前置、减小 d_model/layers、加大 dropout", "先基线 → §9.1 消融论证 CNN 前置必要性（审稿人必问）→ §9.2 注意力-滞后对照", "§9.3 响应核先验：可直接读出渗流滞后 τ", "§9.4 区间 → 超越概率 → 风险矩阵（衔接算法⑤）"];
  s.addText(cl3.map((t, i) => ({ text: `${i + 1}.  ${t}`, options: { breakLine: true } })), { x: M + 0.25, y: 2.25, w: 6.15, h: 4.1, fontFace: F, fontSize: 12.5, color: TEXT, paraSpaceAfter: 8, margin: 0, valign: "top" });
  card(s, p, 7.45, 1.6, 5.3, 4.9, SOFT2);
  s.addText("常见坑速查", { x: 7.7, y: 1.8, w: 4.8, h: 0.32, fontFace: F, fontSize: 15, bold: true, color: A, margin: 0 });
  const pits3 = ["位置编码忘加（注意力对顺序无感）❌", "nhead 不整除 d_model ❌", "小样本直接上大 Transformer ❌", "post-LN 无 warmup 训崩（用 pre-LN）❌", "全量数据 fit scaler ❌", "直接预测累积位移 ❌", "把注意力权重当因果证据 ❌"];
  s.addText(pits3.map((t) => ({ text: t, options: { bullet: bu(12), breakLine: true } })), { x: 7.7, y: 2.25, w: 4.85, h: 3.3, fontFace: F, fontSize: 13, color: TEXT, paraSpaceAfter: 10, margin: 0 });
  s.addText("每一条都对应 Notebook 中的讨论或实验", { x: 7.7, y: 5.9, w: 4.8, h: 0.4, fontFace: F, fontSize: 12, color: MUTED, margin: 0 });
  srcNote(s, meta);
  chrome(s, meta, 12);

  closing(p, meta, [
    "交付：因果卷积 + 自注意力从零实现（4 项验证全绿）+ 可开关混合架构 + 消融/敏感性/物理正则/区间全套实验",
    "调参后 test RMSE 0.2632 mm/day，累积重构 RMSE 10.42 mm（R²=0.990），递归 45 天误差线性增长",
    "核心实证：小样本下 CNN 前置是注意力的“稳定器”（去掉 CNN 掉 12%）；SEQ_LEN 加长无结构代价",
  ], "② GCN：时间模块可换成注意力 → ST-Transformer（Transformer 管时间 + GCN 管空间）。\n⑥ PINN：把响应核的 τ 参数化并反演，物理先验从“形状约束”升级为“参数反演”。\n⑧ 时序基础模型：Chronos/TimesFM zero-shot 与本篇监督式对比。");
  p.writeFile({ fileName: meta.file }).then(() => console.log("written:", meta.file));
}

// ============================================================ ④ XGBoost + SHAP
/**
 * 构建 ④《XGBoost + SHAP 可解释位移预测》整份 PPT（共 13 页 + 封面封底）。
 * 页面顺序：定位 → 数据/特征族 → 二阶泰勒原理 → 从零实现+四项验证 → 基线对比
 *          → 两级口径/递归 → 调参+gain → SHAP 原理 → 全局归因 → 加速期归因报告
 *          → 改进（消融/单调约束/分位数）→ Checklist/坑 → 小结。
 */
function buildXGB() {
  const meta = DECKS.xgb, A = meta.accent;
  const p = newPres(meta);
  cover(p, meta);

  // ---- S2 系列定位
  let s = p.addSlide(); s.background = { color: "FFFFFF" };
  header(s, meta, "算法系列 · 定位", "表格式强基线 + 可解释归因：精度之外的另一种价值");
  chevrons(s, p, ["① 单点时序\nLSTM/GRU", "② 多点时空\nGCN 监测网", "③ 混合架构\nCNN+Transformer", "④ 基线+归因\nXGBoost+SHAP（本篇）"], M, 1.6, 12.2, 0.85);
  s.addText("待加：⑤ 分位数/Conformal 风险区间   ⑥ PINN   ⑦ 神经算子   ⑧ 时序基础模型", { x: M, y: 2.62, w: 12.2, h: 0.3, fontFace: F, fontSize: 12, color: MUTED, margin: 0 });
  card(s, p, M, 3.15, 7.2, 2.55);
  s.addText("本篇要解决的问题", { x: M + 0.25, y: 3.35, w: 6.6, h: 0.32, fontFace: F, fontSize: 15, bold: true, color: PRIMARY, margin: 0 });
  bullets(s, [
    { text: "场景：与 ①③ 同一个测点、同一套划分，换成“特征工程 + 梯度提升树”", options: {} },
    { text: "领域知识显式化：滞后/有效降雨/骤降幅度写成特征，树在其上找非线性与交互", options: {} },
    { text: "SHAP 把每次预测按 Shapley 公理精确分摊到特征 —— 这次加速主要因为什么？", options: {} },
    { text: "落位：L4 预警升级自动输出“主要驱动因子 Top-5”归因报告（融合方案 §7）", options: {} },
  ], M + 0.25, 3.75, 6.7, 1.8, { size: 14 });
  card(s, p, 8.05, 3.15, 4.7, 2.55, "FFFFFF", true);
  s.addText("为什么树模型 + SHAP", { x: 8.3, y: 3.35, w: 4.2, h: 0.32, fontFace: F, fontSize: 15, bold: true, color: A, margin: 0 });
  bullets(s, [
    { text: "表格数据默认强基线：非线性 + 交互自动学", options: {} },
    { text: "TreeSHAP 精确分解，不是近似解释", options: {} },
    { text: "训练秒级、特征可插拔、单调约束易加", options: {} },
    { text: "精度略逊 ①③，价值在归因 / 约束 / 效率", options: {} },
  ], 8.3, 3.75, 4.25, 1.8, { size: 13, gap: 10 });
  srcNote(s, meta);
  chrome(s, meta, 2);

  // ---- S3 数据 + 特征族
  s = p.addSlide(); s.background = { color: "FFFFFF" };
  header(s, meta, "演示数据 · 特征工程", "把领域知识写成特征：五族 24 个全因果特征");
  card(s, p, M, 1.55, 5.6, 4.5);
  s.addText("数据（与 ①③ 同机制同划分）", { x: M + 0.25, y: 1.75, w: 5.1, h: 0.32, fontFace: F, fontSize: 15, bold: true, color: PRIMARY, margin: 0 });
  const spec = [["时间范围", "2016-01-01 起 · 2190 天（6 年）"], ["驱动", "降雨 / 库水位 / 温度 · 日尺度"], ["目标", "明日速率 rate(τ+1) = 差分"], ["划分", "按目标时刻 70/15/15"], ["样本", "2159（前 31 天被滚动特征占用）"], ["噪声底", "σ ≈ 0.15 mm/day（RMSE 下限）"]];
  spec.forEach(([k, v], i) => {
    const y = 2.2 + i * 0.63;
    s.addText(k, { x: M + 0.25, y, w: 1.3, h: 0.3, fontFace: F, fontSize: 12.5, bold: true, color: MID, margin: 0 });
    s.addText(v, { x: M + 1.6, y, w: 3.9, h: 0.3, fontFace: F, fontSize: 12.5, color: TEXT, margin: 0 });
    if (i < 5) s.addShape(p.shapes.LINE, { x: M + 0.25, y: y + 0.44, w: 5.0, h: 0, line: { color: HAIR, width: 0.75 } });
  });
  card(s, p, 6.45, 1.55, 6.3, 4.5, "FFFFFF", true);
  s.addText("五特征族（真实数据可加 InSAR 面域族）", { x: 6.7, y: 1.75, w: 5.8, h: 0.32, fontFace: F, fontSize: 15, bold: true, color: PRIMARY, margin: 0 });
  const fam = [
    ["自回归 ×10", "rate_lag1/2/3/7/14、accel、滚动均值/方差", "位移惯性：蠕变缓变、加速持续"],
    ["水平 ×1", "disp（累积位移）", "应力状态 / 损伤累积代理"],
    ["降雨 ×6", "当日、有效降雨(τ=12 核)、7/30 日累计、3 日最大雨强、干期", "强度 / 历时 / 滞后 / 间歇"],
    ["库水位 ×4", "水位、日变幅、7 日变幅、累计骤降 drawdown7", "只对“骤降”响应的渗透力"],
    ["环境·季节 ×3", "温度、年内 sin/cos", "冻融与年周期背景"],
  ];
  fam.forEach(([t, f, d], i) => {
    const y = 2.2 + i * 0.76;
    s.addText(t, { x: 6.7, y, w: 1.55, h: 0.6, fontFace: F, fontSize: 12.5, bold: true, color: A, margin: 0, valign: "top" });
    s.addText(f, { x: 8.3, y, w: 4.3, h: 0.35, fontFace: F, fontSize: 11.5, color: TEXT, margin: 0, valign: "top" });
    s.addText(d, { x: 8.3, y: y + 0.33, w: 4.3, h: 0.3, fontFace: F, fontSize: 10.5, color: MUTED, margin: 0, valign: "top" });
  });
  s.addText("因果红线：每行特征只用 ≤τ 的观测，预测 rate(τ+1) —— 部署时今日观测完成后出明日预警", { x: M, y: 6.42, w: 12.2, h: 0.3, fontFace: F, fontSize: 12.5, bold: true, color: A, margin: 0 });
  srcNote(s, meta);
  chrome(s, meta, 3);

  // ---- S4 原理
  s = p.addSlide(); s.background = { color: "FFFFFF" };
  header(s, meta, "原理", "二阶泰勒目标：梯度 + 曲率驱动的残差拟合");
  card(s, p, M, 1.6, 12.2, 1.5, SOFT2);
  // XGBoost 目标函数/最优权重/分裂增益三行公式：均独立文本框 + 整框 MONO
  //（【坑】Menlo run 后接 CJK 段落会损坏导出文件，公式行禁止与中文混排）
  s.addText("Obj = Σ[ g_i·f(x_i) + 1/2·h_i·f²(x_i) ] + Ω(f)        g_i = ŷ−y（残差）, h_i = 1（平方损失）", { x: M + 0.3, y: 1.78, w: 11.6, h: 0.42, fontFace: MONO, fontSize: 15, bold: true, color: PRIMARY, margin: 0 });
  s.addText("w* = -G/(H+λ)                Gain = 1/2·[G_L²/(H_L+λ) + G_R²/(H_R+λ) - G²/(H+λ)] - γ", { x: M + 0.3, y: 2.28, w: 11.6, h: 0.42, fontFace: MONO, fontSize: 15, bold: true, color: A, margin: 0 });
  const three = [
    ["λ（reg_lambda）", "L2 压叶子：样本少的叶被压小 —— 对平方损失 H=叶内样本数，min_child_weight 即最小叶样本数", PRIMARY],
    ["γ（分裂门槛）", "增益 > γ 才分裂：天然预剪枝；增益公式就是“父目标 − 两子目标”的目标下降", MID],
    ["η（shrinkage）", "每棵树输出乘 η 再累加，留空间给后面的树 —— 小步多轮，配早停自动定轮数", A],
  ];
  three.forEach(([t, d, c], i) => {
    const x = M + i * 4.13;
    card(s, p, x, 3.35, 3.95, 2.6);
    s.addText(t, { x: x + 0.22, y: 3.55, w: 3.5, h: 0.32, fontFace: F, fontSize: 14, bold: true, color: c, margin: 0 });
    s.addText(d, { x: x + 0.22, y: 3.95, w: 3.55, h: 1.85, fontFace: F, fontSize: 12.5, color: TEXT, margin: 0, valign: "top", lineSpacingMultiple: 1.15 });
  });
  s.addText("平方损失的 GBDT = 用回归树逐步拟合残差；换损失（如 §9.3 分位数）只改 (g,h)，框架不变", { x: M, y: 6.3, w: 12.2, h: 0.3, fontFace: F, fontSize: 12.5, bold: true, color: PRIMARY, margin: 0 });
  srcNote(s, meta);
  chrome(s, meta, 4);

  // ---- S5 从零实现 + 四项验证
  s = p.addSlide(); s.background = { color: "FFFFFF" };
  header(s, meta, "从零实现", "NumPy 复现 XGBoost 核心 + 四项暴力验证（全绿）");
  s.addText("树模型没有反向传播，但每个公式都能被暴力验证 —— 这是树版的“梯度检查”", { x: M, y: 1.55, w: 12.2, h: 0.3, fontFace: F, fontSize: 13, color: MUTED, margin: 0 });
  const chk = [
    ["① 解析梯度 vs 数值微分", "g = ŷ−y 对损失做中心差分", "相对误差 2.2e-06 ✅"],
    ["② 最优叶权重 w*", "闭式解 vs 4 万点网格搜索", "差 = 0.0 ✅"],
    ["③ 分裂增益公式", "暴力枚举全部 (特征,阈值) 直算目标差", "2.931886 = 2.931886 ✅"],
    ["④ 训练损失单调", "60 轮 boost 逐轮目标不升", "0.484 → 0.186 ✅"],
  ];
  chk.forEach(([t, d, r], i) => {
    const x = M + (i % 2) * 6.25, y = 2.0 + Math.floor(i / 2) * 1.5;
    card(s, p, x, y, 5.95, 1.3);
    s.addText(t, { x: x + 0.22, y: y + 0.14, w: 3.4, h: 0.32, fontFace: F, fontSize: 13.5, bold: true, color: PRIMARY, margin: 0 });
    s.addText(d, { x: x + 0.22, y: y + 0.52, w: 3.5, h: 0.62, fontFace: F, fontSize: 11.5, color: MUTED, margin: 0, valign: "top" });
    s.addText(r, { x: x + 3.7, y: y + 0.14, w: 2.05, h: 1.0, fontFace: F, fontSize: 12.5, bold: true, color: A, margin: 0, valign: "middle", align: "right" });
  });
  card(s, p, M, 5.15, 12.2, 1.1, SOFT2);
  s.addText("官方对齐（同超参：exact · 200 棵 · depth3 · η0.1 · λ1 · base=均值）", { x: M + 0.25, y: 5.32, w: 7.6, h: 0.32, fontFace: F, fontSize: 13.5, bold: true, color: PRIMARY, margin: 0 });
  s.addText("从零 1.4s 跑完 200 棵；两条学习曲线几乎重合 —— 后 50 轮 test RMSE 平均差 0.0033 mm/day", { x: M + 0.25, y: 5.68, w: 8.2, h: 0.35, fontFace: F, fontSize: 12.5, color: TEXT, margin: 0 });
  s.addText("0.0033", { x: 9.6, y: 5.3, w: 2.9, h: 0.55, fontFace: F, fontSize: 26, bold: true, color: A, align: "right", margin: 0 });
  s.addText("mm/day 平均差", { x: 9.6, y: 5.85, w: 2.9, h: 0.3, fontFace: F, fontSize: 11, color: MUTED, align: "right", margin: 0 });
  srcNote(s, meta);
  chrome(s, meta, 5);

  // ---- S6 基线对比
  s = p.addSlide(); s.background = { color: "FFFFFF" };
  header(s, meta, "精度检验 · 速率口径", "基线对比：一次诚实的“树模型边界”演示");
  s.addChart(p.charts.BAR, [{
    name: "test RMSE (mm/day)",
    labels: ["从零GBM(200棵)", "persistence(明日=今日)", "XGBoost(默认)", "XGBoost(调参后)", "线性回归(同特征)", "岭回归(α=1)"],
    values: [0.3643, 0.3559, 0.3083, 0.2947, 0.2732, 0.2708],
  }], chartBase({
    x: M, y: 1.65, w: 7.1, h: 4.2, barDir: "bar",
    chartColors: [MUTED, MUTED, MID, A, PRIMARY, PRIMARY], varyColors: true,
    showValue: true, dataLabelPosition: "outEnd", dataLabelFormatCode: "0.000",
    valAxisMaxVal: 0.45, barGapWidthPct: 55, catAxisLabelFontSize: 11,
  }));
  s.addText("同一套 24 特征 · 同一划分 · test 段速率口径 RMSE (mm/day) —— 越短越好", { x: M, y: 5.95, w: 7.1, h: 0.3, fontFace: F, fontSize: 12, color: MUTED, align: "center", margin: 0 });
  card(s, p, 8.0, 1.65, 4.75, 4.55);
  s.addText("如实解读：树模型的边界", { x: 8.25, y: 1.85, w: 4.3, h: 0.32, fontFace: F, fontSize: 15, bold: true, color: A, margin: 0 });
  bullets(s, [
    { text: "persistence 被全线打败（0.356）→ 流水线无泄漏、目标可预报", options: {} },
    { text: "线性/岭回归（0.271）几乎追平 XGBoost（0.295）：本数据机制近线性，GBDT 优势无从发挥，分段常数还多付方差代价", options: {} },
    { text: "真实边坡非线性（入渗饱和、阈值响应）越强，差距越会反转", options: {} },
    { text: "不可替代性在精度之外：秒级训练、特征可插拔、精确归因、单调约束", options: {} },
  ], 8.25, 2.25, 4.3, 3.7, { size: 13, gap: 12 });
  srcNote(s, meta);
  chrome(s, meta, 6);

  // ---- S7 两级口径 + 递归多步
  s = p.addSlide(); s.background = { color: "FFFFFF" };
  header(s, meta, "精度检验 · 两级口径", "速率建模 → 累加重构 → 递归多步外推");
  kpi(s, M + 0.6, 1.75, 3.4, "0.2947", "调参后 test RMSE（速率 mm/day）\nR²=0.632 · MAE=0.239", A);
  kpi(s, M + 4.6, 1.75, 3.4, "30.61", "累积重构 RMSE（mm）\nR²=0.912 · 从测试段起点累加", PRIMARY);
  kpi(s, M + 8.6, 1.75, 3.4, "8.87", "递归 45 步累积 RMSE（mm）\n30 步 6.11 · 误差近线性增长", MID);
  card(s, p, M, 3.65, 6.0, 2.5);
  s.addText("两级口径（与 ①③ 同一杆秤）", { x: M + 0.25, y: 3.85, w: 5.5, h: 0.32, fontFace: F, fontSize: 14.5, bold: true, color: PRIMARY, margin: 0 });
  bullets(s, [
    { text: "速率空间：建模目标口径，预警看它（时效性）", options: {} },
    { text: "累积重构：应用口径，从真实起点累加预测速率", options: {} },
    { text: "横向参考：① 0.2570/13.38mm，③ 0.2632/10.42mm", options: {} },
  ], M + 0.25, 4.25, 5.5, 1.7, { size: 13 });
  card(s, p, 6.75, 3.65, 6.0, 2.5, "FFFFFF", true);
  s.addText("递归多步（误差自累积检验）", { x: 7.0, y: 3.85, w: 5.5, h: 0.32, fontFace: F, fontSize: 14.5, bold: true, color: A, margin: 0 });
  bullets(s, [
    { text: "预测速率回填自回归特征滚动外推，多起点评估", options: {} },
    { text: "假设：未来降雨/水位有预报（演示用真值代替，与 ③ 同）", options: {} },
    { text: "自回归主导的模型 45 步后误差可控 —— 归因与约束保底外推", options: {} },
  ], 7.0, 4.25, 5.5, 1.7, { size: 13 });
  srcNote(s, meta);
  chrome(s, meta, 7);

  // ---- S8 调参 + gain
  s = p.addSlide(); s.background = { color: "FFFFFF" };
  header(s, meta, "调参", "随机搜索 12 组 + val 早停：3 秒搜完一个模型");
  card(s, p, M, 1.65, 6.4, 4.5);
  s.addText("最优配置（val RMSE 0.2861）", { x: M + 0.25, y: 1.85, w: 5.8, h: 0.32, fontFace: F, fontSize: 15, bold: true, color: PRIMARY, margin: 0 });
  const cfg = [["max_depth = 4", "交互阶数适中"], ["eta = 0.05", "小步多轮"], ["min_child_weight = 10", "压小叶过拟合"], ["subsample / colsample = 0.6 / 0.8", "行/列双随机降方差"], ["reg_lambda = 10 · gamma = 1", "强正则"], ["早停 best_iteration = 294", "val 段自动定轮数"]];
  cfg.forEach(([k, v], i) => {
    const y = 2.3 + i * 0.62;
    s.addText(k, { x: M + 0.25, y, w: 3.4, h: 0.3, fontFace: MONO, fontSize: 12, bold: true, color: A, margin: 0 });
    s.addText(v, { x: M + 3.8, y, w: 2.5, h: 0.3, fontFace: F, fontSize: 12, color: MUTED, margin: 0 });
    if (i < 5) s.addShape(p.shapes.LINE, { x: M + 0.25, y: y + 0.44, w: 5.8, h: 0, line: { color: HAIR, width: 0.75 } });
  });
  card(s, p, 7.25, 1.65, 5.5, 4.5, "FFFFFF", true);
  s.addText("gain 重要性：先看一眼，别当归因", { x: 7.5, y: 1.85, w: 5.0, h: 0.32, fontFace: F, fontSize: 15, bold: true, color: A, margin: 0 });
  bullets(s, [
    { text: "gain = 分裂带来的平均目标下降：衡量“训练时被用得多深”", options: {} },
    { text: "gain Top-5：rate_mean3 / eff_rain / rate_mean7 / rate_lag2 / dlevel7", options: {} },
    { text: "高度相关特征互相抢功劳；用得少 ≠ 不重要 —— 与 SHAP 排名 Spearman 相关 0.715，相似但不相同", options: {} },
    { text: "严谨归因 → 下一页 SHAP", options: {} },
  ], 7.5, 2.25, 5.0, 3.7, { size: 13, gap: 12 });
  srcNote(s, meta);
  chrome(s, meta, 8);

  // ---- S9 SHAP 原理 + 加和检查
  s = p.addSlide(); s.background = { color: "FFFFFF" };
  header(s, meta, "SHAP 原理", "Shapley 公理归因：树模型的精确分解");
  card(s, p, M, 1.6, 12.2, 1.45, SOFT2);
  // SHAP Shapley 值与加和性公式：独立文本框 + 整框 MONO
  s.addText("phi_i = SUM over S:  w(|S|) · [ v(S ∪ {i}) - v(S) ]          (all-feature-subset average marginal)", { x: M + 0.3, y: 1.78, w: 11.6, h: 0.4, fontFace: MONO, fontSize: 14.5, bold: true, color: PRIMARY, margin: 0 });
  s.addText("Additivity:  SUM_i phi_i + phi_base = f(x)          (phi_base = E[f(X)] = 1.3837 mm/day)", { x: M + 0.3, y: 2.26, w: 11.6, h: 0.4, fontFace: MONO, fontSize: 14.5, bold: true, color: A, margin: 0 });
  const ax = [
    ["加和性", "贡献分解不重不漏 → 本篇用它做“SHAP 版梯度检查”：逐样本验证，相对残差 6.6e-03 ✅（float32 累加舍入量级）", PRIMARY],
    ["一致性", "特征在模型中贡献变大，其 φ 不会变小 → 重要性排序可信（gain 做不到）", MID],
    ["缺失替代", "无贡献特征 φ=0；树模型 TreeSHAP 精确多项式算法（Lundberg 2020）—— xgboost 内置 pred_contribs", A],
  ];
  ax.forEach(([t, d, c], i) => {
    const x = M + i * 4.13;
    card(s, p, x, 3.3, 3.95, 2.6);
    s.addText(t, { x: x + 0.22, y: 3.5, w: 3.5, h: 0.32, fontFace: F, fontSize: 14.5, bold: true, color: c, margin: 0 });
    s.addText(d, { x: x + 0.22, y: 3.9, w: 3.55, h: 1.85, fontFace: F, fontSize: 12.5, color: TEXT, margin: 0, valign: "top", lineSpacingMultiple: 1.15 });
  });
  s.addText("φ_base = 训练集背景分布上的期望输出；贡献有正有负 —— 正 = 推高预测，负 = 拉低", { x: M, y: 6.25, w: 12.2, h: 0.3, fontFace: F, fontSize: 12.5, bold: true, color: PRIMARY, margin: 0 });
  srcNote(s, meta);
  chrome(s, meta, 9);

  // ---- S10 全局归因
  s = p.addSlide(); s.background = { color: "FFFFFF" };
  header(s, meta, "SHAP · 全局", "哪些特征在撑预测，往哪个方向撑");
  s.addChart(p.charts.BAR, [{
    name: "mean |SHAP| (mm/day)",
    labels: ["dlevel", "rate_mean7", "disp", "rate_mean3", "eff_rain"],
    values: [0.0411, 0.0674, 0.0895, 0.1245, 0.1642],
  }], chartBase({
    x: M, y: 1.7, w: 6.4, h: 3.6, barDir: "bar",
    chartColors: [A], showValue: true, dataLabelPosition: "outEnd",
    dataLabelFormatCode: "0.000", valAxisMaxVal: 0.2, barGapWidthPct: 55,
  }));
  s.addText("mean|SHAP| Top-5（完整 24 特征 beeswarm 见 Notebook §8.2）", { x: M, y: 5.4, w: 6.4, h: 0.3, fontFace: F, fontSize: 12, color: MUTED, align: "center", margin: 0 });
  card(s, p, 7.25, 1.7, 5.5, 4.4);
  s.addText("怎么读 beeswarm / 依赖图", { x: 7.5, y: 1.9, w: 5.0, h: 0.32, fontFace: F, fontSize: 15, bold: true, color: PRIMARY, margin: 0 });
  bullets(s, [
    { text: "beeswarm 每点 = 一个样本：横轴 SHAP 值、颜色 = 特征值高低 —— 同时读出方向", options: {} },
    { text: "eff_rain：红色（大值）集中在正贡献端 → 有效降雨越大预测速率越高，且大值端出现饱和", options: {} },
    { text: "依赖图叠加颜色特征可暴露交互：最强交互 rate_mean3 × eff_rain（0.0148 mm/day）", options: {} },
    { text: "rate_lag1 高速率端正贡献 → “已经很快 → 明天更快”的加速惯性被学进结构", options: {} },
  ], 7.5, 2.3, 5.0, 3.6, { size: 13, gap: 11 });
  srcNote(s, meta);
  chrome(s, meta, 10);

  // ---- S11 加速期归因报告
  s = p.addSlide(); s.background = { color: "FFFFFF" };
  header(s, meta, "SHAP · 归因报告", "预警升级那天，自动输出“主要驱动因子 Top-5”");
  card(s, p, M, 1.6, 6.9, 4.55);
  s.addText("加速期 Top-5（测试段速率前 20%，≥1.48 mm/day）", { x: M + 0.25, y: 1.8, w: 6.4, h: 0.32, fontFace: F, fontSize: 14.5, bold: true, color: A, margin: 0 });
  const rep = [
    ["1", "eff_rain", "0.2357", "全期 #1 —— 有效降雨是加速的第一驱动"],
    ["2", "rate_mean3", "0.1043", "全期 #2 —— 近 3 日速率惯性"],
    ["3", "disp", "0.0953", "全期 #3 —— 损伤累积水平"],
    ["4", "rate_mean7", "0.0431", "全期 #4 —— 周尺度惯性"],
    ["5", "rain7", "0.0406", "全期 #7 → 加速期升至 #5：累计雨量是加速信号"],
  ];
  rep.forEach(([n, f, v, d], i) => {
    const y = 2.28 + i * 0.74;
    s.addText(n, { x: M + 0.25, y, w: 0.4, h: 0.34, fontFace: "Arial", fontSize: 15, bold: true, color: A, margin: 0 });
    s.addText(f, { x: M + 0.75, y, w: 1.75, h: 0.34, fontFace: MONO, fontSize: 12.5, bold: true, color: PRIMARY, margin: 0 });
    s.addText(v + " mm/day", { x: M + 2.55, y, w: 1.45, h: 0.34, fontFace: F, fontSize: 12, color: A, bold: true, margin: 0 });
    s.addText(d, { x: M + 4.05, y, w: 2.75, h: 0.62, fontFace: F, fontSize: 10.5, color: MUTED, margin: 0, valign: "top" });
    if (i < 4) s.addShape(p.shapes.LINE, { x: M + 0.25, y: y + 0.56, w: 6.35, h: 0, line: { color: HAIR, width: 0.75 } });
  });
  card(s, p, 7.65, 1.6, 5.1, 4.55, "FFFFFF", true);
  s.addText("单点瀑布图（最强加速日 2021-05-01）", { x: 7.9, y: 1.8, w: 4.6, h: 0.32, fontFace: F, fontSize: 14.5, bold: true, color: PRIMARY, margin: 0 });
  bullets(s, [
    { text: "基线 1.38 → 特征推/拉 → 预测 1.87（实测 2.36）", options: {} },
    { text: "每个特征标注取值：“eff_rain=XX（高于平常）抬高 YY mm/day”", options: {} },
    { text: "平常期 vs 加速期榜单结构不同 → 回答“这次加速因为什么”", options: {} },
    { text: "工程落位：预警升级 → 自动跑 SHAP → Top-5 随预警单发出（L4）", options: {} },
  ], 7.9, 2.25, 4.6, 3.7, { size: 13, gap: 12 });
  srcNote(s, meta);
  chrome(s, meta, 11);

  // ---- S12 改进
  s = p.addSlide(); s.background = { color: "FFFFFF" };
  header(s, meta, "改进", "消融 · 物理单调约束 · 分位数初探");
  const imp = [
    ["特征族消融", "完整 0.2947 / −自回归 0.3174 / −库水位 0.2986 / −降雨 0.2737 / 仅环境 0.4436", "−降雨略降：短期信息被自回归吸收；环境族价值在外推与归因，不在单步 RMSE", MID],
    ["物理单调约束", "monotone_constraints：降雨族 +1、干期 −1、骤降 +1 —— 限定响应方向不限形状", "val 0.2861→0.2892、test +0.0018：极小代价买断“超强降雨下非物理响应”的外推保险（③ 核正则的树版）", PRIMARY],
    ["分位数回归初探", "reg:quantileerror 训 5%/95% 分位 —— 只换损失不动框架", "90% 区间 PICP=0.935、宽度-|误差|相关 0.241；正式覆盖保证 → ⑤ Conformal", A],
  ];
  imp.forEach(([t, d, r, c], i) => {
    const y = 1.65 + i * 1.58;
    card(s, p, M, y, 12.2, 1.4, i === 1 ? SOFT2 : SOFT);
    s.addText(t, { x: M + 0.25, y: y + 0.14, w: 2.6, h: 1.15, fontFace: F, fontSize: 14.5, bold: true, color: c, margin: 0, valign: "top" });
    s.addText(d, { x: M + 3.05, y: y + 0.12, w: 5.9, h: 1.2, fontFace: F, fontSize: 12.5, color: TEXT, margin: 0, valign: "middle" });
    s.addText(r, { x: M + 9.15, y: y + 0.12, w: 2.9, h: 1.2, fontFace: F, fontSize: 11.5, bold: true, color: c, margin: 0, valign: "middle" });
  });
  s.addText("单调约束后 SHAP 依赖图不再出现非物理负向段 —— 物理一致性可以直接“画”出来检验", { x: M, y: 6.42, w: 12.2, h: 0.3, fontFace: F, fontSize: 12.5, bold: true, color: A, margin: 0 });
  srcNote(s, meta);
  chrome(s, meta, 12);

  // ---- S13 Checklist + 坑
  s = p.addSlide(); s.background = { color: "FFFFFF" };
  header(s, meta, "落地指南", "接入真实数据 Checklist 与常见坑");
  card(s, p, M, 1.6, 6.6, 4.9);
  s.addText("Checklist", { x: M + 0.25, y: 1.8, w: 6.0, h: 0.32, fontFace: F, fontSize: 15, bold: true, color: PRIMARY, margin: 0 });
  const cl4 = ["L2 融合层单点宽表 CSV 放入 XGBoost+SHAP/（date + 融合位移/速率 + 驱动量 + InSAR 面域量）", "§3 GROUPS 增删特征族（如 InSAR: insar_vel / coh_chg / dist_edge），守住因果红线：特征 ≤τ", "先跑基线：persistence 必须被打败，否则特征或划分有泄漏", "§7 随机搜索 + val 早停 → §8 SHAP 做物理 sanity check（eff_rain 依赖应单调非负）", "§9.1 消融论证特征族必要性 → §9.2 单调约束（强降雨外推保险，强烈建议开）", "风险应用：§8.5 加速期 Top-5 随预警单发出；区间接 ⑤ Conformal 校准"];
  s.addText(cl4.map((t, i) => ({ text: `${i + 1}.  ${t}`, options: { breakLine: true } })), { x: M + 0.25, y: 2.25, w: 6.15, h: 4.1, fontFace: F, fontSize: 12, color: TEXT, paraSpaceAfter: 8, margin: 0, valign: "top" });
  card(s, p, 7.45, 1.6, 5.3, 4.9, SOFT2);
  s.addText("常见坑速查", { x: 7.7, y: 1.8, w: 4.8, h: 0.32, fontFace: F, fontSize: 15, bold: true, color: A, margin: 0 });
  const pits4 = ["随机打乱样本 ❌", "rolling/滞后特征包含目标时刻 ❌（一律 ≤τ）", "把 gain 重要性当 SHAP/归因用 ❌", "递归多步用真值假装完美预报、报告不声明 ❌", "早停挂 test 段 ❌", "小样本开大 depth + 小 min_child_weight ❌", "分位数区间当“保证覆盖率”用 ❌（那是 ⑤ 的活）"];
  s.addText(pits4.map((t) => ({ text: t, options: { bullet: bu(12), breakLine: true } })), { x: 7.7, y: 2.25, w: 4.85, h: 3.3, fontFace: F, fontSize: 13, color: TEXT, paraSpaceAfter: 10, margin: 0 });
  s.addText("每一条都对应 Notebook 中的讨论或实验", { x: 7.7, y: 5.9, w: 4.8, h: 0.4, fontFace: F, fontSize: 12, color: MUTED, margin: 0 });
  srcNote(s, meta);
  chrome(s, meta, 13);

  closing(p, meta, [
    "交付：从零 GBDT（四项验证全绿 + 官方对齐差 0.0033 mm/day）+ 24 特征防泄漏流水线 + SHAP 归因全套 + 单调约束/分位数",
    "调参后 test RMSE 0.2947 mm/day（累积重构 30.6 mm，R²=0.912）；加速期 Top-5 驱动因子：eff_rain / rate_mean3 / disp / rate_mean7 / rain7",
    "核心实证：机制近线性时线性基线追平树模型（0.271 vs 0.295）—— 树的价值在归因、约束、效率；加速期 rain7 从全期 #7 升至 #5",
  ], "⑤ 分位数/Conformal：在本模型残差上做校准，把 PICP 0.935 升级为有限样本覆盖保证。\n⑥ PINN：单调约束是“方向先验”，PINN 把物理先验升级为方程残差。\n⑧ 时序基础模型：Chronos/TimesFM zero-shot 作为“无特征基线”与本篇对比。");
  p.writeFile({ fileName: meta.file }).then(() => console.log("written:", meta.file));
}

// ---- 入口：依次构建四份 PPT 并异步写出文件（writeFile 为 Promise），
//      最后打印 "all done"（注意：不等 writeFile 完成，仅表示四个构建流程已启动）
buildLSTM();
buildGCN();
buildCT();
buildXGB();
console.log("all done");
