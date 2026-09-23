#!/usr/bin/env bash
# ============================================================
# 《PostgreSQL 从零开始》— Ubuntu 一键安装 PostgreSQL 16
#
# 适用系统：Ubuntu 22.04 / 24.04（Debian 系可参考）
# 使用方法：
#   chmod +x 00_install_ubuntu.sh
#   sudo ./00_install_ubuntu.sh
#
# 脚本内容：添加 PostgreSQL 官方软件源（PGDG）→ 安装 postgresql-16
# 依据官方文档：https://www.postgresql.org/download/linux/ubuntu/
# ============================================================
set -euo pipefail   # 严格模式：任何一步出错立即停止，变量未定义报错

echo "==> [1/4] 安装前置工具（curl 用于下载签名密钥）"
apt update
apt install -y curl ca-certificates

echo "==> [2/4] 添加 PGDG 官方软件源签名密钥"
install -d /usr/share/postgresql-common/pgdg
curl -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc --fail \
    https://www.postgresql.org/media/keys/ACCC4CF8.asc

echo "==> [3/4] 写入 PGDG 源（按当前系统代号匹配仓库）"
# 读取系统代号（如 jammy=22.04 / noble=24.04），apt 只认对应版本的仓库
. /etc/os-release
echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] \
https://apt.postgresql.org/pub/repos/apt ${VERSION_CODENAME}-pgdg main" \
    > /etc/apt/sources.list.d/pgdg.list

echo "==> [4/4] 安装 PostgreSQL 16"
apt update
apt install -y postgresql-16 postgresql-client-16

echo ""
echo "==> 安装完成！验证信息："
pg_lsclusters                                     # 应看到 16 main ... online
su - postgres -c 'psql -c "SELECT version();"'    # 打印服务器版本

cat <<'TIP'

后续步骤（见教程第 2、4 章）：
  1. 管理员进入 psql：      sudo -u postgres psql
  2. 创建学习账号和数据库：  sudo -u postgres psql -f 01_create_user_db.sql
  3. 导入示例数据：          psql -h localhost -U student_pg -d beginner_pg -f 02_school_schema.sql
TIP
