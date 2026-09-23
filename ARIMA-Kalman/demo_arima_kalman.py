# -*- coding: utf-8 -*-
"""
最强组合：ARIMA/ARIMAX + Kalman 残差状态纠偏 —— 演示脚本
==========================================================
两条纪律（全文的立足点）：
  1) SARIMAX 内部本来就是状态空间 + Kalman Filter，这里它只当"基线模型"，
     我们在基线之外再加一层显式的残差状态纠偏，不是两个独立模型硬拼。
  2) 顺序必须严格：先产生当前时刻预测（只准用 ≤ t-1 的信息），
     当前观测到达后再更新 Kalman 状态，更新结果只服务于下一时刻。

实验设计：
  弱基线 = SARIMAX(1,0,0)(1,0,0,7)+常数，建了周季节但【漏建外生气温】
           → 残差里是气温的季节性漂移 + 噪声（生产里最常见的遗漏）
  强基线 = SARIMAX(2,1,2)(1,0,1,7)+外生（结构建全，阶数由验证段在候选中选定；
           SARIMAX 一键 fit 可能掉进"样本内好看、样本外不追漂移"的退化解，
           所以基线本身也要用验证段验收）

五个对照组（每个基线各跑一遍，共用同一个防泄漏滚动基线）：
  A. base     : 基线滚动一步预测（append(refit=False)，无泄漏）
  B. ewma     : A + 固定增益残差 EWMA 纠偏（同一纪律）
  C. kf_fixed : A + 残差状态 Kalman（R/Q 固定）
  D. kf_adapt : A + 残差状态 Kalman（稳健尺度异常检测 → 放大 R；
                8 步均值检验 + 24 步漂移检验 → 放大 Q）← 文章主方法
  E1. leaky   : 错误示范：先拿当前观测更新、再回头"预测"当前 → 指标虚高
  E2. 全泄漏  : 更离谱的示范：把当前残差整段加到当前"预测" = 直接抄答案
"""
import warnings
warnings.filterwarnings("ignore")
# statsmodels 在 import 时会给自家警告注册 "always" 过滤器，需要再压一次
from statsmodels.tools.sm_exceptions import (ConvergenceWarning, EstimationWarning,
                                             ValueWarning)
warnings.filterwarnings("ignore", category=ConvergenceWarning)
warnings.filterwarnings("ignore", category=EstimationWarning)
warnings.filterwarnings("ignore", category=ValueWarning)

import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from statsmodels.tsa.statespace.sarimax import SARIMAX

plt.rcParams["font.sans-serif"] = ["Hiragino Sans GB", "Arial Unicode MS", "PingFang SC"]
plt.rcParams["axes.unicode_minus"] = False

# ----------------------------------------------------------------------
# 1. 合成数据：水平 + 分段斜率(制度变化) + 周季节 + 外生气温 + 噪声 + 异常点
# ----------------------------------------------------------------------
rng = np.random.default_rng(7)
N = 730
t = np.arange(N)

# 外生变量：气温。现实中当天/次日气温可由天气预报提前获得，属于合法的已知信息
temp = 15 + 10 * np.sin(2 * np.pi * (t - 80) / 365) + rng.normal(0, 2.0, N)

# 周季节（基频 + 二次谐波）
season = 6.0 * np.sin(2 * np.pi * t / 7) + 2.0 * np.sin(4 * np.pi * t / 7)

# 分段斜率：t >= 600 时斜率从 0.05 跳到 0.90 —— 制度变化发生在测试段内部
slope = np.where(t < 600, 0.05, 0.90)

y = 100 + np.cumsum(slope) + season + 1.2 * (temp - 15) + rng.normal(0, 1.5, N)

# 孤立异常点：训练段 1 个，测试段 2 个（一个在平静期，一个在突变后的漂移期）
for i, mag in zip([210, 592, 700], [18.0, -16.0, 14.0]):
    y[i] += mag

SPLIT = 580            # 训练 580 / 测试 150
N_VAL = 60             # 训练段末尾切 60 步做验证（选阶数 / q / α）
REGIME_K = 600 - SPLIT # 测试段第 20 步发生斜率突变
y_tr, y_te = y[:SPLIT], y[SPLIT:]
x_all = temp.reshape(-1, 1)
x_tr, x_te = x_all[:SPLIT], x_all[SPLIT:]
n_test = len(y_te)

# ----------------------------------------------------------------------
# 2. 基线模型的拟合与"验收"
# ----------------------------------------------------------------------
def fit(spec, endog, exog):
    """按给定阶数规格拟合 SARIMAX 模型并返回 fitted results。

    参数:
        spec  : dict，含 order / seasonal_order / trend 等 SARIMAX 关键字参数
        endog : 内生序列（训练段 y）
        exog  : 外生变量（如气温），可为 None
    说明: 强制平稳性/可逆性约束，避免退化解；maxiter 拉高保证收敛充分。
    """
    return SARIMAX(endog, exog=exog, enforce_stationarity=True,
                   enforce_invertibility=True, **spec).fit(disp=False, maxiter=1000)

# ----------------------------------------------------------------------
# 3. 防泄漏滚动基线：从 fitted results 出发，逐点 forecast(1) → append(refit=False)
#    任何时刻的预测都只见过 ≤ t-1 的观测。绝不许一次 forecast(n_test)。
# ----------------------------------------------------------------------
def rolling_baseline(res, y_new, x_new):
    """防泄漏的滚动一步基线预测。

    从拟合好的 results 出发，逐步执行 forecast(1) → append(refit=False)：
    先只用 ≤ t-1 的信息预测当前一步，再把当前观测追加进状态（不重估参数），
    供下一时刻使用。任何时刻都不允许一次性 forecast(n_test)（那等于偷看未来）。

    参数:
        res    : 拟合好的 SARIMAX results 对象
        y_new  : 测试段真实观测序列
        x_new  : 测试段外生变量（可为 None）
    返回:
        (pred, resid) 一步预测值数组和对应的基线残差数组
    """
    n = len(y_new)
    pred, resid = np.empty(n), np.empty(n)
    r_ = res
    for k in range(n):
        # 取当前步的外生变量（提前已知的天气信息）
        ex = x_new[k:k + 1] if x_new is not None else None
        pred[k] = float(np.asarray(r_.forecast(1, exog=ex)))   # 只用 ≤ t-1 信息预测当前
        resid[k] = y_new[k] - pred[k]                           # 当前观测到达 → 可计算残差
        # 当前观测已到达 → 允许纳入状态，供下一时刻预测使用
        r_ = r_.append(y_new[k:k + 1], exog=ex, refit=False)    # 追加观测但不重新拟合
    return pred, resid

def robust_scale(resid_hist, sigma0):
    """滚动稳健尺度 σ̂ = 1.4826·MAD（不被漂移/离群撑大，异常检测才灵）；
    开头不足一个窗口时用训练段残差 σ 兜底（绝不用未来值）"""
    s = pd.Series(resid_hist).rolling(24, min_periods=8)
    mad = s.apply(lambda w: np.median(np.abs(w - np.median(w))), raw=True)
    return (1.4826 * mad).fillna(sigma0).to_numpy()

# ----------------------------------------------------------------------
# 4. 残差状态 Kalman：状态 = [偏差 b_t, 偏差斜率 d_t]
#    转移：b_t = b_{t-1} + d_{t-1}；观测：r_t = b_t + v
# ----------------------------------------------------------------------
class ResidualKalman:
    """残差状态 Kalman 滤波器（跟踪基线预测的系统性偏差）。

    状态向量 x = [偏差 b_t, 偏差斜率 d_t]：
        转移方程: b_t = b_{t-1} + d_{t-1}（局部线性漂移假设）
        观测方程: r_t = b_t + v，v ~ N(0, R)
    自适应机制:
        (a) 孤立异常值 → 当步创新门控（等效放大 R）
        (b) 结构变化（突变/渐变漂移）→ 放大 Q 让状态快速跟上
    """

    def __init__(self, R0, q_b, q_s, adaptive=True):
        """初始化滤波器。

        参数:
            R0      : 观测噪声方差（用训练段残差方差估计）
            q_b     : 偏差状态的过程噪声方差
            q_s     : 斜率状态的过程噪声方差
            adaptive: 是否启用自适应 R/Q 机制
        """
        self.x = np.zeros(2)                 # 状态初值 [b, d] = [0, 0]（无先验偏差）
        self.P = np.eye(2) * 10.0            # 初始协方差取大值，表示初值不确定性高
        self.R0, self.q_b, self.q_s = R0, q_b, q_s
        self.adaptive = adaptive
        self.Q_boost = 1.0                   # Q 放大系数（检测到结构变化时 > 1）

    def predict_bias(self):
        """观测到达【前】调用：返回先验偏差，用于当前时刻的预测（无泄漏的关键）。"""
        F = np.array([[1.0, 1.0], [0.0, 1.0]])
        Q = np.diag([self.q_b, self.q_s]) * self.Q_boost
        self.x = F @ self.x
        self.P = F @ self.P @ F.T + Q
        return self.x[0]

    def update(self, r, s_rob, m8, m24, m8_prev):
        """当前观测到达【后】调用：产出 posterior，只给下一时刻用。
        m8/m24 = 最近 8/24 个基线残差的均值（含当前）；
        m8_prev = 前 7 步残差均值（不含当前，用于异常门控）。"""
        H = np.array([1.0, 0.0])             # 观测矩阵：只观测偏差 b，不直接观测斜率 d
        S = H @ self.P @ H + self.R0         # 新息方差 S = H·P·Hᵀ + R
        K = (self.P @ H) / S                 # Kalman 增益 K = P·Hᵀ / S
        innov = r - self.x[0]                # 新息（残差观测 - 先验偏差预测）
        # (a) 孤立异常值 → 门控当步创新：残差相对【局部水平】（前 7 步均值）
        #     偏离超 3·稳健σ 时，只信这一步观测的 20%。只作用于当步、不遗留——
        #     若做成持续多步的 R 放大，平台期里增益被冻结，状态反而追不上。
        gate = 1.0
        if self.adaptive and s_rob > 0 and abs(r - m8_prev) > 3.0 * s_rob:
            gate = 0.2
        self.x = self.x + K * (gate * innov)                 # 状态更新：增益 × 门控后的新息
        self.P = (np.eye(2) - np.outer(K, H)) @ self.P       # 协方差更新（含门控近似）
        if self.adaptive:
            self._adapt(r, s_rob, m8, m24)                   # 自适应调整 Q_boost，供下步用
        return innov, gate

    def _adapt(self, r, s_rob, m8, m24):
        """自适应调整过程噪声放大系数 Q_boost（只在 update 内部调用）。"""
        # (b) 结构变化 → 放大 Q 让偏差/斜率状态追上去，随后衰减恢复。两个触发器：
        #     b1 突发型：最近 8 步残差均值显著偏离 0（水平跳变，噪声过不了）
        #     b2 渐变型：最近 24 步均值做 t 型检验 |m24| > 2.6σ̂/√24（持续慢漂移）
        #     注意上限：检测到偏差 ≠ 偏差在快速移动，Q 放大过头 = 高增益追噪声
        b1 = s_rob > 0 and abs(m8) > 1.25 * s_rob
        b2 = s_rob > 0 and abs(m24) > 2.6 * s_rob / np.sqrt(24)
        if b1 or b2:
            self.Q_boost = min(self.Q_boost * 8.0, 12.0)     # 触发：Q 放大 8 倍，封顶 12
        else:
            self.Q_boost = max(self.Q_boost * 0.7, 1.0)      # 未触发：逐步衰减回 1

def run_kalman(base_pred, r_base, R0, q_b, q_s, adaptive, leaky=False):
    """统一驱动：严格遵循 预测 → 观测 → 更新 的顺序；leaky=True 时故意违反。"""
    n = len(base_pred)
    s_rob_hist = robust_scale(r_base, np.sqrt(R0))
    kf = ResidualKalman(R0, q_b, q_s, adaptive=adaptive)
    pred, bias_prior_hist = np.empty(n), np.empty(n)
    gate_hist, qb_hist = np.ones(n), np.ones(n)
    for k in range(n):
        b_prior = kf.predict_bias()                     # (1) 先预测
        bias_prior_hist[k] = b_prior
        pred[k] = base_pred[k] + b_prior                #     当前时刻的真预测
        qb_hist[k] = kf.Q_boost
        m8 = float(np.mean(r_base[max(0, k - 7):k + 1]))   # 观测到达后才可用
        m24 = float(np.mean(r_base[max(0, k - 23):k + 1]))
        m8_prev = float(np.mean(r_base[max(0, k - 7):k]))  # 不含当前点的前文
        if leaky:                                       # (E1) 错误顺序：
            _, _ = kf.update(r_base[k], s_rob_hist[k], m8, m24, m8_prev)  # 先偷看当前观测
            pred[k] = base_pred[k] + kf.x[0]            #   再用后验偏差"预测"当前
            gate_hist[k] = 1.0
        else:
            _, gate = kf.update(r_base[k], s_rob_hist[k], m8, m24, m8_prev)  # (2)(3) 观测→更新，只服务下一时刻
            gate_hist[k] = gate
    return dict(pred=pred, bias=bias_prior_hist, gate=gate_hist, q_boost=qb_hist)

def run_ewma(base_pred, r_base, alpha):
    """固定增益的 EWMA 残差纠偏基线（对照组 B）。

    与 Kalman 同纪律：第 k 步预测只用截至 t-1 的 EWMA 偏差，
    观测到达后才把当前残差纳入 EWMA 更新。
    """
    n = len(base_pred)
    pred, bias = np.empty(n), 0.0
    for k in range(n):
        pred[k] = base_pred[k] + bias                   # 用截至 t-1 的 EWMA 偏差
        bias = alpha * r_base[k] + (1 - alpha) * bias   # 观测到达后更新 EWMA（服务下一步）
    return pred

# ----------------------------------------------------------------------
# 5. 验证段选参（q 从小往大试；α 同理）—— 不许拿测试段调参
# ----------------------------------------------------------------------
def select_params(spec, use_exog):
    """在训练段末尾的验证段上挑选 Kalman/EWMA 超参数（绝不动用测试段）。

    参数:
        spec    : SARIMAX 阶数规格
        use_exog: 是否使用外生变量
    流程:
        1) 在 y_tr[:-N_VAL] 上拟合，滚动预测验证段得到基线预测与残差；
        2) 网格搜索 q_frac（Q 相对 σ² 的比例）与 q_s/q_b 比例，取验证段 MAE 最小者；
        3) 同理在候选 α 中选 EWMA 最优平滑系数。
    返回:
        (best_qf, best_qs_ratio, best_a)
    """
    # 训练段再去掉尾部 N_VAL 步，用于拟合"选参用"的模型
    ex_val = x_tr[:-N_VAL] if use_exog else None
    res_val = fit(spec, y_tr[:-N_VAL], ex_val)
    bp_v, r_v = rolling_baseline(res_val, y_tr[-N_VAL:],
                                 x_tr[-N_VAL:] if use_exog else None)
    # 观测噪声方差：用拟合残差的样本方差估计（只用训练信息）
    sig2 = float(np.var(res_val.resid[-120:], ddof=1))
    best_qf, best_qs_ratio, best_m = None, None, np.inf
    # 网格搜索：Q 主项比例 × 斜率/偏差噪声比例，以验证段 MAE 为准则
    for qf in [0.005, 0.01, 0.02, 0.05, 0.1]:
        for qs_ratio in [0.1, 0.5]:
            out = run_kalman(bp_v, r_v, sig2, qf * sig2, qs_ratio * qf * sig2, adaptive=True)
            m = float(np.mean(np.abs(y_tr[-N_VAL:] - out["pred"])))   # 验证段 MAE
            if m < best_m:
                best_qf, best_qs_ratio, best_m = qf, qs_ratio, m
    # EWMA 的 α 同样在验证段上挑选（shift(1) 保证只用 ≤ t-1 的偏差）
    alphas = [0.05, 0.1, 0.2, 0.3]
    best_a = min(alphas, key=lambda a: float(np.mean(np.abs(
        y_tr[-N_VAL:] - (bp_v + pd.Series(r_v).ewm(alpha=a).mean().shift(1)
                         .fillna(0).to_numpy())))))
    print(f"  验证段选参: q_frac={best_qf}, q_s/q_b={best_qs_ratio} "
          f"(val MAE={best_m:.3f}), alpha={best_a}")
    return best_qf, best_qs_ratio, best_a

# ----------------------------------------------------------------------
# 6. 完整实验：弱基线（主实验）与强基线（对照）各跑一遍六组对照
# ----------------------------------------------------------------------
REGIME_WIN = np.arange(REGIME_K, REGIME_K + 30)                       # 突变后 30 步
OUT_WIN = np.concatenate([np.arange(9, 15), np.arange(117, 124)])    # 异常点 ±2 邻域
DRIFT_WIN = np.arange(80, 150)                                        # 温度下滑造成的慢漂移段

def experiment(name, spec, use_exog):
    """完整跑一组实验：选参 → 拟合 → 六组对照预测 → 计算并打印指标表。

    参数:
        name    : 实验名称（打印标题）
        spec    : SARIMAX 阶数规格
        use_exog: 是否使用外生气温
    返回:
        (df, results_dict)：指标 DataFrame 和各方法的预测/诊断量字典
    """
    print(f"\n=== {name} ===")
    qf, qs_ratio, alpha = select_params(spec, use_exog)     # 第一步：验证段选超参
    res = fit(spec, y_tr, x_tr if use_exog else None)       # 第二步：全训练段拟合基线
    base_pred, r_base = rolling_baseline(res, y_te, x_te if use_exog else None)  # 防泄漏滚动预测
    sig2 = float(np.var(res.resid[-120:], ddof=1))          # R0 = 残差方差（只用训练信息）
    q_b, q_s = qf * sig2, qs_ratio * qf * sig2              # 换算成 Q 的绝对值

    outD = run_kalman(base_pred, r_base, sig2, q_b, q_s, adaptive=True)   # D: 自适应 R/Q
    outC = run_kalman(base_pred, r_base, sig2, q_b, q_s, adaptive=False)  # C: 固定 R/Q
    outE = run_kalman(base_pred, r_base, sig2, q_b, q_s, adaptive=True, leaky=True)  # E1: 泄漏示范
    predB = run_ewma(base_pred, r_base, alpha)                            # B: EWMA 纠偏
    predE2 = base_pred + r_base   # 极限泄漏：把当前残差全加到当前"预测"＝直接抄答案

    # 逐方法计算指标：全段 MAE/RMSE + 三个关键窗口（突变/漂移/异常邻域）
    rows = []
    for mname, p in [("A. 基线", base_pred), (f"B. +EWMA(α={alpha})", predB),
                     ("C. +Kalman(固定R/Q)", outC["pred"]),
                     ("D. +Kalman(自适应R/Q)", outD["pred"]),
                     ("E1. 泄漏(先看答案再预测)", outE["pred"]),
                     ("E2. 完全泄漏(残差全加上)", predE2)]:
        rows.append({"方法": mname,
                     "MAE全段": round(float(np.mean(np.abs(y_te - p))), 3),
                     "RMSE全段": round(float(np.sqrt(np.mean((y_te - p) ** 2))), 3),
                     "MAE突变窗": round(float(np.mean(np.abs(y_te[REGIME_WIN] - p[REGIME_WIN]))), 3),
                     "MAE漂移窗": round(float(np.mean(np.abs(y_te[DRIFT_WIN] - p[DRIFT_WIN]))), 3),
                     "RMSE异常窗": round(float(np.sqrt(np.mean((y_te[OUT_WIN] - p[OUT_WIN]) ** 2))), 3)})
    df = pd.DataFrame(rows)
    print(df.to_string(index=False))
    return df, dict(base=base_pred, r_base=r_base, D=outD, C=outC, E=outE, B=predB)

# ---- 实验1（主）：制度突变场景。基线阶数由验证段从候选中选出 ----
CANDIDATES = [dict(order=(2, 1, 2), seasonal_order=(1, 0, 1, 7), trend="c"),
              dict(order=(2, 1, 1), seasonal_order=(1, 0, 1, 7), trend="c"),
              dict(order=(1, 1, 1), seasonal_order=(1, 0, 1, 7), trend="c"),
              dict(order=(2, 0, 2), seasonal_order=(1, 0, 1, 7), trend="c")]
ex_val = x_tr[:-N_VAL]
best_spec, best_val = None, np.inf
for spec in CANDIDATES:
    res_v = fit(spec, y_tr[:-N_VAL], ex_val)                # 去掉验证段后拟合候选模型
    bp_v, _ = rolling_baseline(res_v, y_tr[-N_VAL:], x_tr[-N_VAL:])  # 验证段滚动预测
    m = float(np.mean(np.abs(y_tr[-N_VAL:] - bp_v)))        # 验证段 MAE 作为选阶准则
    print(f"  候选 {spec['order']}{spec['seasonal_order']}: 验证段 MAE={m:.3f}")
    if m < best_val:
        best_spec, best_val = spec, m
print(f"  选定基线: {best_spec['order']}{best_spec['seasonal_order']} (val MAE={best_val:.3f})")
df_main, res_main = experiment("实验1(主)：制度突变——验证段选出的最优基线被击穿",
                               best_spec, use_exog=True)

# ---- 实验2（对照）：基线漏建外生气温（残差呈慢漂移游走） ----
SPEC_WEAK = dict(order=(1, 0, 0), seasonal_order=(1, 0, 0, 7), trend="c")
df_weak, res_weak = experiment("实验2(对照)：基线漏建外生气温——残差慢漂移场景",
                               SPEC_WEAK, use_exog=False)

df_main.to_csv("results_main_regime.csv", index=False, encoding="utf-8-sig")
df_weak.to_csv("results_weak_baseline.csv", index=False, encoding="utf-8-sig")

# ----------------------------------------------------------------------
# 7. 图（都画实验1：突变场景）
# ----------------------------------------------------------------------
tt = np.arange(SPLIT, N)      # 测试段的时间索引（全局坐标）
kk = np.arange(n_test)        # 测试段内相对索引（0 起步）

# 图1：测试段全景 —— 真实值 vs 基线 vs 自适应 Kalman，标注突变与异常点位置
fig, ax = plt.subplots(figsize=(12, 4.5))
ax.plot(tt, y_te, "k-", lw=1.2, label="真实值")
ax.plot(tt, res_main["base"], color="tab:gray", lw=1.0, label="A. 基线(验证段最优)")
ax.plot(tt, res_main["D"]["pred"], color="tab:red", lw=1.4, label="D. +Kalman(自适应R/Q)")
for x0, c, s in [(600, "tab:blue", "斜率突变"), (592, "tab:green", "异常点"), (700, "tab:green", "异常点")]:
    ax.axvline(x0, color=c, ls="--", lw=1)
    ax.annotate(s, (x0 + 1, ax.get_ylim()[0] + 2), color=c, fontsize=9)
ax.set_title("测试段一步预测：验证段最优基线在制度突变处崩盘，残差Kalman将其拉回")
ax.legend(ncol=3, loc="upper left"); ax.set_xlabel("时间步"); ax.set_ylabel("y")
fig.tight_layout(); fig.savefig("fig1_test_overview.png", dpi=150)

# 图2：突变点附近放大（第 5~80 步）—— 对比固定 Kalman 与自适应 Kalman 的行为差异
fig, ax = plt.subplots(figsize=(12, 4.5))
m = (kk >= 5) & (kk <= 80)   # 放大窗口的布尔掩码
ax.plot(tt[m], y_te[m], "k.-", lw=1, ms=5, label="真实值")
ax.plot(tt[m], res_main["base"][m], "o-", color="tab:gray", lw=1.2, ms=3, label="A. 基线")
ax.plot(tt[m], res_main["C"]["pred"][m], "s-", color="tab:orange", lw=1.2, ms=3, label="C. +Kalman(固定)")
ax.plot(tt[m], res_main["D"]["pred"][m], "s-", color="tab:red", lw=1.2, ms=3, label="D. +Kalman(自适应)")
ax.axvline(600, color="tab:blue", ls="--", lw=1)
ax.axvline(592, color="tab:green", ls="--", lw=1)
ax.set_title("突变与异常点附近放大：异常点处 R 起跳，突变后 Q 起跳（固定增益版两头吃亏）")
ax.legend(); ax.set_xlabel("时间步"); ax.set_ylabel("y")
fig.tight_layout(); fig.savefig("fig2_regime_zoom.png", dpi=150)

# 图3：状态跟踪诊断 —— 上图为先验偏差状态 vs 实际基线偏差；下图为门控与 Q 放大系数
fig, axes = plt.subplots(2, 1, figsize=(12, 6), sharex=True)
axes[0].plot(tt, pd.Series(res_main["r_base"]).rolling(8).mean(), color="tab:gray",
             lw=1.2, label="基线偏差（残差 8 步均值）")
axes[0].plot(tt, res_main["D"]["bias"], color="tab:red", lw=1.2, label="Kalman 先验偏差状态 b_t")
axes[0].axhline(0, color="k", lw=0.5)
axes[0].axvline(600, color="tab:blue", ls="--", lw=1)
axes[0].legend(); axes[0].set_ylabel("偏差")
axes[1].plot(tt, res_main["D"]["gate"], color="tab:green", label="异常门控系数（1=正常，0.2=压制当步创新）")
axes[1].plot(tt, res_main["D"]["q_boost"], color="tab:purple", label="Q 放大系数")
axes[1].axvline(600, color="tab:blue", ls="--", lw=1)
axes[1].set_yscale("log"); axes[1].legend(ncol=2, fontsize=9)
axes[1].set_xlabel("时间步"); axes[1].set_ylabel("系数(log)")
fig.suptitle("残差状态跟踪与自适应（异常点当步门控压制，突变/漂移后 Q 起跳）")
fig.tight_layout(); fig.savefig("fig3_bias_tracking.png", dpi=150)
print("\n图已保存: fig1_test_overview.png / fig2_regime_zoom.png / fig3_bias_tracking.png")
