"""生成 demo_raw_geodata.csv：合成两年期监测数据 + 植入 8 处典型污染。

干净数据生成规律（物理可解释）：
  降雨：湿季事件多的 gamma 雨；库水位：年周期 + 缓慢噪声；
  气温：年周期 + 白噪声；位移速率 = 基础蠕变 + 0.35×有效降雨(15 天指数滞后核) + 低水位贡献 + 噪声。

植入污染（答案见 README 附录 A）：
  ① 速率连续缺 7 天        idx 120:126  (2023-05-01~07)
  ② 雨量随机缺 12 天       rng.choice(…)
  ③ 速率孤立尖峰 7.375     idx 400      (2024-02-05)
  ④ 水位台阶 +2.5          idx 500:     (2024-05-15 起)
  ⑤ 雨量单位漂移 ×0.1      idx 600:639  (2024-08-23~10-01)
  ⑥ 雨量符号错误 -3.2      idx 150      (2023-05-31)
  ⑦ 重复日期 3 行          idx 300:302  (2023-10-28~30)
  ⑧ 时间乱序               idx 210/211 两行互换 (2023-07-30/31)

随机种子固定（default_rng(42)），可完整复现。
"""
import numpy as np
import pandas as pd

rng = np.random.default_rng(42)
days = pd.date_range('2023-01-01', '2024-12-31', freq='D')
n = len(days)
doy = days.dayofyear.values.astype(float)

wet = 0.5 + 0.5 * np.sin(2 * np.pi * (doy - 100) / 365)
rain = np.where(rng.random(n) < 0.28, rng.gamma(2.0, 5.0, n) * (0.2 + wet), 0.0)
res = 148 + 12 * np.sin(2 * np.pi * (doy - 240) / 365)
res = res + np.convolve(rng.normal(0, 0.3, n), np.ones(20) / 20, mode='same')
temp = 15 + 12 * np.sin(2 * np.pi * (doy - 120) / 365) + rng.normal(0, 2, n)
k = 0.85 ** np.arange(16)
k = k / k.sum()
eff = np.convolve(rain, k, mode='full')[:n]
rate = 0.05 + 0.35 * eff + 0.004 * (155 - res) + rng.normal(0, 0.02, n)
rate = np.clip(rate, 0.0, None)

df = pd.DataFrame({'date': days, 'rainfall_mm': rain.round(1),
                   'reservoir_m': res.round(2), 'temp_c': temp.round(1),
                   'disp_rate_mm_d': rate.round(3)})

df.loc[120:126, 'disp_rate_mm_d'] = np.nan
idx = rng.choice(np.setdiff1d(np.arange(n), np.arange(115, 132)), 12, replace=False)
df.loc[idx, 'rainfall_mm'] = np.nan
df.loc[400, 'disp_rate_mm_d'] = df.loc[400, 'disp_rate_mm_d'] * 25 + 5
df.loc[500:, 'reservoir_m'] += 2.5
df.loc[600:639, 'rainfall_mm'] *= 0.1
df.loc[150, 'rainfall_mm'] = -3.2
dup = df.loc[[300, 301, 302]].copy()
df = pd.concat([df, dup], ignore_index=True)
i, j = 210, 211
tmp = df.iloc[i].copy()
df.iloc[i] = df.iloc[j]
df.iloc[j] = tmp

df.to_csv('demo_raw_geodata.csv', index=False)
print('rows =', len(df))
