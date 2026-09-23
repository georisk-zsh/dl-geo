# work001 · 论文复现：LSTM + 插值 + CNN 的降雨边坡稳定性时序预测

**论文**：Lin M., Lu Y., Li Y., Chen G., Yuan B. (2025). *Time series prediction of the slope
stability under rainfall conditions based on LSTM and CNN.* **Natural Hazards**, 121:22487–22517.
DOI: 10.1007/s11069-025-07703-4。原始 MATLAB 代码与数据在 `../demo001/`
（上游仓库：[linmmsbaby](https://github.com/linmmsbaby/Time-series-prediction-of-the-slope-stability-under-rainfall-conditions-based-on-LSTM-and-CNN)，Apache-2.0）。

> 📄 **关于论文原文**：`demo001/` 中**不再包含** `论文.pdf`。该 PDF 是 Springer 出版社的正式排版版（版本记录版 / Version of Record），版权归出版社所有，不在上游仓库的 Apache-2.0 授权范围内，故本仓库不再分发。需要原文请通过上述 DOI 在期刊页面获取（多数机构已订阅），或查阅作者自存的预印本。`demo001/` 内的 MATLAB 代码与数据（Apache-2.0）保持完整，可直接用于复现。

## 论文内容一句话

用 LSTM 预测边坡 360 个采样点的孔压（POR）时序 → natural-neighbor 插值成全边坡孔压场 →
与重度/黏聚力/内摩擦角一起栅格化为 120×120×4 "四通道图像" → CNN 回归该时刻安全系数 FS。
论文结论：FS 预测 RMSE ≈ 0.02（测试集）/ 0.03（实际边坡），FS 随降雨先降后升。

## 本目录结构

```
work001/
├── 01_LSTM_CNN_降雨边坡稳定性预测_论文复现.ipynb   # 复现主 Notebook（dl-env 内核，已执行）
├── _build_work001_notebook.py                     # Notebook 构建脚本（项目 _build_ 工作流）
├── _proto_validate.py                             # 数据端口验证原型（对齐 MATLAB .mat）
├── data/                                          # 解压后的 inp/（孔压场）与 slopefiles/（几何）+ 各 .mat
├── figs/                                          # Notebook 输出图
└── reproduction_summary.csv                       # 指标汇总（本复现 vs MATLAB demo vs 论文）
```

## 复现范围与关键决策

- 仓库 `demo001/` 原始数据**只含 slope2 一个边坡**（72 个降雨小时），论文的 9 边坡训练集未发布。
  因此本复现 = **slope2 单边坡全流程**（即原 demo `main.m` 的演示对象），按论文 4:1 做时间划分
  （第 1–58 h 训练 / 第 59–72 h 测试）。
- 网络与超参**逐项照抄论文附录 Table 5 / Table 6**（LSTM 498 隐单元 + BN + Dropout 0.18；
  CNN 四个 conv5×5+BN+ReLU+maxpool3×3 块 16/32/64/128 通道 + Dropout 0.37）。
- 数据管线两段逻辑均用 Python 复算并与 MATLAB 存档逐元素对齐：
  采样点 POR 序列（72×360）与 `data.mat` **差异 = 0**；`genSlopeMatrix` 栅格化材料通道 0 差异、
  POR 通道仅 1/4140 格（最近邻并列取值差异）。
- MATLAB 无 → Python 有差异处：natural-neighbor 插值用 scipy `griddata` linear/cubic 替代
  （Notebook 内给出"真值点插值"的误差下限作对照）。

## 结果速览

见 `reproduction_summary.csv` 与 Notebook §7。要点：

1. 数据管线可完全复现（确定性逻辑，无随机性）；
2. 照抄超参的单边坡训练：LSTM 显著优于 persistence，CNN FS 回归显著优于均值基线；
3. 端到端（LSTM→插值→CNN）FS 误差与论文"实际边坡 RMSE ≈ 0.03"同量级，
   且"真值 POR→CNN"与"LSTM POR→CNN"两口径可分离出时序+插值误差的贡献；
4. 与论文 9 边坡数字的差距主要来自训练数据量（单边坡 vs 9 边坡），已在 Notebook §7 如实声明。

## 重新生成 / 执行

```bash
conda activate dl-env
python _build_work001_notebook.py        # 重新生成 Notebook（源文件，勿手改 ipynb）
python - <<'EOF'                         # 或直接在 Jupyter 中以 dl-env 内核执行
import nbformat; from nbclient import NotebookClient
nb = nbformat.read("01_LSTM_CNN_降雨边坡稳定性预测_论文复现.ipynb", as_version=4)
NotebookClient(nb, timeout=1200, kernel_name="dl-env").execute()
nbformat.write(nb, "01_LSTM_CNN_降雨边坡稳定性预测_论文复现.ipynb")
EOF
```
