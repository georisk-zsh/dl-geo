# 《人工智能算法与岩土工程应用案例》课程

## 环境准备

需要 **Python 3.12**，其余依赖见 [`requirements.txt`](requirements.txt)（文件头记录了各库的已验证版本）。

```bash
# 1. 创建并激活环境（conda 或 venv 任选其一）
conda create -n dl-env python=3.12 -y && conda activate dl-env
#   或：python3.12 -m venv .venv && source .venv/bin/activate

# 2. 安装依赖
pip install -r requirements.txt

# 3. 注册 Jupyter 内核（Notebook 里选 "Python [dl-env]"）
python -m ipykernel install --user --name dl-env --display-name "Python [dl-env]"
```

> ⚙️ **torch 的算力后端**：`requirements.txt` 装的是 CPU 版。要用 GPU（CUDA）或 Apple MPS，请按官方命令单独安装 torch，例如 Apple 芯片：
> ```bash
> pip install torch --index-url https://download.pytorch.org/whl/cpu   # CPU
> # 或参考 https://pytorch.org/get-started/locally/ 选择 CUDA / MPS 版本
> ```

> 📄 **不需要 Python 环境的部分**：[SQL学习/](SQL学习/) 是纯 SQL + Shell 教程，只需一个可用的 PostgreSQL 实例（见 [第 2 章](SQL学习/第02章_安装与服务管理.md)）。

## 运行

```bash
conda activate dl-env
jupyter lab
```

打开各算法文件夹中的 Notebook，内核选择 **Python [dl-env]**。

## 目录结构

```
DL-Geo/
├── LSTM/             # 算法① 单点时序预测
├── GCN/              # 算法② 多点监测网时空预测
├── CNN-Transformer/  # 算法③ 单点时序预测·CNN+Transformer 混合架构
├── XGBoost+SHAP/     # 算法④ 单点位移预测·表格式强基线与可解释归因
├── ARIMA-Kalman/     # ARIMA + Kalman 滤波的经典时序基线对照
├── work001/          # 论文复现：LSTM + 插值 + CNN 的降雨边坡稳定性预测
├── demo001/          # 上述论文的原始 MATLAB 代码与数据（第三方，Apache-2.0）
├── SQL学习/          # 独立教程：《PostgreSQL 从零开始》
├── InSAR_GNSS_融合方案.md   # 边坡监测多源融合的分层架构设计
├── remote_dl.sh      # SSH 远程训练辅助脚本
└── requirements.txt
```

## 姊妹教程：《PostgreSQL 从零开始》

[SQL学习/](SQL学习/) 是一份面向**完全零基础读者**的独立 PostgreSQL 中文教程（17 章正文 + 4 篇附录）：

- **正文**：数据库概念 → Linux 上安装部署 → psql/pgAdmin/dbx → 建库建表 → 增删改查 → JOIN/聚合/窗口函数 → 事务 → 索引优化 → 备份恢复 → 权限安全 → 综合项目
- **附录**：[术语表](SQL学习/附录A_术语表.md)、[错误信息速查](SQL学习/附录B_错误信息速查.md)（报错字典）、[SQL 速查表](SQL学习/附录C_SQL速查表.md)、[自测与面试题](SQL学习/附录D_自测与面试题.md)
- **可实操**：附带一键建库/示例数据/重置脚本，以及 9 个"题目 + 参考答案"分段的练习文件；所有 SQL 均在真实 PostgreSQL 实例上验证通过

👉 入口：[SQL学习/README.md](SQL学习/README.md)

## 已完成算法

| # | 位置 | 场景 | 内容 |
|---|---|---|---|
| ① | [LSTM/](LSTM/) | 单点位移预测 | NumPy 从零实现 + 梯度检查、PyTorch 实战（LSTM/GRU/BiLSTM）、速率目标 + 累积重构两级评估、累积位移三种处理对比（反例）、精度检验（RMSE/MAE/MAPE/R²/NSE + 多步递归）、调参（随机搜索/Optuna）、改进（物理软约束、MC Dropout、集成） |
| ② | [GCN/](GCN/) | 多点监测网时空预测 | KNN 建图 + 对称归一化、NumPy 从零 GCN + 梯度检查 + PyG 官方对齐、ST-GCN（GCN×GRU）、消融实验（无图/无时序）、手写 GAT 注意力、图平滑物理正则（变形场空间连续先验）、逐节点误差空间分布、MC Dropout 全网区间 |
| ③ | [CNN-Transformer/](CNN-Transformer/) | 单点位移预测·混合架构 | **CNN 前置提局部模式 + Transformer 抓长依赖**：因果 Conv1D 与自注意力 NumPy 从零实现 + 梯度检查 + PyTorch 官方对齐、正弦位置编码、pre-LN 编码器、SEQ_LEN 窗口敏感性、消融实验（无 CNN/无注意力）、注意力-滞后曲线对照渗流滞后核、卷积响应核物理先验（非负 + 指数滞后衰减软约束）、MC Dropout 区间 |
| ④ | [XGBoost+SHAP/](XGBoost+SHAP/) | 单点位移预测·表格式强基线与归因 | **24 个全因果特征 + GBDT + TreeSHAP 精确归因**：五特征族工程（自回归/水平/降雨/库水位/季节）、NumPy 从零 GBDT（二阶泰勒目标 + 精确贪心 CART + 增益公式暴力验证 + 官方对齐）、基线对比（persistence/线性/岭/从零）、随机搜索调参 + val 早停、速率+累积两级口径与递归多步、特征族消融、物理单调约束（`monotone_constraints`，强降雨外推保险）、SHAP 归因全套（加和一致性检查、bar/beeswarm、依赖图、加速日瀑布图、加速期驱动因子 Top-5 报告）、分位数回归初探（衔接⑤） |

三本 Notebook 共用同一套工程标准：**防泄漏数据流水线（训练段 fit / 按目标时刻划分）、速率目标 + 累积重构两级口径、早停回滚 + 梯度裁剪、随机搜索调参、消融实验、物理融合软约束模板、不确定性量化**（④ 为树模型对应版本：无标准化、公式暴力验证、单调约束、SHAP 加和检查）。

## 接入真实数据（每个 Notebook 的 §2.2 + §10.2 Checklist）

1. 监测 CSV 放入对应算法文件夹（LSTM：单点长表；GCN：多测点长表 + 测点坐标表）；
2. 修改 Notebook §2.2 配置区（`DATA_PATH / FEATURE_COLS / TARGET_COL`）；位移类目标先差分出速率列；
3. 按各 Notebook §10.2 Checklist：跑基线 → 看损失曲线 → 调参 → 改进路线。

## 远程服务器训练（`remote_dl.sh`）

项目根目录的 `remote_dl.sh` 用于把训练任务放到 SSH 远程服务器（GPU 机器）上跑。**每次使用前先打开脚本，在顶部【手动配置区】填写服务器信息**（首次必填 4 项：`SSH_HOST / SSH_USER / REMOTE_CONDA_ENV / REMOTE_PROJECT_DIR`）；脚本每次运行都会先校验配置（缺项会提示改哪一行）并展示配置摘要，人工确认后才会连接服务器。

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

## 后续算法（待加）

- ⑤ 分位数 / Conformal 风险区间（超越概率 → 风险矩阵）
- ⑥ PINN：太沙基固结正问题 → 参数反演
- ⑦ 神经算子（FNO/DeepONet）替代 FEM 代理
- ⑧ 时间序列基础模型（Chronos/TimesFM）zero-shot 对比
