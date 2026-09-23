#!/usr/bin/env bash
# =============================================================================
# DL-Geo · SSH 远程深度学习训练脚本
#
# 用法:
#   ./remote_dl.sh check     连接测试：打印服务器信息 / GPU / conda 环境
#   ./remote_dl.sh push      本地项目同步到远程（rsync）
#   ./remote_dl.sh train     同步 + 在远程后台启动训练（nohup，日志写入 train_*.log）
#   ./remote_dl.sh log       实时查看远程训练日志（Ctrl-C 退出，不影响训练）
#   ./remote_dl.sh stop      停止远程训练进程
#   ./remote_dl.sh pull      拉取远程结果到本地 remote_results/<时间戳>/
#   ./remote_dl.sh all       push + train 一条龙
#   ./remote_dl.sh help      帮助
#
# ★ 每次运行本脚本前：请先检查并修改下方【手动配置区】★
#   - 任一必填项为空时脚本会拒绝执行，并提示你需要修改的行
#   - 配置齐全时，每次执行前也会展示配置摘要，需确认后才会连接服务器
#
# 强烈建议配置 SSH 免密登录（否则每条命令都会要求输密码）：
#   ssh-keygen -t ed25519                 # 若还没有密钥
#   ssh-copy-id -p <端口> <用户名>@<服务器>
# =============================================================================
set -euo pipefail   # 严格模式：命令失败/未定义变量/管道错误即退出

# ═══════════════════ 手动配置区（每次使用前检查这里） ═══════════════════
SSH_HOST=""            # ← 必填：服务器 IP 或域名，例如 "192.168.1.100" 或 "gpu.lab.edu"
SSH_PORT=""            # ← 端口：留空则默认 22
SSH_USER=""            # ← 必填：登录用户名
SSH_KEY=""             # ← 选填：私钥路径，例如 "$HOME/.ssh/id_ed25519"；留空用默认密钥/agent
REMOTE_CONDA_ENV=""    # ← 必填：远程 conda 环境名，例如 "dl-env" 或 "torch"
REMOTE_PROJECT_DIR=""  # ← 必填：远程项目目录（绝对路径），例如 "/home/xxx/DL-Geo"
REMOTE_TRAIN_CMD=""    # ← 选填：远程训练命令，例如 "python LSTM/train.py" 或
                       #    "jupyter nbconvert --to notebook --execute --inplace 01_xxx.ipynb"
                       #    留空则每次 train 时交互式输入
# ========================================================================

# 本地项目根目录 = 脚本所在目录（一般不用改）
LOCAL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# rsync 同步排除项（按需增删）
RSYNC_EXCLUDES=(--exclude '.git' --exclude '__pycache__' --exclude '.ipynb_checkpoints'
                --exclude 'remote_results' --exclude '*.pyc')

# 颜色转义定义（info=绿 / warn=黄 / die=红 / 提示=青，NC 重置终端颜色）
RED=$'\033[0;31m'; GREEN=$'\033[0;32m'; YELLOW=$'\033[1;33m'; CYAN=$'\033[0;36m'; NC=$'\033[0m'

info()  { echo "${GREEN}[✓]${NC} $*"; }   # 成功/进度提示
warn()  { echo "${YELLOW}[!]${NC} $*"; }   # 警告提示（不退出）
die()   { echo "${RED}[✗]${NC} $*" >&2; exit 1; }   # 报错并终止脚本

# 拼装 ssh 公共参数：端口（默认 22）、连接超时、可选私钥
ssh_opts() {
    local port="${SSH_PORT:-22}"               # 未配置端口则用默认 22
    local opts=(-p "$port" -o ConnectTimeout=8) # 连接超时 8 秒，避免卡死
    [ -n "$SSH_KEY" ] && opts+=(-i "$SSH_KEY") # 指定了私钥则追加 -i 参数
    echo "${opts[*]}"
}

# 远程执行命令：ssh 到目标服务器并执行 $@ 指定的命令串
rmt() {
    ssh $(ssh_opts) "${SSH_USER}@${SSH_HOST}" "$@"
}

# ---- 配置校验：必填项为空则拒绝执行并指路 ----
require_config() {
    local missing=()
    # 逐项检查四个必填配置是否为空
    [ -z "$SSH_HOST" ]           && missing+=("SSH_HOST")
    [ -z "$SSH_USER" ]           && missing+=("SSH_USER")
    [ -z "$REMOTE_CONDA_ENV" ]   && missing+=("REMOTE_CONDA_ENV")
    [ -z "$REMOTE_PROJECT_DIR" ] && missing+=("REMOTE_PROJECT_DIR")
    if [ ${#missing[@]} -gt 0 ]; then
        # 有缺失：逐个提示变量名及其在脚本中的行号（grep -n 定位）
        echo ""
        warn  "以下必填配置项还是空的，请先用编辑器打开本脚本填写："
        for v in "${missing[@]}"; do
            echo -e "    ${CYAN}${v}${NC}  ← 手动配置区第 $(grep -n "^[[:space:]]*${v}=" "$0" | head -1 | cut -d: -f1) 行"
        done
        echo ""
        echo "  编辑：  vim $0    （或用 VS Code 打开）"
        echo "  提示：  SSH_PORT / SSH_KEY / REMOTE_TRAIN_CMD 可留空（有默认处理）"
        echo ""
        die "配置未完成，已停止。填好后重新运行：./remote_dl.sh $1"
    fi
}

# ---- 配置确认：每次执行前展示摘要，人工确认 ----
confirm_config() {
    # 打印配置摘要表，提醒用户检查手动配置区
    echo ""
    echo "${CYAN}════════ 当前配置（请在脚本中修改后运行 y 继续） ════════${NC}"
    printf "  %-20s %s\n" "服务器"       "${SSH_USER}@${SSH_HOST}:${SSH_PORT:-22}"
    printf "  %-20s %s\n" "密钥"         "${SSH_KEY:-<默认密钥/agent，密码登录会逐次询问>}"
    printf "  %-20s %s\n" "远程 conda"   "$REMOTE_CONDA_ENV"
    printf "  %-20s %s\n" "远程项目目录" "$REMOTE_PROJECT_DIR"
    printf "  %-20s %s\n" "本地项目目录" "$LOCAL_DIR"
    printf "  %-20s %s\n" "训练命令"     "${REMOTE_TRAIN_CMD:-<train 时输入>}"
    echo "${CYAN}══════════════════════════════════════════════════════${NC}"
    read -r -p "配置无误，继续执行？[y/N] " ans          # 等待用户输入 y 确认
    [[ "$ans" =~ ^[Yy]$ ]] || die "已取消。请先修改脚本中的【手动配置区】。"  # 非 y 即取消
}

# ---- 各子命令 ----
# check：连接测试 —— 打印主机信息、GPU 状态、conda 环境中的 python/torch 版本
cmd_check() {
    info "连接 ${SSH_USER}@${SSH_HOST} ..."
    rmt "echo '主机: '$(hostname); echo '内核: '$(uname -r); uptime"   # 主机名/内核/负载
    if rmt "command -v nvidia-smi >/dev/null 2>&1"; then    # 检测远程是否有 nvidia-smi
        info "GPU 状态:"
        rmt "nvidia-smi --query-gpu=index,name,memory.used,memory.total,utilization.gpu --format=csv"
    else
        warn "远程没有 nvidia-smi（可能无 NVIDIA GPU 或未装驱动）"
    fi
    # 激活远程 conda 环境并验证 python/torch/cuda 可用
    info "conda 环境 [$REMOTE_CONDA_ENV] 的 Python/torch:"
    rmt "source \$(conda info --base)/etc/profile.d/conda.sh && conda activate $REMOTE_CONDA_ENV && \
         python -c 'import sys, torch; print(\"python\", sys.version.split()[0], \"| torch\", torch.__version__, \"| cuda\", torch.cuda.is_available())'"
    info "连接与环境检查通过"
}

# push：rsync 同步本地项目 → 远程项目目录
cmd_push() {
    info "同步本地项目 → ${SSH_USER}@${SSH_HOST}:${REMOTE_PROJECT_DIR}"
    rmt "mkdir -p '$REMOTE_PROJECT_DIR'"     # 先确保远程项目目录存在
    # rsync 增量同步：-a 归档权限/时间戳，-v 详细，-z 压缩传输；
    # 排除版本控制/缓存/结果目录等无需上传的内容
    rsync -avz $(ssh_opts) "${RSYNC_EXCLUDES[@]}" \
        --exclude 'demo_*.csv' \
        "$LOCAL_DIR/" "${SSH_USER}@${SSH_HOST}:${REMOTE_PROJECT_DIR}/"
    info "同步完成"
}

# train：同步代码后，在远程后台启动训练（nohup 免挂断，日志写入 train_*.log）
cmd_train() {
    cmd_push                                 # 第一步：先同步最新代码到远程
    local cmd="$REMOTE_TRAIN_CMD"
    if [ -z "$cmd" ]; then                   # 脚本里没写训练命令 → 交互式询问
        warn "脚本中 REMOTE_TRAIN_CMD 为空，本次运行请输入训练命令（也可写进脚本免重复输入）"
        read -r -p "远程训练命令（在 $REMOTE_PROJECT_DIR 下执行）: " cmd
        [ -n "$cmd" ] || die "未提供训练命令"
    fi
    local stamp; stamp="$(date +%Y%m%d_%H%M%S)"   # 时间戳，用于日志文件命名
    local logfile="train_${stamp}.log"
    info "在远程后台启动训练，日志: $logfile"
    # 远程执行链：进项目目录 → 激活 conda 环境 → nohup 后台跑训练并重定向日志
    # → 记录 PID 到 latest.pid，建立 latest.log 软链接方便后续 log/stop 命令使用
    rmt "cd '$REMOTE_PROJECT_DIR' && \
         source \$(conda info --base)/etc/profile.d/conda.sh && conda activate $REMOTE_CONDA_ENV && \
         nohup bash -c '$cmd' > '$logfile' 2>&1 & echo \$! > latest.pid && ln -sf '$logfile' latest.log && \
         echo \"PID: \$(cat latest.pid)\""
    info "已启动。查看日志:  ./remote_dl.sh log"     # 后续操作提示
    info "停止训练:        ./remote_dl.sh stop"
    info "拉取结果:        ./remote_dl.sh pull"
}

# log：实时跟踪远程训练日志（tail -f，Ctrl-C 只断开本地查看，不影响训练）
cmd_log() {
    info "实时日志（Ctrl-C 退出，不影响远程训练）："
    # 优先跟随 latest.log 软链接；无链接则取最新修改时间的 train_*.log
    rmt "cd '$REMOTE_PROJECT_DIR' && tail -n 50 -f \$(readlink latest.log 2>/dev/null || ls -t train_*.log | head -1)"
}

# stop：读取 latest.pid 并 kill 远程训练进程
cmd_stop() {
    info "停止远程训练进程..."
    # 若 PID 文件存在则 kill 对应进程；进程已死则提示；最后清理 PID 文件
    rmt "cd '$REMOTE_PROJECT_DIR' && if [ -f latest.pid ]; then kill \$(cat latest.pid) 2>/dev/null && echo '已终止 PID '\$(cat latest.pid) || echo '进程已不存在'; rm -f latest.pid; else echo '未找到 latest.pid'; fi"
}

# pull：把远程训练日志与结果文件拉回本地 remote_results/<时间戳>/
cmd_pull() {
    local dest="$LOCAL_DIR/remote_results/$(date +%Y%m%d_%H%M%S)"   # 本地结果目录（按时间戳）
    mkdir -p "$dest"
    info "拉取远程日志与结果 → $dest"
    # rsync 白名单模式：只拉取 .log/.csv/.json/.pt/.pth/.png 等结果类文件，排除其余
    rsync -avz $(ssh_opts) \
        --include '*/' --include '*.log' --include '*.csv' --include '*.json' \
        --include '*.pt' --include '*.pth' --include '*.png' \
        --exclude '*' \
        "${SSH_USER}@${SSH_HOST}:${REMOTE_PROJECT_DIR}/" "$dest/"
    info "完成。结果目录: $dest"
}

# help：打印脚本头部的用法说明（第 2~20 行注释）
cmd_help() {
    sed -n '2,20p' "$0"
}

# ---- 入口 ----
ACTION="${1:-help}"                 # 第一个参数为子命令，缺省显示帮助
case "$ACTION" in
    help|-h|--help) cmd_help; exit 0 ;;
esac

require_config "$ACTION"            # 前置校验：必填配置是否齐全
confirm_config                      # 人工确认配置摘要

case "$ACTION" in
    check) cmd_check ;;                                   # 连接/环境测试
    push)  cmd_push ;;                                    # 同步代码到远程
    train) cmd_train ;;                                   # 同步 + 后台启动训练
    log)   cmd_log ;;                                     # 实时查看日志
    stop)  cmd_stop ;;                                    # 停止训练进程
    pull)  cmd_pull ;;                                    # 拉取结果到本地
    all)   cmd_push; cmd_train ;;                         # 一条龙：push + train
    *)     die "未知命令: $ACTION（可选: check/push/train/log/stop/pull/all/help）" ;;
esac
