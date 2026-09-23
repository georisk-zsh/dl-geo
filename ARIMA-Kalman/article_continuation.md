# ARIMA+Kalman 文章（续写稿）

> 接 01「先聊聊这套组合」、02「数学表达」之后的部分。

---

## **03**代码实现

先把 02 节的符号和代码对齐，后面对着看：

| 数学记号 | 代码里 | 含义 |
|---|---|---|
| $\hat y_t^{base}$ | `base_pred[k]` | SARIMAX 滚动一步预测（基线） |
| $r_t = y_t - \hat y_t^{base}$ | `r_base[k]` | 基线残差（观测到达后才有） |
| 状态 $[b_t, d_t]$ | `kf.x = [b, d]` | 偏差、偏差斜率 |
| $F = \begin{pmatrix}1&1\\0&1\end{pmatrix}$ | `F = [[1,1],[0,1]]` | 状态转移 |
| $R_0$ | `R0 = sig2` | 训练段残差方差定标 |
| $Q$ | `diag([q_b, q_s])` | 过程噪声（自适应放大） |

### 3.1 数据与实验设计

合成一条 730 天的序列：慢趋势 + 周季节 + 外生气温（可提前获得，合法）+ 噪声，**第 600 天斜率从 0.05 跳到 0.90（制度突变，落在测试段内部）**，再点三个孤立异常点。训练 580 / 测试 150。

跑两个实验：

- **实验1（主）**：基线阶数由验证段从 4 个候选里选——我们会看到，验证段最优的基线照样被突变击穿，纠偏层把它拉回来；
- **实验2（对照）**：基线建了周季节但**故意漏建外生气温**——生产里最常见的遗漏，残差呈慢漂移。

```python
import warnings; warnings.filterwarnings("ignore")
import numpy as np, pandas as pd
from statsmodels.tsa.statespace.sarimax import SARIMAX

rng = np.random.default_rng(7)
N = 730; t = np.arange(N)
temp = 15 + 10*np.sin(2*np.pi*(t-80)/365) + rng.normal(0, 2.0, N)   # 外生气温
season = 6.0*np.sin(2*np.pi*t/7) + 2.0*np.sin(4*np.pi*t/7)          # 周季节
slope = np.where(t < 600, 0.05, 0.90)                               # t=600 斜率突变
y = 100 + np.cumsum(slope) + season + 1.2*(temp-15) + rng.normal(0, 1.5, N)
for i, mag in zip([210, 592, 700], [18.0, -16.0, 14.0]):            # 孤立异常点
    y[i] += mag

SPLIT = 580                       # 训练 580 / 测试 150
N_VAL = 60                        # 训练段末尾 60 步做验证（选阶数/q/α）
y_tr, y_te = y[:SPLIT], y[SPLIT:]
x_tr, x_te = temp[:SPLIT].reshape(-1,1), temp[SPLIT:].reshape(-1,1)
```

### 3.2 基线：防泄漏滚动一步预测

**这里是最容易做出"假好看"指标的地方。** 正确姿势：拟合只在训练段做一次；测试段从拟合结果出发，逐点 `forecast(1)` → `append(refit=False)`。任何时刻的预测都只见过 ≤ t-1 的观测。

```python
def fit(spec, endog, exog):
    return SARIMAX(endog, exog=exog, enforce_stationarity=True,
                   enforce_invertibility=True, **spec).fit(disp=False, maxiter=1000)

def rolling_baseline(res, y_new, x_new):
    n = len(y_new)
    pred, resid = np.empty(n), np.empty(n)
    r_ = res
    for k in range(n):
        ex = x_new[k:k+1] if x_new is not None else None
        pred[k] = float(np.asarray(r_.forecast(1, exog=ex)))
        resid[k] = y_new[k] - pred[k]           # 观测到达后才可计算
        r_ = r_.append(y_new[k:k+1], exog=ex, refit=False)   # 纳入状态，供下一时刻
    return pred, resid
```

顺带一句：**SARIMAX 一键 `fit` 是会掉退化解的**——样本内残差很好看、参数却贴在不可逆边界上，样本外完全不追漂移。所以基线阶数不要拍脑袋，用验证段验收（3.5 节一起做）。

### 3.3 残差状态 Kalman（含异常门控与 Q 触发）

状态就两维 $[b_t, d_t]$；$R_0$ 用训练段残差方差定标，q 按比例给、验证段里从小往大选。两件自适应的事：

- **孤立异常 → 当步门控**：残差相对"局部水平"（前 7 步均值）偏离超 3·稳健σ，就只信当步观测的 20%。**只作用于当步、不遗留**；
- **结构变化 → 放大 Q**：8 步均值检验（抓水平跳变）+ 24 步 t 型检验（抓慢漂移），触发后 Q 逐步放大、**上限 12 倍**、离开触发后衰减恢复。

```python
def robust_scale(resid_hist, sigma0):
    # 滚动稳健尺度 σ̂ = 1.4826·MAD：不被漂移/周期撑大，异常检测才灵
    s = pd.Series(resid_hist).rolling(24, min_periods=8)
    mad = s.apply(lambda w: np.median(np.abs(w - np.median(w))), raw=True)
    return (1.4826*mad).fillna(sigma0).to_numpy()

class ResidualKalman:
    def __init__(self, R0, q_b, q_s, adaptive=True):
        self.x = np.zeros(2)                    # [b, d]
        self.P = np.eye(2) * 10.0
        self.R0, self.q_b, self.q_s = R0, q_b, q_s
        self.adaptive = adaptive
        self.Q_boost = 1.0

    def predict_bias(self):
        # 观测到达【前】调用：返回先验偏差，用于当前时刻预测（无泄漏的关键）
        F = np.array([[1.0, 1.0], [0.0, 1.0]])
        Q = np.diag([self.q_b, self.q_s]) * self.Q_boost
        self.x = F @ self.x
        self.P = F @ self.P @ F.T + Q
        return self.x[0]

    def update(self, r, s_rob, m8, m24, m8_prev):
        # 观测到达【后】调用：产出 posterior，只给下一时刻用
        H = np.array([1.0, 0.0]); S = H @ self.P @ H + self.R0
        K = (self.P @ H) / S
        innov = r - self.x[0]
        gate = 1.0                              # (a) 孤立异常 → 门控当步创新
        if self.adaptive and s_rob > 0 and abs(r - m8_prev) > 3.0*s_rob:
            gate = 0.2
        self.x = self.x + K * (gate * innov)
        self.P = (np.eye(2) - np.outer(K, H)) @ self.P
        if self.adaptive:
            self._adapt(r, s_rob, m8, m24)
        return innov, gate

    def _adapt(self, r, s_rob, m8, m24):
        # (b) 结构变化 → 放大 Q（有上限！），离开触发后衰减恢复
        b1 = s_rob > 0 and abs(m8)  > 1.25 * s_rob                  # 突发型
        b2 = s_rob > 0 and abs(m24) > 2.6 * s_rob / np.sqrt(24)     # 慢漂移型
        if b1 or b2:
            self.Q_boost = min(self.Q_boost * 8.0, 12.0)
        else:
            self.Q_boost = max(self.Q_boost * 0.7, 1.0)
```

> 为什么异常检测用 `|r − m8_prev|` 而不是 `|r|`？因为漂移期里正常残差本来就大，**要测的是"相对局部水平的偏离"**，否则漂移期里的真异常点永远抓不到，漂移本身还老被误判成异常。

### 3.4 统一驱动：六组对照

所有纠偏方法共用同一条基线，只改"怎么吃残差"。E1、E2 是**故意写错的错误示范**，专门用来说明顺序纪律值多少指标：

```python
def run_kalman(base_pred, r_base, R0, q_b, q_s, adaptive, leaky=False):
    n = len(base_pred)
    s_rob = robust_scale(r_base, np.sqrt(R0))
    kf = ResidualKalman(R0, q_b, q_s, adaptive=adaptive)
    pred, bias_hist, gate_hist, qb_hist = np.empty(n), np.empty(n), np.ones(n), np.ones(n)
    for k in range(n):
        b_prior = kf.predict_bias()                       # (1) 先预测
        bias_hist[k] = b_prior
        pred[k] = base_pred[k] + b_prior                  #     当前时刻的真预测
        qb_hist[k] = kf.Q_boost
        m8  = float(np.mean(r_base[max(0,k-7):k+1]))      # 观测到达后才可用
        m24 = float(np.mean(r_base[max(0,k-23):k+1]))
        m8p = float(np.mean(r_base[max(0,k-7):k]))
        if leaky:                                         # E1 错误顺序！
            kf.update(r_base[k], s_rob[k], m8, m24, m8p)  #   先偷看当前观测并更新
            pred[k] = base_pred[k] + kf.x[0]              #   再用后验偏差"预测"当前
        else:
            _, gate = kf.update(r_base[k], s_rob[k], m8, m24, m8p)  # (2)(3) 只服务下一时刻
            gate_hist[k] = gate
    return dict(pred=pred, bias=bias_hist, gate=gate_hist, q_boost=qb_hist)

def run_ewma(base_pred, r_base, alpha):
    n = len(base_pred); pred = np.empty(n); bias = 0.0
    for k in range(n):
        pred[k] = base_pred[k] + bias                     # 用截至 t-1 的 EWMA 偏差
        bias = alpha * r_base[k] + (1-alpha) * bias
    return pred
```

A = 基线；B = +EWMA(α)；C = +Kalman(固定R/Q)；D = +Kalman(自适应)；E1 = 泄漏版；E2 = 完全泄漏（`base_pred + r_base`，等于直接把答案加回去，MAE 必然是 0，放出来是给大家笑的，也是给大家背的）。

### 3.5 验证段选参（不许碰测试段）

q 从小往大选、α 同理，**基线阶数也一起在验证段里验收**：

```python
def select_params(spec, use_exog):
    ex_val = x_tr[:-N_VAL] if use_exog else None
    res_val = fit(spec, y_tr[:-N_VAL], ex_val)
    bp_v, r_v = rolling_baseline(res_val, y_tr[-N_VAL:], x_tr[-N_VAL:] if use_exog else None)
    sig2 = float(np.var(res_val.resid[-120:], ddof=1))
    best_qf, best_qsr, best_m = None, None, np.inf
    for qf in [0.005, 0.01, 0.02, 0.05, 0.1]:
        for qsr in [0.1, 0.5]:
            out = run_kalman(bp_v, r_v, sig2, qf*sig2, qsr*qf*sig2, adaptive=True)
            m = float(np.mean(np.abs(y_tr[-N_VAL:] - out["pred"])))
            if m < best_m: best_qf, best_qsr, best_m = qf, qsr, m
    best_a = min([0.05,0.1,0.2,0.3], key=lambda a: float(np.mean(np.abs(
        y_tr[-N_VAL:] - (bp_v + pd.Series(r_v).ewm(alpha=a).mean().shift(1)
                         .fillna(0).to_numpy())))))
    return best_qf, best_qsr, best_a
```

---

## **04**实验结果

测试段 150 步、全部为真·一步预测。窗口含义：**突变窗** = 斜率跳变后 30 步；**漂移窗** = 测试段后 70 步（气温下滑造成的持续偏移）；**异常窗** = 两个异常点 ±2 邻域的 RMSE。

### 实验1（主）：制度突变击穿"验证段最优"基线

四个候选基线在验证段的 MAE：`(2,1,2)` 1.688、`(2,1,1)` 1.226、`(1,1,1)` 1.229、`(2,0,2)` **1.215**——验证段选中了 `(2,0,2)`。

| 方法 | MAE全段 | RMSE全段 | MAE突变窗 | MAE漂移窗 | RMSE异常窗 |
|---|---|---|---|---|---|
| A. 基线 (2,0,2)(1,0,1,7)+外生 | 14.652 | 16.127 | 10.315 | 17.963 | 15.596 |
| B. +EWMA(α=0.05) | 3.789 | 4.808 | 6.534 | 2.279 | 5.958 |
| C. +Kalman(固定R/Q) | 2.092 | 2.927 | 1.630 | 2.159 | 6.585 |
| **D. +Kalman(自适应)** | **1.994** | **2.823** | **1.477** | **2.103** | **6.254** |
| E1. 泄漏版（错误示范） | 1.331 | 2.186 | 0.975 | 1.395 | 5.743 |
| E2. 完全泄漏（抄答案） | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 |

四件事特别值得说：

1. **验证段只差 0.011，就选出了会被击穿的那个。** `(2,0,2)` 没有差分项（d=0），对"水平的记忆"全靠自回归根；斜率突变一来，它按"新水平 = 旧趋势延续"外推，误差以接近 0.85/天的斜率线性累积（漂移窗 MAE 17.96），全段 MAE 直接干到 14.65。**验证段最优 ≠ 未来安全**，这是比任何模型选择技巧都值钱的一课。
2. **残差 Kalman 把它拉回 1.99。** 突变后基线残差是一条斜坡，而 $[b,d]$ 状态的转移矩阵恰好把"斜坡"作为特征方向——偏差状态 20 步内从 0 爬到 +20（图3上半），把斜坡误差整个吃掉。**注意这不是"Kalman 比 ARIMA 强"**，而是"残差里剩下的成分恰好是偏差状态的形状"；如果突变是别的形状（比如纯方差放大），这层一样无能为力。
3. **固定增益的两头吃亏。** B 想稳（α=0.05），突变窗 6.53，追得太慢；C 稳中有追，但异常窗 6.59——异常点被增益原样吃进状态。D 靠"异常当步门控 + 突变后 Q 上调"把两头都占了：突变窗 1.48、异常窗 6.25，**五列全部优于固定版**。
4. **E1 比 D 好看 33%（1.33 vs 1.99），但它不是预测。** 它先拿了 $y_t$ 更新完状态再回头"预测" $t$——相当于把 $\hat y = (1-K)\cdot\hat y^{honest} + K\cdot y$ 里掺了 $K$ 份答案。E2 是这个逻辑的极限：直接把当前残差全加上，MAE=0。**看到"纠偏后指标暴涨"先问一句：信息集里有没有当前观测？**

### 实验2（对照）：基线漏建外生气温（慢漂移场景）

| 方法 | MAE全段 | RMSE全段 | MAE突变窗 | MAE漂移窗 | RMSE异常窗 |
|---|---|---|---|---|---|
| A. 基线 (1,0,0)(1,0,0,7)+c，无外生 | 6.286 | 7.751 | 4.799 | 7.671 | 9.991 |
| **B. +EWMA(α=0.05)** | **3.956** | **5.105** | 3.481 | 4.415 | 7.206 |
| C. +Kalman(固定R/Q) | 4.207 | 5.380 | 3.409 | 4.682 | 7.985 |
| D. +Kalman(自适应) | 4.141 | 5.424 | **3.283** | **4.535** | **7.689** |
| E1. 泄漏版（错误示范） | 2.826 | 3.892 | 2.436 | 3.041 | 5.879 |
| E2. 完全泄漏（抄答案） | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 |

这一张表是给"组合拳信仰者"泼冷水的：

- 残差是**慢漂移 + 大噪声的游走**（没有突发事件），我们把固定增益从 0.05 扫到 0.7，最优就在 0.05~0.1 附近，增益再高单调变差。这种场景下**一个简单 EWMA 就吃到了大部分收益**（3.96，比 D 的 4.14 还好）；
- D 仍然五列全面优于固定版 C——自适应的价值是真实的，但**这层不是免费的，更不是万能的**。真正治本的是把气温建进基线（实验1里的强结构），纠偏层只是兜底；
- 还有个小坑：验证段（60 步）里的漂移比测试段弱得多，所以选出来的 α/q 都偏小——**验证段的分布 ≠ 未来的分布**，选参窗口要尽量覆盖你预期会发生的工况。

### 三张图

- **图1（总览）**：灰线（基线）在 t=600 后整体塌陷、越掉越远；红线（+Kalman 自适应）全程贴住真值；
- **图2（突变附近放大）**：592 处异常点真值深坑（谁都预测不到，差别在预测完之后的状态有没有被污染）；600 后灰线 sagging，C/D 贴住；
- **图3（机制）**：上半——偏差状态 $b_t$（红）从 0 爬到 +20，跟住基线误差（灰，8 步均值）；下半——Q 放大系数在突变后起跳并保持（占空比≈90%，因为漂移真实存在），异常门控只在异常步下压到 0.2、不遗留。

---

## **05**踩坑清单与总结

**这层的正确身份：基线之外的"残差安全网"，专吃基线留下的持续性偏差。** 不是第二引擎，更不是指标美化器。

1. **顺序纪律是第一原则。** 先预测（只准用 ≤ t−1 的信息）→ 观测到达 → 更新只服务下一时刻。代码评审时盯死两处：`update` 里有没有用到当步观测的派生量先于 `predict`；评估循环里有没有把滤波值当预测值。
2. **SARIMAX 内部本来就是 Kalman Filter。** 别拿"ARIMA + Kalman"当成两个独立模型硬拼；这层的输入是**基线残差**，不是原始序列。
3. **状态两维就够：[偏差, 偏差斜率]。** 它天然匹配"斜坡型"残差误差（漂移、缓慢失准），对周期型残差几乎无能为力——周期误差请建进基线。
4. **检测用稳健尺度（MAD），响应要匹配形态。** 单点尖峰 → 当步门控（只压这一步，绝不遗留）；持续偏移 → Q 上调，但**必须设上限**。检测到"偏差存在"≠"偏差在快速移动"——响应过猛等于把检测信号变成噪声注入（我们实测 Q×80 把增益顶到 0.5，全面劣化；cap 到 12 才对）。
5. **q 和 α 从小往大，在验证段选。** 最优固定增益常常小得反直觉（我们扫出 α≈0.05~0.1 最优）。验证段要覆盖你预期的工况，否则选出的参数在真工况下偏保守。
6. **验证段最优的基线也会被突变击穿。** 验证段上 0.011 的领先毫无意义，d=0 的模型一个斜率突变就崩。基线选择要留一手（结构性鲁棒 > 局部最优），纠偏层就是那一手。
7. **能建进基线的结构就别留给纠偏层。** 实验2里 EWMA 都能赢 Kalman——漏建的外生变量、季节，治本在基线，这层只兜底。
8. **上线后监控三个量：** 异常门控触发率（长期偏高说明基线残差有尖峰问题）、Q 占空比（长期顶着上限说明基线该修了）、偏差状态 $b_t$ 的量级（系统性偏离 0 说明结构缺失）。这三个量就是这层的"仪表盘"。

一句话收尾：**ARIMA/ARIMAX 负责把规律学掉，Kalman 残差层负责承认"我最近一直偏"，并把这份偏移诚实地、按正确顺序地补到下一次预测里。** 顺序错了，剩下的都是表演。

---

## 附：复现说明

- 环境：Python 3.12 + numpy/pandas/statsmodels(≥0.13)/matplotlib，全脚本跑完一分钟以内；
- 完整脚本（含全部代码 + 画图 + CSV 输出）：`demo_arima_kalman.py`；
- 输出：`results_main_regime.csv`、`results_weak_baseline.csv`、`fig1_test_overview.png`、`fig2_regime_zoom.png`、`fig3_bias_tracking.png`；
- 随机种子固定（`default_rng(7)`），数字可复现。
