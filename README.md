# 《人工智能算法与岩土工程应用案例》

> 研究生课程 · 从零实现 → 精度检验 → 调参 → 物理融合改进 → 不确定性量化，全流程可复现

![课程](https://img.shields.io/badge/%E8%AF%BE%E7%A8%8B-%E7%A0%94%E7%A9%B6%E7%94%9F-blueviolet)
![算法案例](https://img.shields.io/badge/%E7%AE%97%E6%B3%95%E6%A1%88%E4%BE%8B-4%20%E5%B7%B2%E5%AE%8C%E6%88%90%20%C2%B7%204%20%E8%A7%84%E5%88%92-orange)
![教材](https://img.shields.io/badge/%E6%95%99%E6%9D%90-PPT%20%2B%20Notebook%20%2B%20%E6%95%99%E7%A8%8B-brightgreen)
![Python](https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white)
![PyTorch](https://img.shields.io/badge/PyTorch-2.9-EE4C2C?logo=pytorch&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

---

## 📖 课程简介

本课程以**岩土工程安全监测**为应用背景（边坡/库岸边坡的位移与稳定性预测），系统讲授人工智能算法的**原理、实现与工程化改进**。每讲围绕一个真实问题展开，不调用现成的高层封装，而是**先手写核心算法、验证梯度、再与官方实现对齐**，最后落到物理机理约束与不确定性量化。

课程材料全部开源，**每个算法案例都配有「算法介绍 PPT（原理）」+「实现与调参 Notebook（代码）」**，Notebook 均已完整执行、输出随仓库提供，可直接复现。

### 学完本课程，你将能够

- 独立**从零实现** LSTM / GCN / 注意力 / 梯度提升树等算法的核心计算，并用梯度检查验证正确性；
- 用**官方实现对齐**的方式定位自己代码的偏差，而不是靠猜；
- 搭建**防数据泄漏**的训练流水线，正确使用「速率目标 + 累积重构」两级评估口径；
- 完成精度检验（RMSE/MAE/MAPE/R²/NSE + 多步递归）、随机搜索调参、消融实验的**完整科研流程**；
- 把**物理机理**（渗流滞后、变形场空间连续、降雨单调响应）写成软约束/正则项融入模型；
- 给出**带区间**的预测（MC Dropout / 分位数回归），支撑超越概率与风险评价。

### 课程特色

| | |
|---|---|
| **双轨实现** | 每个算法均提供 NumPy 从零实现（含梯度检查）与 PyTorch/PyG/官方库实战，两条路线互为验证 |
| **对齐式调试** | 统一使用「自己实现 vs 官方实现逐项对齐」的工程方法，把黑盒变成白盒 |
| **物理融合** | 不只调参：把渗流滞后核、空间连续性、单调性等先验写进损失函数或模型约束 |
| **科研规范** | 防泄漏划分、早停回滚、消融实验、不确定性量化、结果如实报告（含不支持的结论） |
| **配套教材** | 4 份算法讲解 PPT + 5 本已执行 Notebook + 一份 17 章 PostgreSQL 配套教程 |

---

## 🧭 课程内容一览

四个已完成的算法案例，每个都含**算法介绍 PPT** 与**实现与调参 Notebook**：

| # | 案例 | 应用场景 | 教学材料 | 核心内容 |
|---|---|---|---|---|
| ① | **LSTM** | 单点位移预测 | [PPT](LSTM/01_LSTM_位移预测_算法介绍.pptx) · [Notebook](LSTM/01_LSTM_位移预测_实现与调参.ipynb) | NumPy 从零实现 + 梯度检查、PyTorch 实战（LSTM/GRU/BiLSTM）、速率目标 + 累积重构两级评估、累积位移三种处理对比（反例）、精度检验（RMSE/MAE/MAPE/R²/NSE + 多步递归）、调参（随机搜索/Optuna）、改进（物理软约束、MC Dropout、集成） |
| ② | **GCN** | 多点监测网时空预测 | [PPT](GCN/02_GCN_多点监测网时空预测_算法介绍.pptx) · [Notebook](GCN/02_GCN_多点监测网时空预测_实现与调参.ipynb) | KNN 建图 + 对称归一化、NumPy 从零 GCN + 梯度检查 + PyG 官方对齐、ST-GCN（GCN×GRU）、消融实验（无图/无时序）、手写 GAT 注意力、图平滑物理正则（变形场空间连续先验）、逐节点误差空间分布、MC Dropout 全网区间 |
| ③ | **CNN-Transformer** | 单点位移预测·混合架构 | [PPT](CNN-Transformer/03_CNN_Transformer_位移预测_算法介绍.pptx) · [Notebook](CNN-Transformer/03_CNN_Transformer_位移预测_实现与调参.ipynb) | **CNN 前置提局部模式 + Transformer 抓长依赖**：因果 Conv1D 与自注意力 NumPy 从零实现 + 梯度检查 + PyTorch 官方对齐、正弦位置编码、pre-LN 编码器、SEQ_LEN 窗口敏感性、消融实验（无 CNN/无注意力）、注意力-滞后曲线对照渗流滞后核、卷积响应核物理先验（非负 + 指数滞后衰减软约束）、MC Dropout 区间 |
| ④ | **XGBoost + SHAP** | 单点位移预测·表格式强基线与归因 | [PPT](XGBoost+SHAP/04_XGBoost_SHAP_位移预测与归因_算法介绍.pptx) · [Notebook](XGBoost+SHAP/04_XGBoost_SHAP_位移预测与归因_实现与调参.ipynb) | **24 个全因果特征 + GBDT + TreeSHAP 精确归因**：五特征族工程（自回归/水平/降雨/库水位/季节）、NumPy 从零 GBDT（二阶泰勒目标 + 精确贪心 CART + 增益公式暴力验证 + 官方对齐）、基线对比（persistence/线性/岭/从零）、随机搜索调参 + val 早停、速率+累积两级口径与递归多步、特征族消融、物理单调约束（`monotone_constraints`，强降雨外推保险）、SHAP 归因全套（加和一致性检查、bar/beeswarm、依赖图、加速日瀑布图、加速期驱动因子 Top-5 报告）、分位数回归初探（衔接⑤） |

> 📐 **统一的工程标准**（所有 Notebook 共用）：防泄漏数据流水线（训练段 fit / 按目标时刻划分）、速率目标 + 累积重构两级口径、早停回滚 + 梯度裁剪、随机搜索调参、消融实验、物理融合软约束模板、不确定性量化（④ 为树模型对应版本：无标准化、公式暴力验证、单调约束、SHAP 加和检查）。
>
> 📊 各案例的完整指标见对应文件夹内的 `*_results_summary.csv`（示例数据下的结果，供实现正确性对照；不同案例的预测目标与量纲不同，**指标之间不可横向比较**）。

---

## 🖼 效果速览

## 🖼 效果速览

| 论文复现：端到端 FS 预测（[work001](work001/)） | ARIMA + Kalman 基线对照（[ARIMA-Kalman](ARIMA-Kalman/)） |
|---|---|
| ![端到端 FS 预测](work001/figs/05_e2e_fs.png) | ![测试集总览](ARIMA-Kalman/fig1_test_overview.png) |
| LSTM 预测孔压 → 插值成全边坡孔压场 → CNN 回归安全系数 FS | SARIMAX 拟合 + Kalman 滤波偏差跟踪 + 强弱基线对照 |
| ![孔压预测](work001/figs/02_lstm_por.png) | ![偏差跟踪](ARIMA-Kalman/fig3_bias_tracking.png) |
| LSTM 对 360 个采样点孔压（POR）的时序预测 | 卡尔曼滤波对系统性偏差的实时跟踪 |

---

## 🚀 快速开始

### 1. 环境准备

需要 **Python 3.12**，其余依赖见 [`requirements.txt`](requirements.txt)（文件头记录了各库的已验证版本）。

```bash
# 创建并激活环境（conda 或 venv 任选其一）
conda create -n dl-env python=3.12 -y && conda activate dl-env
#   或：python3.12 -m venv .venv && source .venv/bin/activate

# 安装依赖
pip install -r requirements.txt

# 注册 Jupyter 内核（Notebook 里选 "Python [dl-env]"）
python -m ipykernel install --user --name dl-env --display-name "Python [dl-env]"
```

> ⚙️ **torch 的算力后端**：`requirements.txt` 装的是 CPU 版。要用 GPU（CUDA）或 Apple MPS，请按官方命令单独安装，参考 <https://pytorch.org/get-started/locally/>。

### 2. 运行

```bash
conda activate dl-env
jupyter lab
```

打开任一算法文件夹中的 Notebook，内核选择 **Python [dl-env]**，从头执行即可。

### 3. 接入真实监测数据

每个 Notebook 的 §2.2 是配置区、§10.2 是 Checklist：

1. 监测 CSV 放入对应算法文件夹（LSTM：单点长表；GCN：多测点长表 + 测点坐标表）；
2. 修改 Notebook §2.2 配置区（`DATA_PATH / FEATURE_COLS / TARGET_COL`）；位移类目标先差分出速率列；
3. 按 §10.2 Checklist 走：跑基线 → 看损失曲线 → 调参 → 改进路线。

---

## 📂 目录结构

```text
DL-Geo/
├── LSTM/                        # 案例① 单点时序预测（PPT + Notebook）
├── GCN/                         # 案例② 多点监测网时空预测
├── CNN-Transformer/             # 案例③ 单点时序预测·CNN+Transformer 混合架构
├── XGBoost+SHAP/                # 案例④ 表格式强基线与可解释归因（含数据说明.md）
├── ARIMA-Kalman/                # 经典时序基线对照：ARIMA + Kalman 滤波
├── work001/                     # 论文复现：LSTM + 插值 + CNN 的降雨边坡稳定性预测
├── demo001/                     # 上述论文的原始 MATLAB 代码与数据（第三方，Apache-2.0）
├── SQL学习/                     # 配套教程：《PostgreSQL 从零开始》17 章 + 4 附录
├── InSAR_GNSS_融合方案.md       # 边坡监测多源融合的分层架构设计（L0–L4）
├── remote_dl.sh                 # SSH 远程训练辅助脚本
└── requirements.txt
```

---

## 📚 配套资源

### 论文复现：LSTM + 插值 + CNN 的降雨边坡稳定性预测

[work001/](work001/) 完整复现 Lin et al. (2025) *Natural Hazards* 论文（DOI [10.1007/s11069-025-07703-4](https://doi.org/10.1007/s11069-025-07703-4)）：

**LSTM 预测孔压时序 → natural-neighbor 插值成全边坡孔压场 → 与重度/黏聚力/内摩擦角栅格化为 120×120×4 四通道图像 → CNN 回归该时刻安全系数 FS**

复现过程如实报告了与论文数字的差距及原因（单边坡 vs 论文 9 边坡训练集），详见 [work001/README.md](work001/README.md)。

### 经典时序基线：ARIMA + Kalman

[ARIMA-Kalman/](ARIMA-Kalman/) 提供 SARIMAX 拟合、Kalman 滤波偏差跟踪、强弱基线对照与真实指标计算，并附[文章连载](ARIMA-Kalman/article_continuation.md)。

### 多源融合方案设计

[InSAR_GNSS_融合方案.md](InSAR_GNSS_融合方案.md)：把 InSAR 的面域覆盖与 GNSS 的高频精准点接到现有算法体系上的 **L0–L4 五层架构**（含算法①–⑧的落位与优先级），可作为研究生课题选题参考。

### 配套教程：《PostgreSQL 从零开始》

[SQL学习/](SQL学习/) 是一份面向**完全零基础读者**的独立 PostgreSQL 中文教程（17 章正文 + 4 篇附录），用于支撑监测数据的**建库、入库、查询与运维**：

- **正文**：数据库概念 → Linux 上安装部署 → psql/pgAdmin/dbx → 建库建表 → 增删改查 → JOIN/聚合/窗口函数 → 事务 → 索引优化 → 备份恢复 → 权限安全 → 综合项目
- **附录**：[术语表](SQL学习/附录A_术语表.md)、[错误信息速查](SQL学习/附录B_错误信息速查.md)（报错字典）、[SQL 速查表](SQL学习/附录C_SQL速查表.md)、[自测与面试题](SQL学习/附录D_自测与面试题.md)
- **可实操**：附带一键建库/示例数据/重置脚本，以及 9 个「题目 + 参考答案」分段的练习文件；所有 SQL 均在真实 PostgreSQL 实例上验证通过

> 📄 该教程**不需要任何 Python 依赖**，只需一个可用的 PostgreSQL 实例（见 [第 2 章](SQL学习/第02章_安装与服务管理.md)）。

👉 教程入口：[SQL学习/README.md](SQL学习/README.md)

---

## 🖥 远程服务器训练（`remote_dl.sh`）

用于把训练任务放到 SSH 远程服务器（GPU 机器）上跑。**每次使用前先打开脚本，在顶部【手动配置区】填写服务器信息**（首次必填 4 项：`SSH_HOST / SSH_USER / REMOTE_CONDA_ENV / REMOTE_PROJECT_DIR`）；脚本每次运行都会先校验配置（缺项会提示改哪一行）并展示配置摘要，人工确认后才会连接服务器。

```bash
./remote_dl.sh check   # 连接测试：主机/GPU/conda 环境信息
./remote_dl.sh train   # 同步项目到远程 + 后台启动训练（REMOTE_TRAIN_CMD 填训练命令，如
                       #   "jupyter nbconvert --to notebook --execute --inplace LSTM/01_xxx.ipynb"）
./remote_dl.sh log     # 实时查看训练日志（Ctrl-C 退出不影响训练）
./remote_dl.sh stop    # 停止远程训练
./remote_dl.sh pull    # 拉取日志/模型/结果到本地 remote_results/<时间戳>/
./remote_dl.sh push    # 仅同步项目到远程
```

建议配置 SSH 免密登录（否则每条命令都会要求输密码）：`ssh-copy-id -p <端口> <用户名>@<服务器>`。rsync 默认排除 `.git / __pycache__ / .ipynb_checkpoints / remote_results`，可在脚本顶部 `RSYNC_EXCLUDES` 调整。

---

## 🔭 后续算法（研究生课题延伸）

- **⑤ 分位数 / Conformal 风险区间**——超越概率 → 风险矩阵
- **⑥ PINN**——太沙基固结正问题 → 参数反演
- **⑦ 神经算子（FNO / DeepONet）**——替代 FEM 代理
- **⑧ 时间序列基础模型（Chronos / TimesFM）**——zero-shot 对比

> 选题建议：②的图结构、③的注意力与滞后核、④的单调约束都可直接迁移到 ⑤–⑧ 的改进点；[InSAR_GNSS_融合方案.md](InSAR_GNSS_融合方案.md) 给出了多源融合场景下的完整落位。

---

## ⚖️ 引用、致谢与版权

- **论文复现部分**（[work001/](work001/)）复现自 Lin M., Lu Y., Li Y., Chen G., Yuan B. (2025). *Time series prediction of the slope stability under rainfall conditions based on LSTM and CNN.* **Natural Hazards**, 121:22487–22517。原始 MATLAB 代码与数据位于 [demo001/](demo001/)（上游仓库 [linmmsbaby](https://github.com/linmmsbaby/Time-series-prediction-of-the-slope-stability-under-rainfall-conditions-based-on-LSTM-and-CNN)，Apache-2.0）。**使用请引用原文。**
- `demo001/` 中的**论文 PDF 未包含在本仓库**：该 PDF 是 Springer 出版社的正式排版版（Version of Record），版权归出版社所有，不在上游仓库的 Apache-2.0 授权范围内。需要原文请通过上述 DOI 在期刊页面获取。
- 其余算法实现、Notebook、PPT 与教程均为本课程原创。

## 📄 许可证

本项目采用 **[MIT License](LICENSE)**（Copyright © 2026 OpenGeoriskLab）。可自由使用、修改、分发，请保留版权声明。

---

<p align="center">
  <b>《人工智能算法与岩土工程应用案例》课程</b><br>
  从零实现 · 对齐验证 · 物理融合 · 不确定性量化
</p>
