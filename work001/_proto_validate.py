"""原型验证脚本：用 Python 复算 MATLAB main.m 的两段数据准备逻辑，并与 MATLAB 存档 .mat 逐元素对比。

背景：work001 是论文 "Lin et al. (2025) Time series prediction of the slope stability
under rainfall conditions based on LSTM and CNN"（LSTM + 空间插值 + CNN 的降雨边坡
稳定性 FS 预测）的复现项目。在正式构建复现 Notebook 前，先用本脚本验证 Python 移植的
数据准备逻辑与 MATLAB 完全一致。

验证内容：
1) main.m 第一段：从各时刻 odbPOR.txt 点云重建 72 x 360 监测点 POR 序列，
   与 data.mat::PORthisslope 对比；
2) main.m::genSlopeMatrix：把边坡几何/材料 + 孔压点云栅格化为 (4,120,120) 张量，
   与 slopedata.mat::slope 对比。

注意：data.mat / slopedata.mat 为 MATLAB v7.3 (HDF5) 格式，scipy.io.loadmat 读不了，
必须用 h5py 读取。
"""
import h5py
import numpy as np

DATA = "data"  # 数据根目录（inp/ 存孔压点云，slopefiles/ 存几何材料，*.mat 存 MATLAB 存档）

# ---------- 1) 监测点 POR 网格（main.m 第一段） ----------
# 18 条竖线的 x 坐标：-20, -10, 0..5（步长 1）, 10..100（步长 10），与 MATLAB 定义一致
x_lines = np.array([-20, -10] + list(range(0, 6)) + list(range(10, 101, 10)), dtype=float)
ypart = 20                    # 每条竖线等距取 20 个采样点 → 18 x 20 = 360 个监测点
POR_seq = []                  # 72 x 360
for t in range(1, 73):        # 72 个降雨小时，逐时刻读取真值孔压点云
    por = np.loadtxt(f"{DATA}/inp/slope2_{t}odbPOR.txt", delimiter=",")  # (~4700, 3): (x, y, POR)
    cols = []
    for xx in x_lines:                       # 遍历 18 条竖线
        idx = np.where(np.abs(por[:, 0] - xx) < 2)[0]  # 该竖线附近（|dx|<2）的点
        sub = por[idx]
        ymin, ymax = sub[:, 1].min(), sub[:, 1].max()  # 竖线的 y 覆盖范围
        ys = np.linspace(ymin, ymax, ypart)            # 在范围内等距取 20 个 y
        for yy in ys:
            d = np.hypot(por[:, 0] - xx, por[:, 1] - yy)  # 全部点云到采样点 (xx, yy) 的距离
            loc = np.flatnonzero(d == d.min())            # 最近的原始数据点（并列取第一个，对齐 MATLAB）
            cols.append(por[loc[0], 2])                   # 记录该采样点的 POR 值
    POR_seq.append(cols)
POR_seq = np.array(POR_seq)  # (72, 360) 每行一个时刻
print("POR_seq", POR_seq.shape)

# .mat 为 v7.3 (HDF5) 格式 → 用 h5py 读取，与 MATLAB 存档逐元素对比
with h5py.File(f"{DATA}/data.mat") as h:
    ref = h["PORthisslope"][:]
print("mat PORthisslope shape:", ref.shape, "max|diff| =", np.abs(POR_seq - ref).max() if ref.shape == POR_seq.shape else "shape mismatch")

# ---------- 2) genSlopeMatrix 移植 ----------
from matplotlib.path import Path

def gen_slope_matrix(f_slope, f_por=None, xmin=-20, xmax=100, res=1):
    """移植 main.m::genSlopeMatrix：边坡几何/材料 + 孔压点云 → (4,120,120) 栅格张量。

    四个通道依次为：重度 rho、黏聚力 coh、内摩擦角 phi、孔压 por。
    材料三通道按域多边形 inpolygon 赋值（域外为 0）；por 通道每个格子取
    最近 4 个孔压点的均值（对齐 MATLAB 的 knnsearch k=4 写法）。

    Args:
        f_slope: 边坡几何/材料文本文件（第 1 行域多边形坐标，第 2 行层数，
                 第 3 行界面线，之后每层一行 rho,c,phi）。
        f_por: 该时刻的 odbPOR.txt 孔压点云文件；为 None 时 por 通道全 0。
        xmin/xmax/res: 栅格范围与分辨率（默认 x∈[-20,100]、1 m，得 120 列）。

    Returns:
        np.ndarray，形状 (4, 120, 120)。
    """
    # ---- 解析边坡几何/材料文件 ----
    lines = [l.strip() for l in open(f_slope) if l.strip()]
    rows = [[float(v) for v in l.split(",")] for l in lines]
    dom = np.array(rows[0])                  # 域多边形顶点坐标（交替 x,y）
    n_layers = int(rows[1][0])               # 土层数
    props = np.array([r + [0.0] * (3 - len(r)) for r in rows[3:3 + n_layers]])[:, :3]  # 每层 (rho, c, phi)，不足补 0
    # MATLAB 的写法对 slope2（两层同参数）等价于：全域同参数
    interface = np.array(rows[2])  # 0,0,100,0 界面线
    dom_pts = np.array([dom[0::2], dom[1::2]]).T   # (N,2) 多边形顶点
    # ---- 构造 120x120 网格（对齐 MATLAB ndgrid 的索引顺序）----
    xg = np.arange(np.floor(xmin + res / 2), np.floor(xmax + res / 2 - 1) + 1)  # -20..99
    yg = np.arange(np.floor(xmax + res / 2), np.floor(xmin + res / 2 + 1) - 1, -1)  # 100..-19
    XX, YY = np.meshgrid(xg, yg, indexing="ij")  # grid(i,j): i=x 索引, j=y 索引(从上到下)
    pts = np.column_stack([XX.ravel(), YY.ravel()])  # (14400, 2) 展平后的网格点坐标
    # ---- 域内判定 + 材料三通道赋值（域外为 0）----
    inside = Path(dom_pts).contains_points(pts).reshape(XX.shape)
    rho = np.where(inside, props[0, 0], 0.0)                     # 通道 0：重度
    coh = np.where(inside, 0.1 if props[0, 1] == 0 else props[0, 1], 0.0)  # 通道 1：黏聚力（c=0 时用 0.1 兜底，对齐 MATLAB）
    phi = np.where(inside, props[0, 2], 0.0)                     # 通道 2：内摩擦角
    # ---- por 通道：每格取最近 4 个孔压点的均值 ----
    por_grid = np.zeros_like(rho)
    if f_por is not None:
        por = np.loadtxt(f_por, delimiter=",")  # (N,3) 孔压点云
        # 每个网格点取最近 4 个 POR 点均值（对齐 MATLAB）
        # 120x120=14400 网格 x ~4700 点 → 用 KDTree
        from scipy.spatial import cKDTree
        tree = cKDTree(por[:, :2])             # 对点云坐标建 KD 树，加速最近邻查询
        _, idx = tree.query(pts, k=4)          # 每个网格点的 4 最近邻索引 (14400, 4)
        por_grid = por[idx, 2].mean(axis=1).reshape(XX.shape)  # 4 邻居 POR 均值 → 网格形状
    grid = np.stack([rho, coh, phi, por_grid])  # (4,120,120)
    return grid

# 用 t=1 时刻验证：栅格化结果与 MATLAB 存档 slopedata.mat::slope[0] 逐通道对比
g = gen_slope_matrix(f"{DATA}/slopefiles/slope2_1.txt", f"{DATA}/inp/slope2_1odbPOR.txt")
with h5py.File(f"{DATA}/slopedata.mat") as h:
    ref = h["slope"][0]  # (4,120,120)，t=1 用的是真值 odbPOR
print("grid shape", g.shape, "ref shape", ref.shape)
# 逐通道输出最大绝对差异（应为 0 或仅最近邻并列取值导致的个位数格子差异）
for c, name in enumerate(["rho", "coh", "phi", "por"]):
    print(name, "max|diff| =", np.abs(g[c] - ref[c]).max())
