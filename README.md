<h1 align="center">《人工智能算法与岩土工程应用案例》</h1>
<h3 align="center">AI Algorithms for Geotechnical Engineering: Case Studies</h3>

<p align="center">
  <img alt="Course" src="https://img.shields.io/badge/Course-Graduate-blueviolet">
  <img alt="Cases" src="https://img.shields.io/badge/Cases-4%20released%20%C2%B7%204%20planned-orange">
  <a href="SQL学习/README.md"><img alt="Materials" src="https://img.shields.io/badge/Materials-PPT%20%C2%B7%20Notebook%20%C2%B7%20Tutorial-brightgreen"></a>
  <a href="requirements.txt"><img alt="Python" src="https://img.shields.io/badge/Python-3.12-3776AB?logo=python&amp;logoColor=white"></a>
  <a href="requirements.txt"><img alt="PyTorch" src="https://img.shields.io/badge/PyTorch-2.9-EE4C2C?logo=pytorch&amp;logoColor=white"></a>
  <a href="LICENSE"><img alt="License" src="https://img.shields.io/badge/License-MIT-green"></a>
</p>

**关键词**：边坡稳定性 · 位移预测 · 深度学习 · 图神经网络 · 物理信息约束 · 可解释归因 · 不确定性量化

---

## 目录

- [课程简介](#课程简介)
- [课程内容](#课程内容)
- [案例一 LSTM 单点位移时序预测](#案例一-lstm-单点位移时序预测)
- [案例二 GCN 多点监测网时空预测](#案例二-gcn-多点监测网时空预测)
- [案例三 CNN-Transformer 混合架构](#案例三-cnn-transformer-混合架构)
- [案例四 XGBoost 与 SHAP 可解释归因](#案例四-xgboost-与-shap-可解释归因)
- [拓展案例与配套教程](#拓展案例与配套教程)
- [环境与运行](#环境与运行)
- [许可证](#许可证)
- [联系方式](#联系方式)

---

## 课程简介

本课程面向研究生，以**岩土工程安全监测**为应用场景（边坡与库岸边坡的位移、稳定性预测），讲解人工智能算法的**原理、实现与改进**。

课程不满足于"调用现成的库函数跑一个模型"：每个算法都先**手写核心计算**、用梯度检查验证正确性，再与官方实现**逐项对齐**，最后结合物理机理做改进，并给出带区间的预测结果。

**这门课讲什么**

| | |
|---|---|
| **4 个算法案例** | LSTM / GCN / CNN-Transformer / XGBoost+SHAP，每个含一份**原理 PPT** + 一本**可执行 Notebook** |
| **1 条完整方法链** | 从零实现 → 精度检验 → 调参 → 物理融合改进 → 不确定性量化 |
| **3 个拓展案例** | 论文复现、经典时序基线对照、多源融合方案设计 |
| **1 份配套教程** | PostgreSQL 从零开始（监测数据的建库、查询与运维） |

**适合谁**：有 Python 与机器学习基础、希望把算法真正落到岩土工程问题上的研究生与工程技术人员。

**学完能做什么**

- 独立从零实现 LSTM / 图卷积 / 注意力 / 梯度提升树的核心计算，并用梯度检查验证；
- 用"与官方实现对齐"的方法定位自己代码的偏差，而不是靠猜；
- 搭建防数据泄漏的训练流水线，正确使用"速率目标 + 累积重构"两级评估口径；
- 完成精度检验、随机搜索调参、消融实验的完整流程；
- 把物理机理（渗流滞后、变形场空间连续、降雨单调响应）写成软约束融入模型；
- 给出带不确定性区间的预测，支撑风险评价。

**课程特色**

| 特色 | 说明 |
|---|---|
| **双轨实现** | 每个算法都有 NumPy 从零实现（含梯度检查）+ 官方库实战，两条路线互为验证 |
| **对齐式调试** | 统一采用"自己实现 vs 官方实现逐项对齐"的方法，把黑盒变成白盒 |
| **物理融合** | 不只调参：把渗流滞后核、空间连续性、单调性等先验写进损失函数或模型约束 |
| **材料齐全** | 原理 PPT + 已执行 Notebook + 结果 CSV，开箱可复现 |

---

## 课程内容

| 案例 | 算法 | 应用场景 | 教学材料 |
|---|---|---|---|
| ① | **LSTM** | 单点位移预测 | [原理 PPT](LSTM/01_LSTM_位移预测_算法介绍.pptx) · [Notebook](LSTM/01_LSTM_位移预测_实现与调参.ipynb) |
| ② | **GCN** | 多点监测网时空预测 | [原理 PPT](GCN/02_GCN_多点监测网时空预测_算法介绍.pptx) · [Notebook](GCN/02_GCN_多点监测网时空预测_实现与调参.ipynb) |
| ③ | **CNN-Transformer** | 单点位移预测（混合架构） | [原理 PPT](CNN-Transformer/03_CNN_Transformer_位移预测_算法介绍.pptx) · [Notebook](CNN-Transformer/03_CNN_Transformer_位移预测_实现与调参.ipynb) |
| ④ | **XGBoost + SHAP** | 单点位移预测与归因 | [原理 PPT](XGBoost+SHAP/04_XGBoost_SHAP_位移预测与归因_算法介绍.pptx) · [Notebook](XGBoost+SHAP/04_XGBoost_SHAP_位移预测与归因_实现与调参.ipynb) |
| ⑤ | 分位数 / Conformal 风险区间 | 规划中 | 超越概率 → 风险矩阵 |
| ⑥ | PINN | 规划中 | 太沙基固结正问题 → 参数反演 |
| ⑦ | 神经算子（FNO / DeepONet） | 规划中 | 替代 FEM 代理模型 |
| ⑧ | 时序基础模型（Chronos / TimesFM） | 规划中 | zero-shot 能力边界对比 |

> 📐 **统一的工程规范**（所有 Notebook 共用）：防泄漏数据流水线（训练段 fit / 按目标时刻划分）、速率目标 + 累积重构两级口径、早停回滚 + 梯度裁剪、随机搜索调参、消融实验、物理融合软约束模板、不确定性量化。

---

## 案例一 LSTM 单点位移时序预测

📂 [LSTM/](LSTM/)　·　📊 [原理 PPT](LSTM/01_LSTM_位移预测_算法介绍.pptx)　·　💻 [实现与调参 Notebook](LSTM/01_LSTM_位移预测_实现与调参.ipynb)

**算法简介**　LSTM（长短期记忆网络）是一种循环神经网络。它通过"门控"机制决定**记住什么、忘记什么**，从而在处理有先后顺序的数据时保留长期信息——正好对应"历史位移影响未来位移"的时序预测需求。

**本案例做什么**　预测边坡**单个监测点**（GNSS 位移）未来一段时间的位移速率。

**案例要点**

- **从零实现**：NumPy 手写 LSTM 的四个门与反向传播，用梯度检查确认无误，再与 PyTorch 官方实现对齐；
- **精度检验**：RMSE / MAE / MAPE / R² / NSE + 多步递归预测；
- **评估口径**：速率目标 + 累积重构两级口径；并给出"累积位移三种处理方式"的对比（含反例）；
- **调参**：随机搜索与 Optuna 贝叶斯优化；
- **改进**：物理软约束、MC Dropout 不确定性区间、模型集成；
- **模型族对比**：LSTM / GRU / BiLSTM。

---

## 案例二 GCN 多点监测网时空预测

📂 [GCN/](GCN/)　·　📊 [原理 PPT](GCN/02_GCN_多点监测网时空预测_算法介绍.pptx)　·　💻 [实现与调参 Notebook](GCN/02_GCN_多点监测网时空预测_实现与调参.ipynb)

**算法简介**　GCN（图卷积网络）把监测点当作图的节点、把测点之间的空间关系当作边。每个节点的新特征由**它自己和邻居节点**的信息聚合而来，因此能利用"相邻测点变形相似"这一空间规律。

**本案例做什么**　对**整个监测网**的多个测点做时空预测（空间用图卷积、时间用循环网络）。

**案例要点**

- **建图**：KNN 建图 + 对称归一化（由测点坐标生成邻接矩阵）；
- **从零实现**：NumPy 手写图卷积 + 梯度检查，并与 PyG（PyTorch Geometric）官方实现对齐；
- **时空模型**：ST-GCN（GCN × GRU）；
- **消融实验**：去掉图结构、去掉时序，看各自贡献；
- **注意力**：手写 GAT 注意力机制；
- **物理正则**：图平滑正则项（变形场空间连续先验）；
- **结果分析**：逐节点误差的空间分布、全网 MC Dropout 区间。

---

## 案例三 CNN-Transformer 混合架构

📂 [CNN-Transformer/](CNN-Transformer/)　·　📊 [原理 PPT](CNN-Transformer/03_CNN_Transformer_位移预测_算法介绍.pptx)　·　💻 [实现与调参 Notebook](CNN-Transformer/03_CNN_Transformer_位移预测_实现与调参.ipynb)

**算法简介**　本案例把两种机制组合起来分工协作：**CNN（因果一维卷积）是"局部模式扫描仪"**，只看相邻几天，擅长捕捉周期性波动与短期响应；**Transformer（自注意力）是"全局观察者"**，让任意两个时间步直接相连，擅长建模长距离依赖。相比纯循环网络，它既能并行计算，又能显式给出时间步之间的关联强度。

**本案例做什么**　与案例①相同的单点位移预测任务，换用更强的混合架构。

**案例要点**

- **从零实现**：NumPy 手写因果 Conv1D 与自注意力，梯度检查 + 与 PyTorch 官方实现对齐；
- **位置编码**：正弦位置编码，把"先后顺序"注入注意力；
- **结构细节**：pre-LN 编码器、窗口长度（SEQ_LEN）敏感性分析；
- **消融实验**：去掉 CNN、去掉注意力，对比各自贡献；
- **可解释性**：注意力-滞后曲线对照渗流滞后核；
- **物理先验**：卷积响应核的软约束（非负 + 指数滞后衰减）；
- **不确定性**：MC Dropout 预测区间。

---

## 案例四 XGBoost 与 SHAP 可解释归因

📂 [XGBoost+SHAP/](XGBoost+SHAP/)　·　📊 [原理 PPT](XGBoost+SHAP/04_XGBoost_SHAP_位移预测与归因_算法介绍.pptx)　·　💻 [实现与调参 Notebook](XGBoost+SHAP/04_XGBoost_SHAP_位移预测与归因_实现与调参.ipynb)　·　📄 [数据说明](XGBoost+SHAP/数据说明.md)

**算法简介**　**XGBoost** 是梯度提升树（GBDT）的代表实现，把许多棵浅决策树逐棵累加，每棵新树专门拟合前面所有树的残差，因此在表格型数据上往往最强。**SHAP** 则解决"模型为什么这么预测"：它把一次预测的贡献**公平地分摊到每个特征**上（基于博弈论的 Shapley 值），对树模型有精确的多项式算法（TreeSHAP）。

**本案例做什么**　用 24 个全因果特征预测单点位移，并对预测结果做**逐样本归因**——例如找出某次加速变形的主导驱动因子。

**案例要点**

- **特征工程**：五个特征族（自回归 / 位移水平 / 降雨 / 库水位 / 季节），全部因果构造，避免未来信息泄漏；
- **从零实现**：NumPy 手写 GBDT（二阶泰勒目标 + 精确贪心 CART），用增益公式暴力验证，再与官方实现对齐；
- **基线对比**：persistence（明日=今日）、线性回归、岭回归、从零 GBM；
- **调参**：随机搜索 + 验证集早停；
- **物理约束**：单调性约束（强降雨方向的外推保险）；
- **SHAP 归因**：加和一致性检查、特征重要性 bar/beeswarm、依赖图、加速日瀑布图、驱动因子 Top-5 报告；
- **扩展**：分位数回归初探（衔接案例⑤的区间预测）。

---

## 拓展案例与配套教程

| 资源 | 内容 |
|---|---|
| [**work001/**](work001/)　论文复现 | 完整复现 Lin et al. (2025) *Natural Hazards* 的 **LSTM + 插值 + CNN** 降雨边坡稳定性预测流程：LSTM 预测孔压 → 插值成全边坡孔压场 → 栅格化为四通道图像 → CNN 回归安全系数 FS |
| [**ARIMA-Kalman/**](ARIMA-Kalman/)　经典基线 | 与深度学习对照的经典时序方法：SARIMAX 拟合 + Kalman 滤波偏差跟踪 + 强弱基线对照，附[文章连载](ARIMA-Kalman/article_continuation.md) |
| [**InSAR_GNSS_融合方案.md**](InSAR_GNSS_融合方案.md)　方案设计 | 把 InSAR 面域覆盖与 GNSS 高频点观测接入算法体系的 **L0–L4 五层架构**，含算法①–⑧的落位，可作为课程设计或选题参考 |
| [**SQL学习/**](SQL学习/)　配套教程 | 《PostgreSQL 从零开始》：17 章正文 + 4 篇[附录](SQL学习/README.md)（术语表 / 错误信息速查 / SQL 速查表 / 自测与面试题）+ 一键建库脚本与 9 份练习，用于监测数据的建库与查询 |

**案例效果示例**

| 论文复现：安全系数预测（[work001](work001/)） | LSTM 孔压时序预测（[work001](work001/)） |
|---|---|
| ![端到端 FS 预测](work001/figs/05_e2e_fs.png) | ![孔压预测](work001/figs/02_lstm_por.png) |

---

## 环境与运行

需要 **Python 3.12**；依赖见 [`requirements.txt`](requirements.txt)（文件头记录了各库的已验证版本）。

```bash
# 1. 创建并激活环境（conda 或 venv 任选其一）
conda create -n dl-env python=3.12 -y && conda activate dl-env
#   或：python3.12 -m venv .venv && source .venv/bin/activate

# 2. 安装依赖
pip install -r requirements.txt

# 3. 注册 Jupyter 内核（Notebook 里选 "Python [dl-env]"）
python -m ipykernel install --user --name dl-env --display-name "Python [dl-env]"

# 4. 打开 Notebook
jupyter lab
```

> ⚙️ `requirements.txt` 安装的是 CPU 版 torch。需要 GPU（CUDA）或 Apple MPS 时，请按官方命令单独安装，参考 <https://pytorch.org/get-started/locally/>。
>
> 🖥 需要把训练放到远程 GPU 服务器上跑时，用仓库根目录的 [`remote_dl.sh`](remote_dl.sh)：先在脚本顶部【手动配置区】填好服务器信息，支持 `check` / `push` / `train` / `log` / `stop` / `pull` 六个子命令。
>
> 📄 [SQL学习/](SQL学习/) 是纯 SQL + Shell 教程，**不需要 Python 环境**，只需一个可用的 PostgreSQL 实例。

---

## 许可证

本项目采用 **[MIT License](LICENSE)**（Copyright © 2026 OpenGeoriskLab）。可自由使用、修改、分发，请保留版权声明。

> 第三方材料说明：[`demo001/`](demo001/) 为论文原始 MATLAB 代码与数据，遵循其自身的 Apache-2.0 许可；其中的**论文 PDF 未随本仓库分发**（该 PDF 为出版社正式排版版，版权归出版社所有），请通过 [DOI](https://doi.org/10.1007/s11069-025-07703-4) 在期刊页面获取。

## 联系方式

- 维护：OpenGeoriskLab（<zhousuhua@foxmail.com>）
- 问题与建议：欢迎提交 [Issue](https://github.com/georisk-zsh/dl-geo/issues) 或 Pull Request

---

<p align="center">
  <b>《人工智能算法与岩土工程应用案例》</b>
</p>
