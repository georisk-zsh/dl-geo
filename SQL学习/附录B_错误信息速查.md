# 附录 B 错误信息速查

> **这是什么**：把全书散落的排错提示集中成一本"报错字典"。遇到红色 `ERROR` 时，先在这里按报错关键词搜一下，多半能直接找到原因和解法。
>
> **怎么用**：
> 1. 先看下面的 [B.1 三分钟学会读报错](#b1-三分钟学会读报错)——80% 的报错自己就能看懂；
> 2. 再去 [B.12 按报错关键词速查表](#b12-按报错关键词速查表) 用眼睛扫一遍找关键词；
> 3. 还不行，按 [B.13 排错决策树](#b13-排错决策树) 一层层定位是"连不上"还是"连上了但没权限"。
>
> 📌 本附录的每一条报错原文都是**在真实数据库上跑出来的**（PostgreSQL 14/16），不是凭印象写的。个别措辞会随版本微调，但 `ERROR:` 那一行的核心词是稳定的；`DETAIL` / `HINT` 的具体内容最容易随数据和版本变化。

---

## B.1 三分钟学会读报错

psql 的报错是**分层的**，一层比一层具体。以拼错 `FROM` 为例：

```text
beginner_pg=> SELECT * FORM school.students;
ERROR:  syntax error at or near "FORM"
LINE 1: SELECT * FORM school.students;
                      ^
```

**读的顺序（从上往下，不要跳）**：

| 行 | 含义 | 你要做的事 |
|---|---|---|
| `ERROR: ...` | **错在哪类问题** | 先读这一行定大类（语法？权限？约束？） |
| `LINE 1: ...` + `^` | **错在第几行、哪个位置** | 箭头 `^` 精确指向出错的字符，直接改它 |
| `DETAIL: ...` | **细节**（哪个约束、哪个键、哪一行数据） | 看这个才知道是"哪一条数据"违规 |
| `HINT: ...` | **数据库给你的建议** | ⭐ **最值钱的一行**，常常直接告诉你正确写法 |
| `CONTEXT: ...` | 出错时的上下文（函数、触发器） | 进阶排查用，初学可忽略 |

> 💡 **只看 `ERROR:` 一行是不够的**。举个真实例子——列名拼错时：
> ```text
> ERROR:  column "nam" does not exist
> HINT:  Perhaps you meant to reference the column "students.name".
> ```
> `HINT` 直接把正确列名告诉你了。**先看 HINT，再看 DETAIL，最后才是 ERROR 那一行。**

### 报错前缀：ERROR vs FATAL vs PANIC

| 前缀 | 含义 | 典型场景 |
|---|---|---|
| `ERROR` | 当前**这条语句**失败，连接还在，可以继续敲 | 语法错、约束违规、权限不足 |
| `FATAL` | 当前**连接**失败/被断开，psql 会退出 | 密码错、库不存在、pg_hba 拒绝 |
| `PANIC` | 服务端严重故障，会重启所有连接 | 极少见，看日志 |

> 看到 `FATAL` 就说明**还没进到数据库里**，问题在"连接"这一层——不要去改 SQL。

---

## B.2 连接与认证类（都是 FATAL，进不去）

### 服务没启动 / 端口不通

```text
psql: error: connection to server at "localhost" (::1), port 5432 failed: Connection refused
	Is the server running on that host and accepting TCP/IP connections?
```

**原因**：PostgreSQL 服务没在跑，或者端口不对，或者它只监听别的地址。

**排查（按顺序）**：

```bash
$ pg_lsclusters                    # Ubuntu/Debian：看 Status 是否 online
$ sudo systemctl status postgresql@16-main
$ sudo pg_ctlcluster 16 main start # 没起来就启动
```

> 🖥 macOS：`brew services list`；Windows：`services.msc` 里看 `postgresql-x64-16`。

### 数据库不存在

```text
psql: error: connection to server at "localhost" (::1), port 5432 failed: FATAL:  database "no_such_db" does not exist
```

**原因**：`-d` 后面的库名拼错了，或者还没创建（[第 4 章](第04章_数据库用户与模式.md)的建库脚本没跑）。

**解法**：

```bash
$ psql -l                          # 列出服务器上真实的库名，照抄
$ psql -h localhost -U student_pg -d beginner_pg    # 需要用教程约定的库名
```

### 角色（用户）不存在

```text
psql: error: connection to server at "localhost" (::1), port 5432 failed: FATAL:  role "no_such_user" does not exist
```

**原因**：用户名拼错，或这个角色还没创建。

**解法**：[第 4 章](第04章_数据库用户与模式.md)用管理员跑 `scripts/01_create_user_db.sql` 创建 `student_pg`；或先 `\du` 查有哪些角色。

### 密码认证失败

```text
psql: error: connection to server at "127.0.0.1", port 5432 failed: FATAL:  password authentication failed for user "err_user"
```

**原因**（按出现频率排序）：

1. **密码确实错了**——注意这必须是**数据库用户的密码**，不是你登录 Linux 服务器的密码（第 2.6 节讲的两套身份）；
2. `pg_hba.conf` 里该用户在**该来源 IP** 下要求密码认证，但你用的密码是旧的；
3. 密码里有特殊字符，在命令行被 shell 吃掉了——把它放进 `.pgpass` 文件或引号里。

**解法**：管理员重置密码，然后立刻用新密码连一次确认：

```sql
ALTER ROLE student_pg PASSWORD 'student_pg_2024';
```

### 没有 pg_hba.conf 条目 / 被 pg_hba.conf 拒绝

```text
FATAL:  no pg_hba.conf entry for host "203.0.113.10", user "student_pg", database "beginner_pg", no encryption
```

或（当规则是 `reject` 时）：

```text
FATAL:  pg_hba.conf rejects connection for host "127.0.0.1", user "student_pg", database "beginner_pg", no encryption
```

**原因**：你的来源 IP、目标库、用户这三者的组合，在 `pg_hba.conf` 里没有任何一条允许规则命中。

**解法（第 2.5 节）**：加规则 → **必须 reload** 才生效：

```bash
$ sudo nano /etc/postgresql/16/main/pg_hba.conf
# 追加：host  beginner_pg  student_pg  203.0.113.10/32  scram-sha-256
$ sudo pg_ctlcluster 16 main reload
```

> ⚠️ **两个高频坑**：
> 1. `pg_hba.conf` 是**从上到下第一条匹配即生效**。如果你把新规则加在文件**末尾**，而前面已经有一条 `host all all 0.0.0.0/0 trust`，那新规则永远不会生效——新规则要放在更靠前的位置；
> 2. 改完**忘记 reload**，等于没改。

### 权限不足，不能连接这个库

```text
FATAL:  permission denied for database "beginner_pg"
```

**原因**：角色的 `CONNECT` 权限被收回了（[第 15 章](第15章_用户权限与安全.md)有 `REVOKE CONNECT ... FROM PUBLIC` 的收紧操作）。

**解法**：管理员授权——`GRANT CONNECT ON DATABASE beginner_pg TO 某角色;`

---

## B.3 语法与拼写类

### 最常见的语法错误

```text
ERROR:  syntax error at or near "FORM"
LINE 1: SELECT * FORM school.students;
                      ^
```

**原因**（按出现频率）：

1. **关键词拼错**（`FORM` → `FROM`、`SELCET` → `SELECT`、`WEHRE` → `WHERE`）——箭头直接指着它；
2. **用了中文标点**：`，` `；` `（` `""` `''`。SQL 关键词、逗号、引号、分号**必须半角英文**。这是中文用户的第一号杀手；
3. **漏了逗号**或**多写了逗号**（尤其是最后一项后面多一个逗号）；
4. **忘了分号**：这不报错，但 psql 不执行——注意提示符是否从 `=>` 变成了 `->`（在等续行）。

> 💡 找不到原因时，把报错箭头指的那一小段**删掉重打一遍**，比盯着看快得多。

### 引号没闭合

```text
ERROR:  unterminated quoted string at or near "'abc;"
LINE 1: SELECT 'abc;
```

**原因**：单引号没配对。字符串必须成对 `'...'`。

**常见变体**：写了中文引号 `'abc'`（那是两个不同的字符，不是引号）、或者字符串内部有单引号却没转义（正确写法是两个单引号：`'it''s'`）。

### 字符串里想插变量却写错

```text
ERROR:  column "xxx" does not exist
```

**原因**：你把字符串忘了加引号。比如 `WHERE city = 北京` 会被理解成"列 city 等于列 北京"。

**解法**：`WHERE city = '北京'`。

---

## B.4 对象不存在类

### 表不存在

```text
ERROR:  relation "school.student" does not exist
LINE 1: SELECT * FROM school.student;
```

**三个可能原因，按顺序排查**：

1. **表名拼错**（表是 `students`，不是 `student`）→ 用 `\dt school.*` 看真实表名；
2. **模式不对**：表在 `school` 里，但你写的是 `student` 而 `search_path` 里没有 `school` → 用 `SHOW search_path;` 确认，或写全 `school.students`；
3. **表还没建**：[第 5 章](第05章_建表_数据类型与约束.md)的建表脚本（或 `scripts/02_school_schema.sql`）没跑。

### 列不存在（通常伴随 HINT）

```text
ERROR:  column "nam" does not exist
LINE 1: SELECT nam FROM school.students;
HINT:  Perhaps you meant to reference the column "students.name".
```

**解法**：照 HINT 改。查表结构用 `\d school.students`。

### 表已存在

```text
ERROR:  relation "students" already exists
```

**原因**：建表脚本重复执行了。

**解法**：脚本里用 `DROP TABLE IF EXISTS ... CASCADE;` 先清（教程 `scripts/02_school_schema.sql` 用的是 `DROP SCHEMA IF EXISTS school CASCADE;` 再重建，所以可以直接重复跑）。

---

## B.5 约束违规类（第 5 章设计的"法律"在起作用）

> ⭐ **一句话心态**：这一类报错**不是故障，是保护**。它说明你的表设计成功挡住了脏数据。看清 `DETAIL` 里是哪条数据、哪个约束，改数据重试即可。

### 唯一约束 / 主键重复

```text
ERROR:  duplicate key value violates unique constraint "students_student_no_key"
DETAIL:  Key (student_no)=(S2023001) already exists.
```

**原因**：学号 `S2023001` 已经存在，而 `student_no` 上有 UNIQUE 约束。

**解法**：换一个不重复的值，或者用 `ON CONFLICT` 处理（第 6.1 节）：

```sql
INSERT INTO school.students (student_no, name) VALUES ('S2023001', '王小明')
ON CONFLICT (student_no) DO UPDATE SET name = EXCLUDED.name;
```

### 非空约束

```text
ERROR:  null value in column "name" of relation "students" violates not-null constraint
DETAIL:  Failing row contains (17, S2023999, null, null, null, null, 2026-09-13).
```

**原因**：`name` 是 `NOT NULL`，但语句里没给它值。

**解法**：补上该列的值。`DETAIL` 里的 `Failing row contains (...)` 会把**整行**列出来，`null` 的位置就是缺的那列。

### 检查约束（CHECK）

```text
ERROR:  new row for relation "students" violates check constraint "students_birth_date_check"
DETAIL:  Failing row contains (18, S2023998, 穿越, null, 1900-01-01, null, 2026-09-13).
```

**原因**：数据违反了 `CHECK (birth_date > DATE '1980-01-01')`——你插了个 1900 年出生的人。

**解法**：改数据使之满足业务规则。约束名 `students_birth_date_check` 可以在 `\d school.students` 里查到对应的定义。

### 外键违规（第 5 章的重点）

```text
ERROR:  insert or update on table "enrollments" violates foreign key constraint "enrollments_student_id_fkey"
DETAIL:  Key (student_id)=(999) is not present in table "students".
```

**原因**：选了"不存在的学生"——`student_id = 999` 在 `students` 表里没有。

**解法**：先建这个学生，或者改成真实存在的 id：

```sql
-- 别硬编编号，用子查询按业务字段取 id
INSERT INTO school.enrollments (student_id, course_id)
SELECT s.student_id, c.course_id
FROM school.students s, school.courses c
WHERE s.student_no = 'S2023001' AND c.course_name = '数据库原理';
```

**相关报错（删父表被拒）**：

```text
ERROR:  cannot drop table students because other objects depend on it
DETAIL:  constraint enrollments_student_id_fkey on table enrollments depends on table students
```

解法：先删子表/子数据，或用 `DROP TABLE ... CASCADE`（**危险**，会连带删除依赖对象，[第 5 章](第05章_建表_数据类型与约束.md)警告过）。

### 标识列不许手工插值

```text
ERROR:  cannot insert a non-DEFAULT value into column "student_id"
DETAIL:  Column "student_id" is an identity column defined as GENERATED ALWAYS.
HINT:  Use OVERRIDING SYSTEM VALUE to override.
```

**原因**：主键是 `GENERATED ALWAYS AS IDENTITY`，明确规定**编号由数据库发**，不许你手工指定。

**解法（正解）**：INSERT 时**不写** `student_id` 这一列，让它自动发号：

```sql
INSERT INTO school.students (student_no, name) VALUES ('S2023016', '谢婷');
```

（`OVERRIDING SYSTEM VALUE` 只在数据迁移等特殊场景用，日常不要用。）

---

## B.6 权限类（第 15 章）

> ⭐ **记住两级要求**：访问一张表需要 **模式的 `USAGE`** 权限 **加上** **表本身的权限**，缺一个都进不去。下面两条报错正好对应这两级。

### 第一级：没有模式的 USAGE 权限

```text
ERROR:  permission denied for schema school
```

**原因**：角色连"路过" `school` 这个模式的资格都没有。

**解法**：

```sql
GRANT USAGE ON SCHEMA school TO 某角色;
```

### 第二级：没有表的权限

```text
ERROR:  permission denied for table students
```

**原因**：有模式的 `USAGE`，但没有这张表的 `SELECT`（或其他）权限。

**解法**：

```sql
GRANT SELECT ON ALL TABLES IN SCHEMA school TO 某角色;
-- 别忘了给"未来的表"也授权，否则新建的表对方还是看不到：
ALTER DEFAULT PRIVILEGES FOR ROLE student_pg IN SCHEMA school
    GRANT SELECT ON TABLES TO 某角色;
```

### 没有 public 模式建表权限

```text
ERROR:  permission denied for schema public
```

**原因**：PG 15 起 `public` 模式的 CREATE 权限收紧为"仅数据库所有者"。**注意**：如果你是**这个数据库的所有者**，你其实是有权限的（详见第 4.6 节的解释）——遇到这条报错的通常是**非库主角色**。

**解法**：业务表放自己的模式（推荐），或显式授权：`GRANT CREATE ON SCHEMA public TO 某角色;`

### 角色名被保留（`pg_` 前缀）

```text
ERROR:  role name "pg_student" is reserved
DETAIL:  Role names starting with "pg_" are reserved.
```

**原因**：`pg_` 前缀被 PostgreSQL 保留给系统角色（如 `pg_read_all_data`、`pg_monitor`），自建角色不能占用。

**解法**：换个不含 `pg_` 前缀的名字。本教程的示例用户因此叫 `student_pg` 而不是 `pg_student`（详见[第 4 章](第04章_数据库用户与模式.md)）。

### 无权删除角色

```text
ERROR:  permission denied to drop role
```

**原因**：只有超级管理员（或对该角色有 ADMIN 权限的角色）能删角色。

**解法**：用管理员会话执行（`sudo -u postgres psql`）。

### 角色删不掉（有依赖对象）

```text
ERROR:  role "student_pg" cannot be dropped because some objects depend on it
DETAIL:  owner of database beginner_pg
```

**原因**：这个角色名下还有对象（库、表、权限）。

**解法**（[第 15 章](第15章_用户权限与安全.md)）：

```sql
REASSIGN OWNED BY student_pg TO postgres;   -- 把对象所有权转走
DROP OWNED BY student_pg;                   -- 清掉残留权限
DROP ROLE student_pg;
```

---

## B.7 查询语义类（SQL 学到位了才会遇到）

### GROUP BY 里缺少非聚合列

```text
ERROR:  column "students.name" must appear in the GROUP BY clause or be used in an aggregate function
LINE 1: SELECT city, name, COUNT(*) FROM school.students GROUP BY city;
```

**原因**：按 `city` 分组后，一个组里有好几行，`name` 该显示谁的？数据库拒绝猜（[第 8 章](第08章_聚合与分组.md)的铁律）。

**解法三选一**：

```sql
-- ① 把列放进 GROUP BY（粒度变细）
SELECT city, name, COUNT(*) FROM school.students GROUP BY city, name;
-- ② 对它用聚合函数
SELECT city, MIN(name), COUNT(*) FROM school.students GROUP BY city;
-- ③ 想要"每组取一行"→ 那是窗口函数的工作
SELECT city, name FROM (
  SELECT city, name, ROW_NUMBER() OVER (PARTITION BY city ORDER BY student_id) rn
  FROM school.students) t WHERE rn = 1;
```

### 在 WHERE 里用聚合函数

```text
ERROR:  aggregate functions are not allowed in WHERE
LINE 1: SELECT city FROM school.students WHERE COUNT(*) > 1 GROUP BY city;
```

**原因**：`WHERE` 在**分组之前**执行，那时还没有 `COUNT` 可言（[第 8 章](第08章_聚合与分组.md)的执行顺序）。

**解法**：筛"组"要用 `HAVING`：

```sql
SELECT city FROM school.students GROUP BY city HAVING COUNT(*) > 1;
```

### 在 WHERE 里用窗口函数

```text
ERROR:  window functions are not allowed in WHERE
LINE 1: SELECT name FROM school.students WHERE ROW_NUMBER() OVER (ORDER BY student_id)=1;
```

**原因**：窗口函数在行过滤**之后**才计算（[第 11 章](第11章_子查询_CTE与窗口函数.md)）。

**解法**：套一层子查询/CTE，在外层过滤：

```sql
SELECT name FROM (
  SELECT name, ROW_NUMBER() OVER (ORDER BY student_id) rn FROM school.students
) t WHERE rn = 1;
```

### 子查询返回多行（当"值"用时）

```text
ERROR:  more than one row returned by a subquery used as an expression
```

**原因**：你把子查询当**标量**（一个值）用在 `= (...)` 里，但它返回了多行。

**解法**：要么用聚合让它只返回一行（`(SELECT MAX(...) FROM ...)`），要么改用集合运算符（[第 11 章](第11章_子查询_CTE与窗口函数.md)）：

```sql
WHERE student_id IN (SELECT student_id FROM ...)     -- 多行可以
WHERE student_id = (SELECT MAX(student_id) FROM ...) -- 只要一行
```

---

## B.8 类型与数据类

### 类型转换失败

```text
ERROR:  invalid input syntax for type integer: "abc"
LINE 1: SELECT 'abc'::integer;
```

**原因**：想把 `'abc'` 变成整数——不可能。

**解法**：检查数据源是不是脏数据；必要时用 `CASE` 或正则先过滤，或改用 `text` 类型存。

### 日期越界

```text
ERROR:  date/time field value out of range: "2025-13-45"
HINT:  Perhaps you need a different "datestyle" setting.
```

**原因**：13 月、45 日不存在。

**解法**：改正日期。`HINT` 提到的 `datestyle` 只影响"月/日顺序"的解析（如 `03/04/2025` 是 3 月 4 日还是 4 月 3 日），**不会**让非法日期变合法。写标准格式 `YYYY-MM-DD` 最稳。

### 字符串超长

```text
ERROR:  value too long for type character varying(12)
```

**原因**：`student_no varchar(12)`，你塞了 16 个字符。

**解法**：缩短数据，或改列类型（第 5.7 节）：

```sql
ALTER TABLE school.students ALTER COLUMN student_no TYPE varchar(20);
```

### 除零

```text
ERROR:  division by zero
```

**解法**：用 `NULLIF` 防除零（[第 10 章](第10章_NULL与常用函数.md)）——分母为 0 时整体返回 NULL 而不是报错：

```sql
SELECT 100.0 * 及格数 / NULLIF(总数, 0) FROM ...;
```

### ON CONFLICT 找不到唯一约束

```text
ERROR:  there is no unique or exclusion constraint matching the ON CONFLICT specification
```

**原因**：`ON CONFLICT (列)` 要求那一列上**有**唯一约束/唯一索引。你在一个普通列上用了它。

**解法**：确认列上有 UNIQUE 或主键约束；否则先建约束，或改用别的写法。

---

## B.9 并发与锁类（第 12 章）

### 死锁

```text
ERROR:  deadlock detected
DETAIL:  Process 19329 waits for ShareLock on transaction 763; blocked by process 19325.
HINT:  See server log for query details.
```

**原因**：两个会话互相等对方持有的锁，形成环（A 锁了行1等行2，B 锁了行2等行1）。

**这不是 bug**：PostgreSQL 会自动检测并**牺牲其中一个**事务（你收到的这条报错说明你就是被牺牲的那个），另一个照常执行。

**解法**：

1. 应用层：**捕获这个错误 → 整个事务 ROLLBACK → 重新执行一遍**（注意是整个事务重来，不是从出错那行续跑）；
2. 根治：约定**所有事务按相同顺序访问数据**（比如都按 `student_id` 升序更新），环就形不成了。

### 锁等待超时

```text
ERROR:  canceling statement due to lock timeout
```

**原因**：你设了 `lock_timeout`，等别人释放行锁超过了这个时限。

**解法**：找出谁在锁：

```sql
SELECT pid, state, wait_event_type, query FROM pg_stat_activity
WHERE datname = 'beginner_pg';
```

必要时让管理员终止它（`SELECT pg_terminate_backend(pid);`）。

### 语句超时

```text
ERROR:  canceling statement due to statement timeout
```

**区别**：`statement_timeout` 管"整条语句跑太久"，`lock_timeout` 只管"等锁"。

**解法**：优化查询（[第 13 章](第13章_索引与EXPLAIN.md)），或临时放宽：

```sql
SET statement_timeout = '60s';    -- 只对当前会话有效
```

### 快照隔离下的写冲突

```text
ERROR:  could not serialize access due to concurrent update
```

**原因**：你在 `REPEATABLE READ`（或 `SERIALIZABLE`）事务里，想修改一行**在你事务开始之后被别人改过**的数据。快照隔离为了保证一致读，直接拒绝。

**解法**：**只能回滚整个事务重新执行**（这类事务必须配重试逻辑）。如果你不需要这么强的隔离级别，用默认的 `READ COMMITTED` 就不会遇到它。

---

## B.10 备份与恢复类（第 14 章）

### 客户端与服务端版本不匹配

```text
pg_dump: error: server version: 16.3; pg_dump version: 14.20
pg_dump: error: aborting because of server version mismatch
```

**原因**：`pg_dump` 的版本**低于**服务器版本。

**解法**：用**版本 ≥ 服务器版本**的客户端工具。Ubuntu 上装对应版本：

```bash
$ sudo apt install -y postgresql-client-16
$ /usr/lib/postgresql/16/bin/pg_dump --version
```

### 恢复时建表失败（对象已存在）

```text
pg_restore: error: could not execute query: ERROR:  relation "students" already exists
```

**原因**：目标库里已经有同名表（往一个非空库恢复）。

**解法三选一**：

```bash
$ pg_restore -d beginner_pg backup.dump --clean --if-exists   # 恢复前先删（危险！确认目标库）
$ psql ... -c "DROP DATABASE beginner_pg;" -c "CREATE DATABASE beginner_pg OWNER student_pg;"  # 干脆重建空库
$ pg_restore -d beginner_pg -t 某张表 backup.dump             # 只恢复需要的表
```

> ⚠️ `--clean` 会**先删除目标库里已有的对象**，恢复前千万确认 `-d` 指向的库没选错。

### 角色和密码没恢复过来

**现象**：库恢复了，但用原来的用户名连不上——因为**角色属于"集群级"对象，`pg_dump` 不备份它**（[第 14 章](第14章_备份与恢复.md)的重点）。

**解法**：单独备份/恢复全局对象：

```bash
$ pg_dumpall --globals-only -f globals.sql   # 只导出角色等全局对象
$ psql -f globals.sql                        # 在新服务器上恢复
```

### 数据库当前有连接，删不掉

```text
ERROR:  database "beginner_pg" is being accessed by other users
DETAIL:  There is 1 other session using the database.
```

**原因**：有 psql/pgAdmin 还连着它。这是防止"删掉正在使用的库"的最后一道保险。

**解法**：关掉其他连接后重试。急的话可以管理员强制断开：

```sql
SELECT pg_terminate_backend(pid) FROM pg_stat_activity
WHERE datname = 'beginner_pg' AND pid <> pg_backend_pid();
```

---

## B.11 运维与其他

### psql 命令找不到

```text
$ psql: command not found
```

**原因**：只装了服务端没装客户端，或客户端不在 `PATH` 里。

**解法**：

```bash
$ sudo apt install -y postgresql-client-16     # Ubuntu
$ /usr/lib/postgresql/16/bin/psql --version    # 确认装到哪了
```

### 端口被占用

```text
could not bind IPv4 address "127.0.0.1": Address already in use
```

**原因**：5432 已被另一个 PostgreSQL 实例占用（比如系统源装了一个、PGDG 又装了一个）。

**解法**：

```bash
$ pg_lsclusters          # 看有几个实例、各自端口
$ sudo ss -ltnp | grep 5432   # 看谁占着
```

需要两个实例并存时，给新实例改端口（`postgresql.conf` 里的 `port`）。

### SSH 隧道连不上（第 2.6 节专属）

| 现象 | 卡在哪一层 | 解法 |
|---|---|---|
| 本地连 `127.0.0.1:15432` 报 `Connection refused` | 隧道层 | 隧道随 SSH 会话断开失效：确认会话处于"已连接"，转发规则已启用 |
| `FATAL: no pg_hba.conf entry for host "127.0.0.1"` | 数据库认证层 | 走隧道时服务器看到的来源是**它自己的 127.0.0.1**，pg_hba 需要有 `127.0.0.1/32` 这一条 |
| `FATAL: password authentication failed` | 数据库认证层 | 这是**数据库密码**，不是你登录服务器的 Linux 密码 |
| 本地 `15432 already in use` | 本机端口 | 换一个本地端口（如 15433），同步改客户端里填的端口 |

> **排查顺序口诀**：先 SSH 能登录 → 再服务器上本地 `psql` 能连 → 最后才试隧道端口。一层层来，比乱改配置快十倍。

---

## B.12 按报错关键词速查表

用 `Ctrl+F` 搜报错里的关键词即可。

| 报错关键词 / ERROR 开头 | 快速定位 |
|---|---|
| `syntax error at or near` | [B.3](#b3-语法与拼写类) — 拼写/中文标点 |
| `unterminated quoted string` | [B.3](#b3-语法与拼写类) — 引号未配对 |
| `does not exist`（relation） | [B.4](#b4-对象不存在类) — 表名/模式/没建表 |
| `does not exist`（database / role） | [B.2](#b2-连接与认证类都是-fatal进不去) — 库名/用户名错 |
| `already exists` | [B.4](#b4-对象不存在类) — 重复建表 |
| `duplicate key value violates unique constraint` | [B.5](#b5-约束违规类第-5-章设计的法律在起作用) — 值重复 |
| `violates not-null constraint` | [B.5](#b5-约束违规类第-5-章设计的法律在起作用) — 必填列没值 |
| `violates check constraint` | [B.5](#b5-约束违规类第-5-章设计的法律在起作用) — 违反业务规则 |
| `violates foreign key constraint` | [B.5](#b5-约束违规类第-5-章设计的法律在起作用) — 引用了不存在的 id |
| `cannot insert a non-DEFAULT value` | [B.5](#b5-约束违规类第-5-章设计的法律在起作用) — IDENTITY 列别手工填 |
| `must appear in the GROUP BY clause` | [B.7](#b7-查询语义类sql-学到位了才会遇到) — 加进 GROUP BY 或改用窗口函数 |
| `aggregate functions are not allowed in WHERE` | [B.7](#b7-查询语义类sql-学到位了才会遇到) — 改用 HAVING |
| `window functions are not allowed in WHERE` | [B.7](#b7-查询语义类sql-学到位了才会遇到) — 套一层子查询 |
| `more than one row returned by a subquery` | [B.7](#b7-查询语义类sql-学到位了才会遇到) — 子查询要加聚合或用 IN |
| `permission denied for schema` | [B.6](#b6-权限类第-15-章) — 缺 USAGE |
| `permission denied for table` | [B.6](#b6-权限类第-15-章) — 缺表权限 |
| `permission denied for database` | [B.2](#b2-连接与认证类都是-fatal进不去) — 缺 CONNECT |
| `role name ... is reserved` | [B.6](#b6-权限类第-15-章) — 角色名别用 `pg_` 前缀 |
| `cannot be dropped because some objects depend` | [B.5](#b5-约束违规类第-5-章设计的法律在起作用) / [B.6](#b6-权限类第-15-章) — 有依赖对象 |
| `password authentication failed` | [B.2](#b2-连接与认证类都是-fatal进不去) |
| `no pg_hba.conf entry` / `pg_hba.conf rejects` | [B.2](#b2-连接与认证类都是-fatal进不去) |
| `Connection refused` | [B.2](#b2-连接与认证类都是-fatal进不去) — 服务没起 |
| `invalid input syntax for type` | [B.8](#b8-类型与数据类) |
| `value too long for type` | [B.8](#b8-类型与数据类) |
| `division by zero` | [B.8](#b8-类型与数据类) — 用 NULLIF |
| `date/time field value out of range` | [B.8](#b8-类型与数据类) |
| `no unique or exclusion constraint matching the ON CONFLICT` | [B.8](#b8-类型与数据类) |
| `deadlock detected` | [B.9](#b9-并发与锁类第-12-章) — 回滚整个事务重试 |
| `canceling statement due to lock timeout` | [B.9](#b9-并发与锁类第-12-章) |
| `canceling statement due to statement timeout` | [B.9](#b9-并发与锁类第-12-章) |
| `could not serialize access due to concurrent update` | [B.9](#b9-并发与锁类第-12-章) |
| `server version mismatch` | [B.10](#b10-备份与恢复类第-14-章) — 客户端版本太低 |
| `is being accessed by other users` | [B.10](#b10-备份与恢复类第-14-章) |
| `command not found`（psql） | [B.11](#b11-运维与其他) |
| `Address already in use` | [B.11](#b11-运维与其他) |

---

## B.13 排错决策树

报错时**不要急着改 SQL**，先判断"卡在哪一层"：

```text
报错信息
│
├─ 前缀是 FATAL？
│   └─ 是 → 你还没进数据库，问题在连接层（B.2）
│       ├─ Connection refused .................. 服务没启动/端口不对
│       ├─ database/role does not exist ....... 库名/用户名拼错
│       ├─ password authentication failed ..... 数据库密码错
│       └─ no pg_hba.conf entry ............... 来源 IP 没被允许（改完记得 reload）
│
└─ 前缀是 ERROR？
    ├─ 报错里有 LINE ... ^ ？
    │   └─ 是 → 语法/拼写问题（B.3）：中文标点？关键词拼错？
    │
    ├─ 提到 "permission denied"？
    │   └─ 是 → 权限问题（B.6）：先有模式 USAGE，再有表权限
    │
    ├─ 提到 "violates" / "duplicate key"？
    │   └─ 是 → 约束违规（B.5）：看 DETAIL 是哪条数据，改数据（不是改表）
    │
    ├─ 提到 "does not exist"？
    │   └─ 是 → 对象不存在（B.4）：\dt / \d 查真实名字
    │
    ├─ 提到 "not allowed" / "must appear"？
    │   └─ 是 → 子句位置错（B.7）：WHERE/HAVING、窗口函数要套一层
    │
    └─ 提到 "timeout" / "deadlock" / "serialize"？
        └─ 是 → 并发问题（B.9）：看是等锁还是死锁，决定重试策略
```

### 通用自救三步

1. **`\h 语句`**：忘了语法就查内置帮助，例如 `\h INSERT`；
2. **`\d 表名`**：确认列名、类型、约束的**真实**样子，别凭记忆；
3. **先 SELECT 再改**：任何 UPDATE/DELETE 报错后，先用同样条件 SELECT 看看到底会命中哪些行（[第 0 章](第00章_学习准备.md)的防身术）。

> 最后重申教程[第 5 章](第05章_建表_数据类型与约束.md)那句话：**报错是朋友**。约束类报错说明数据库在替你挡脏数据；连接类报错说明安全机制在工作。逐个读懂它们，是数据库工程师成长最快的路径。

---

**相关章节**：[第 0 章](第00章_学习准备.md)（防误删）、[第 2 章](第02章_安装与服务管理.md)（安装与远程连接）、[第 3 章](第03章_psql与pgAdmin.md)（读报错）、[第 5 章](第05章_建表_数据类型与约束.md)（约束）、[第 12 章](第12章_事务.md)（锁与死锁）、[第 15 章](第15章_用户权限与安全.md)（权限排查）
