# 第 3 章 psql 与 pgAdmin

> [📖 返回目录](README.md) · ⬅️ [上一章：第 2 章 安装与服务管理](第02章_安装与服务管理.md) · ➡️ [下一章：第 4 章 数据库、用户与模式](第04章_数据库用户与模式.md)
>
> **前置知识**：[第 2 章 安装与服务管理](第02章_安装与服务管理.md) · **速查**：[附录 C SQL 速查表](附录C_SQL速查表.md) · **报错**：[附录 B 错误信息速查](附录B_错误信息速查.md)

psql 是你未来用得最多的工具。本章把它用顺，学会读报错，再装上 pgAdmin 作为图形补充。

> 📌 如果你的 PostgreSQL 装在远程 Linux 服务器上，**先看第 2.6 节**——那里讲了用 Termius/Tabby 建 SSH 隧道 + dbx 连库的完整流程。本章的 psql 操作同样适用于"隧道打通之后"，比如 `psql -h 127.0.0.1 -p 15432 -U student_pg -d beginner_pg`。

## 3.1 psql 连接的完整语法

```bash
$ psql -h 主机 -p 端口 -U 用户名 -d 数据库名
```

| 参数 | 含义 | 默认值（不写时） |
|---|---|---|
| `-h` | 服务器地址 | 本机 Unix 套接字（`localhost`） |
| `-p` | 端口 | 5432 |
| `-U` | 用户名 | 当前系统用户名 |
| `-d` | 数据库 | 与用户名同名 |

本教程常用的两种连接：

```bash
$ sudo -u postgres psql                      # 管理员（Linux）
$ psql -h localhost -U student_pg -d beginner_pg   # 学习账号（第 4 章创建后可用）
```

> 有一个隐藏知识点：`-h localhost` 走 TCP 网络连接，需要密码；**不写 `-h`** 走本机套接字，Linux 上默认采用 peer 认证（系统用户名必须和数据库用户名一致）。这就是为什么 `sudo -u postgres psql` 不用密码——你变身成了系统用户 postgres。[第 15 章](第15章_用户权限与安全.md)会系统讲认证。

连接成功后提示符 `数据库名=>`。**提示符就是你现在身份的名片**：末尾 `#` 是超级管理员，`=>` 是普通用户。以后每次敲 SQL 前扫一眼提示符，确认自己在哪个库、什么身份——防错第一课。

## 3.2 第一个必然遇到的"坑"：忘了分号

```sql
beginner_pg=> SELECT 1
beginner_pg->          ← 提示符变成 "beginner_pg->" 表示：语句没写完，我等你
```

补上分号回车即可；想放弃这条语句输入 `\r` 重置，或按 `Ctrl+C` 取消。

## 3.3 必背的 psql 元命令（反斜杠家族）

psql 里以 `\` 开头的是**元命令**（不是 SQL，发给 psql 自己处理），**不需要分号**，回车立即执行。

**查看对象（最高频）：**

```sql
\l          -- 列出所有数据库 (list)
\c beginner_pg   -- 连接(切换)到另一个数据库 (connect)
\dn         -- 列出所有模式 (schema)
\dt         -- 列出当前搜索路径下的表 (table)
\dt school.*     -- 列出 school 模式下的所有表
\d students      -- 查看表结构：列名、类型、约束、索引，全在这
\d+ students     -- 同上，附带更多细节（存储、注释）
\di         -- 列出索引
\du         -- 列出所有用户/角色 (user)
\df         -- 列出函数
```

**控制输出（次高频）：**

```sql
\x          -- 切换"扩展显示"。列特别多的表，竖排更易读（再敲一次切回）
\x on       -- 同上（显式写法）
\timing on  -- 显示每条 SQL 的耗时（毫秒），性能实验必备
\pset null ∅    -- 把 NULL 显示成 ∅，一眼区分"空值"和"空字符串"
```

**执行与退出：**

```sql
\i 脚本.sql       -- 执行一个 SQL 脚本文件（相对当前终端目录）
\ir 脚本.sql      -- 同上，但路径相对脚本所在目录（嵌套引用用这个）
\! ls             -- 不退出 psql 执行一条终端命令
\q                -- 退出 psql
```

**求助（授人以渔）：**

```sql
\?          -- 列出全部元命令的帮助
\h SELECT   -- 查看 SQL 语句 SELECT 的语法说明（\h 后面跟任何 SQL 关键词）
```

> 把 `\?` 和 `\h` 用起来——**查得到帮助的人不需要背命令**。

## 3.4 实战：空跑一圈元命令

```sql
$ sudo -u postgres psql
postgres=# \l                  -- 看到 postgres / template0 / template1
postgres=# \q
$ psql -h localhost -U student_pg -d beginner_pg
beginner_pg=> \dn              -- 看到模式 public（school 第 4 章创建）
beginner_pg=> SELECT 2 + 3;    -- psql 也能当计算器，先找找感觉
beginner_pg=> \timing on       -- 开启计时，后面每条 SQL 都显示 Time:
beginner_pg=> \x on            -- 开启竖排显示
beginner_pg=> \q
```

## 3.5 学会读报错（比学 SQL 更重要）

初学阶段每天都会遇到报错。psql 的报错格式是：

```text
beginner_pg=> SELECT * FORM students;
ERROR:  syntax error at or near "FORM"
LINE 1: SELECT * FORM students;
                 ^
```

读法三步：**看 ERROR 一行（错什么）→ 看 ^ 指的位置（错在哪）→ 回头改**。上面的例子：`FORM` 拼错了，应为 `FROM`，箭头已经指出来了。

高频报错速查表：

| 报错 | 原因 | 对策 |
|---|---|---|
| `syntax error at or near "..."` | 拼写/漏词/中文标点 | 看箭头位置；检查是否用了中文逗号、中文引号 |
| `relation "xxx" does not exist` | 表名拼错，或不在搜索路径里 | `\dt` 核对；可能需要 `SET search_path`（[第 4 章](第04章_数据库用户与模式.md)） |
| `permission denied for table` | 没权限 | [第 15 章](第15章_用户权限与安全.md)；先确认连的用户 |
| `duplicate key value violates unique constraint` | 违反了唯一/主键约束 | 换个不重复的值 |
| `unterminated quoted string` | 引号没闭合 | 检查 `'` 是否成对 |
| `FATAL: password authentication failed` | 密码错/用户错 | 在**终端**层重连，不是 psql 内部 |
| `database "xxx" does not exist` | 库名拼错 | `\l` 核对 |

> 中文输入法是新手隐形杀手：SQL 关键词、逗号、引号、分号**必须半角英文**。报 syntax error 又找不到原因时，先删掉重打这一段。

## 3.6 psql 里写长 SQL：`\\e` 编辑器与历史

- 按方向键 `↑` `↓` 翻历史（和终端一致）；
- `\e` 打开系统编辑器（nano/vim）编辑当前查询，保存退出后执行——写多行 SQL 更舒服；
- 多行语句直接回车换行即可，psql 会一直等到分号。

## 3.7 pgAdmin：安装与连接

pgAdmin 是 PostgreSQL 官方图形管理工具，看表结构、浏览数据、画查询结果很直观。

**Linux 上安装（Ubuntu，PGDG 源，[第 2 章](第02章_安装与服务管理.md)加过的直接装）：**

```bash
$ sudo apt install -y pgadmin4
```

然后浏览器访问 `http://服务器IP/pgadmin4`（首次注册一个 pgAdmin 自己的管理账号），或直接使用桌面模式。

> 🖥 **系统差异**
> - **macOS**：`brew install --cask pgadmin4`；
> - **Windows**：官网 [pgadmin.org/download](https://www.pgadmin.org/download/) 下载安装包。

**连接到服务器（3 步）：**

1. 左侧 Servers → 右键 → **Register → Server**；
2. **General 标签**：Name 随便起（如 `我的学习服务器`）；
3. **Connection 标签**：

| 字段 | 填写 |
|---|---|
| Host name/address | `localhost`（本机）或服务器 IP（远程，需 2.5 节配置） |
| Port | 5432 |
| Maintenance database | `beginner_pg` |
| Username / Password | `student_pg` / 你的密码（勾 Save password） |

连接成功后，左侧树形结构正好对应[第 1 章](第01章_数据库基础概念.md)的层级：**Servers → 数据库 → Schemas → Tables**——概念落地成界面了。

**日常三招：**

- 表上右键 → **View/Edit Data → All Rows**：直接看表数据（分页）；
- 表上右键 → **Properties → Columns**：可视化改表结构（其实它帮你生成 ALTER 语句，点 SQL 标签能学到原生写法）；
- 工具栏 **Query Tool**（闪电图标）：图形化的 SQL 编辑器，支持补全和结果导出。

> 建议：**前 11 章尽量用 psql 练**，[第 12 章](第12章_事务.md)起需要"开两个会话对照"时（事务、并发实验），pgAdmin 的多个 Query Tool 标签页非常方便。

## 本章小结

- psql 连接四参数 `-h -p -U -d`，提示符 `=>`/`#` 常看一眼，知道"我是谁、在哪个库"；
- SQL 用分号结尾，元命令不用；`\d` 看结构、`\dt` 看表、`\x` 竖排、`\timing` 计时、`\?` 求助；
- 读报错三步法：ERROR 内容 → `^` 位置 → 修改；中文标点是头号语法杀手；
- pgAdmin 的树形结构就是"服务器→库→模式→表"层级关系的可视化，远程连接依赖[第 2 章](第02章_安装与服务管理.md)的网络配置。

下一章：亲手创建数据库、用户和模式。

---

> [📖 返回目录](README.md) · ⬅️ [上一章：第 2 章 安装与服务管理](第02章_安装与服务管理.md) · ➡️ [下一章：第 4 章 数据库、用户与模式](第04章_数据库用户与模式.md)
