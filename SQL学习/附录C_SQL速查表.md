# 附录 C：SQL 与 psql 速查表

贴显示器边上用。**语法只收录本教程教过的写法**，零基础也能直接抄。

> 默认环境：PostgreSQL 16+ / Linux（Ubuntu）；示例库 `beginner_pg`、用户 `student_pg`、模式 `school`、五张表 `departments / teachers / students / courses / enrollments`。
> 约定提醒：SQL 语句**必须分号结尾**；`\` 开头的**元命令不分号**；关键词、逗号、引号一律**半角英文**。

---

## 1. 连接与退出

```bash
# 四参数（都可省略，省略时取默认）
psql -h 主机 -p 端口 -U 用户名 -d 数据库名

# 本教程常用的两种
sudo -u postgres psql                              # Linux 管理员（peer 认证，免密）
psql -h localhost -U student_pg -d beginner_pg     # 学习账号（走 TCP，要密码）

# 连不上时：-h 不写走本机套接字（Linux 默认 peer，系统用户名须=数据库用户名）
```

| 参数 | 含义 | 不写时的默认值 |
|---|---|---|
| `-h` | 服务器地址 | 本机 Unix 套接字（等同 `localhost`） |
| `-p` | 端口 | `5432` |
| `-U` | 用户名 | 当前系统用户名 |
| `-d` | 数据库 | 与用户名同名 |

```sql
\q          -- 退出 psql（也可 Ctrl+D）
\r          -- 清掉没写完的语句（回到干净提示符）
```

**提示符就读懂身份**：末尾 `#` = 超级管理员，`=>` = 普通用户，`=*>` = **有未提交的事务**（看到 `*` 就心里一紧）。

→ 详见 [第 3 章](第03章_psql与pgAdmin.md)、[第 2 章](第02章_安装与服务管理.md)

---

## 2. psql 元命令（第 3 章全覆盖）

**铁律：元命令以 `\` 开头、回车立即执行、末尾不加分号。**

**查看对象**

```sql
\l                -- 列出所有数据库 (list)
\l+               -- 同上，附带大小与权限
\c beginner_pg    -- 连接/切换到另一个库 (connect)
\dn               -- 列出所有模式 (schema)
\dt               -- 列出当前搜索路径下的表
\dt school.*      -- 列出 school 模式下的所有表
\d students       -- 看表结构：列、类型、约束、索引
\d+ students      -- 同上 + 存储细节、注释、大小
\di               -- 列出索引
\dv               -- 列出视图
\du               -- 列出角色/用户 (user)
\du student_pg    -- 只看这一个角色
\df               -- 列出函数
\dp school.*      -- 列出模式内对象的权限表
```

**控制输出**

```sql
\x                -- 切换"扩展显示"（竖排），列多时好用；再敲一次切回
\x on             -- 显式开启竖排
\timing on        -- 显示每条 SQL 耗时（毫秒），性能实验必备
\pset null ∅      -- 把 NULL 显示成 ∅，一眼区分"空值"与"空字符串"
```

**执行与文件**

```sql
\i 脚本.sql        -- 执行 SQL 脚本（路径相对当前终端目录）
\ir 脚本.sql       -- 同上，但路径相对"脚本所在目录"（嵌套引用用这个）
\! ls              -- 不退出 psql，执行一条终端命令
\e                 -- 打开编辑器（nano/vim）编辑当前查询，保存退出后执行
```

**求助（授人以渔）**

```sql
\?          -- 全部元命令帮助
\h SELECT   -- 某个 SQL 语句的语法说明（\h 后跟任意 SQL 关键词）
```

**易忘点（新手最常忘的 4 条）**

| 易忘点 | 说明 |
|---|---|
| 元命令**不加分号** | `\dt;` 会把分号当参数，报错或行为异常 |
| `\x` 竖排 | 表很宽时用它，比横向刷屏好读；再敲一次复原 |
| `\timing on` | 加索引/改写法前后对比耗时，必开 |
| `\i` 与 `\ir` 区别 | `\i` 相对**终端当前目录**；`\ir` 相对**脚本文件所在目录** |

**读报错三步**：看 `ERROR:` 一行（错什么）→ 看 `^` 指的位置（错在哪）→ 回头改。

| 高频报错 | 原因 / 对策 |
|---|---|
| `syntax error at or near "..."` | 拼写、漏词、**中文标点**；看箭头位置 |
| `relation "xxx" does not exist` | 表名拼错，或 `search_path` 里没有该模式 |
| `permission denied for table/schema` | 权限不够，见第 12 节 |
| `duplicate key value violates unique constraint` | 违反主键/唯一约束 |
| `unterminated quoted string` | 引号没闭合，检查 `'` 是否成对 |
| `FATAL: password authentication failed` | 在**终端层**重连，不是 psql 内部改 |

→ 详见 [第 3 章](第03章_psql与pgAdmin.md)

---

## 3. 数据库 / 用户 / 模式管理（第 4 章）

**角色（ROLE）= 用户 + 组**：带 `LOGIN` 才能登录；不带则当"组"用。

```sql
-- 角色（避开 pg_ 前缀！系统角色名保留）
CREATE ROLE student_pg LOGIN PASSWORD 'student_pg_2024';
ALTER ROLE student_pg PASSWORD '新密码';       -- 改密码（最常用）
ALTER ROLE student_pg CREATEDB;                -- 授予建库能力
ALTER ROLE student_pg NOCREATEDB;              -- 收回
ALTER ROLE ta_reader RENAME TO ta_viewer;      -- 改名
DROP ROLE student_pg;                          -- 删除（须先无任何对象/权限）

-- 数据库（须管理员或有 CREATEDB 权限；OWNER 指定库主）
CREATE DATABASE beginner_pg OWNER student_pg ENCODING 'UTF8';
ALTER DATABASE beginner_pg RENAME TO study_pg;      -- 改名
ALTER DATABASE beginner_pg OWNER TO other_role;     -- 换库主
DROP DATABASE study_pg;                            -- ⚠️ 无回收站，数据全没
DROP DATABASE IF EXISTS beginner_pg;               -- 存在才删（脚本幂等写法）

-- 模式（在具体库里建；先 \c 进库）
CREATE SCHEMA school AUTHORIZATION student_pg;
DROP SCHEMA IF EXISTS school CASCADE;              -- ⚠️ CASCADE 连表一起删
```

**search_path：不写 `school.` 前缀的秘密**

```sql
SHOW search_path;                                  -- 看当前搜索路径

SET search_path TO school, public;                 -- 会话级：退出 psql 即失效

ALTER ROLE student_pg IN DATABASE beginner_pg      -- 永久级：绑定"某用户在某库"
    SET search_path = school, public;
```

> 未设置时默认 `"$user", public`。`relation does not exist` 报错的常见原因就是表在 `school` 里、而 `search_path` 里没有它。

> **PostgreSQL 15 起**：`public` 模式的 CREATE 权限收紧为"仅数据库所有者"。库主（`OWNER student_pg`）仍能在 public 建表，**非库主**的普通角色才会 `permission denied for schema public`。

**删除角色的依赖死结**：角色名下还有对象时 `DROP ROLE` 报 `cannot be dropped because some objects depend on it`；练习环境先 `DROP DATABASE` 它名下的库，生产用 `REASSIGN OWNED`（[第 15 章](第15章_用户权限与安全.md)）。

→ 详见 [第 4 章](第04章_数据库用户与模式.md)

---

## 4. 建表与约束（第 5 章）

**建表骨架**（顺序：先建被引用的表）

```sql
CREATE TABLE school.enrollments (
    enrollment_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,  -- 自增主键
    student_id    integer NOT NULL
                  REFERENCES school.students(student_id)
                  ON DELETE CASCADE,                                -- 外键 + 级联删
    course_id     integer NOT NULL
                  REFERENCES school.courses(course_id)
                  ON DELETE CASCADE,
    enrolled_on   date NOT NULL DEFAULT CURRENT_DATE,               -- 默认值
    score         numeric(5,1) CHECK (score BETWEEN 0 AND 100),     -- 检查约束
    UNIQUE (student_id, course_id)                                  -- 复合唯一
);
```

**六大约束**

| 约束 | 写法 | 一句话 |
|---|---|---|
| 主键 | `列 integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY` | 唯一 + 非空，一张表只能一个（可多列组成复合主键） |
| 唯一 | `student_no varchar(12) NOT NULL UNIQUE` | 可多个 UNIQUE 列，且**允许 NULL**（主键不允许） |
| 非空 | `name varchar(40) NOT NULL` | 必填 |
| 检查 | `CHECK (gender IN ('M','F'))`、`CHECK (score BETWEEN 0 AND 100)` | 任何返回 true 的布尔表达式 |
| 默认值 | `enrolled_on date DEFAULT CURRENT_DATE` | 不填自动取；`CURRENT_DATE`/`now()` 每次插入求值 |
| 外键 | `REFERENCES school.students(student_id)` | 值必须已在对方主键/唯一键中存在 |

**自增 IDENTITY（新项目用它，别用 SERIAL）**

```sql
student_id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY   -- 永远由库发号，手工插值被拒
student_id integer GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY -- 允许手工指定（迁移数据用）
```

插入时**不写 id 列**，数据库自动发号。

**外键的 ON DELETE 选项**

| 选项 | 效果 | 适用 |
|---|---|---|
| `NO ACTION`（默认） | 拒绝删除并报错 | 大多数场景，最安全 |
| `RESTRICT` | 同上（检查时机略不同） | 同上 |
| `CASCADE` | 跟着一起删 | 删学生 → 连他的选课记录一起删 |
| `SET NULL` | 本列置为 NULL | 删教师 → 课程的 teacher_id 置空，课程保留 |
| `SET DEFAULT` | 置为列默认值 | 少用 |

```sql
teacher_id integer REFERENCES school.teachers(teacher_id) ON DELETE SET NULL,
student_id integer NOT NULL REFERENCES school.students(student_id) ON DELETE CASCADE
```

**ALTER TABLE 常用改法**

```sql
ALTER TABLE school.students ADD COLUMN email varchar(100);        -- 加列
ALTER TABLE school.students DROP COLUMN email;                    -- 删列（数据一并没了）
ALTER TABLE school.students ALTER COLUMN city TYPE varchar(30);   -- 改列类型（现有数据须兼容）
ALTER TABLE school.students ADD CONSTRAINT no_future             -- 加约束（对已有数据生效）
    CHECK (enrolled_on <= CURRENT_DATE);
ALTER TABLE school.students DROP CONSTRAINT no_future;           -- 删约束（名字抄 \d 输出）
ALTER TABLE school.students RENAME COLUMN gender TO sex;         -- 改列名
ALTER TABLE school.students RENAME TO student;                   -- 改表名
```

**删除与清空**

```sql
DROP TABLE school.enrollments;         -- ⚠️ 表结构+数据一起没；被外键引用时会阻止
TRUNCATE TABLE school.enrollments;     -- 只清空数据，保留结构，速度快且重置自增
```

> `TRUNCATE` = 瞬间倒空整表；`DELETE FROM 表`（不带 WHERE）也能清空但逐行删、较慢。**两者都不进回收站。**

→ 详见 [第 5 章](第05章_建表_数据类型与约束.md)

---

## 5. 数据类型速选（第 5 章）

| 类型 | 用途 | 一句话选用建议 |
|---|---|---|
| `integer` (int4) | 整数 id、年龄、数量 | 日常首选，±21 亿 |
| `bigint` (int8) | 订单号、日志 id | 怕溢出就用它，±9.2×10¹⁸ |
| `smallint` (int2) | 状态码 | 省空间，少用 |
| **`numeric(p, s)`** / `decimal` | **钱、成绩、利率** | **分毫不差，一律 numeric**（`numeric(5,1)` 存 `-9999.9`） |
| `real` / `double precision` | 科学计算 | 有浮点误差，**禁止存钱和成绩** |
| `varchar(n)` | 名字、学号等有长度约束的文本 | n 是**字符数**不是字节数，中文一个字算 1 |
| `text` | 简介、备注等长文 | 无长度上限；与 varchar 性能几乎无差别 |
| `char(n)` | 定长编码 | 不足自动补空格，基本只在固定编码场景用 |
| `date` | 纯日期（生日、开学日） | 只有日期概念时用 |
| `timestamp` | 日期 + 时刻（无时区） | 一般不用 |
| **`timestamptz`** | 日期 + 时刻 + 时区 | **记录"发生了什么"一律用它**（注册、下单、日志） |
| `time` | 只有时刻 | `08:30:00` |
| `interval` | 时间长度 | `INTERVAL '2 days'` |
| `boolean` | 三值：`true` / `false` / `NULL` | 是/否标志 |
| `uuid` | 全局唯一标识 | 分布式系统常用 |
| `jsonb` | JSON 文档 | 进阶，知道存在即可 |

> ⚠️ 经典陷阱：`0.1 + 0.2` 用浮点类型算出 `0.30000000000000004`。**凡要"分毫不差"（金额、分数、利率）一律 `numeric`。**
> 口诀：整数 id 用 `integer` IDENTITY、钱和成绩用 `numeric`、名字 `varchar(n)`、长文 `text`、纯日期 `date`、事件时间 `timestamptz`。

→ 详见 [第 5 章](第05章_建表_数据类型与约束.md)

---

## 6. 增删改（第 6 章）

**INSERT**

```sql
-- 基本形式：永远显式写列名（省略列名的写法依赖列顺序，是雷区）
INSERT INTO school.students (student_no, name, gender, birth_date, city)
VALUES ('S2023016', '谢婷', 'F', DATE '2005-09-18', '厦门');

-- 一次插多行
INSERT INTO school.departments (dept_name) VALUES
    ('计算机科学与技术学院'),
    ('数学科学学院');

-- RETURNING：拿回自增 id（PG 特色，程序开发极常用）
INSERT INTO school.students (student_no, name, gender)
VALUES ('S2023017', '高翔', 'M')
RETURNING student_id, student_no, name;

-- INSERT ... SELECT：从其他表复制
INSERT INTO school.teachers (name, title, hire_date, dept_id)
SELECT name || '(助教)', '助教', CURRENT_DATE, dept_id
FROM school.teachers WHERE dept_id = 2;

-- ON CONFLICT：冲突时不报错（批量导入去重）
INSERT INTO school.students (student_no, name, gender)
VALUES ('S2023016', '谢婷婷', 'F')
ON CONFLICT (student_no) DO UPDATE SET name = EXCLUDED.name;   -- EXCLUDED = 本次想插入的新值
-- 也可 ON CONFLICT (student_id, course_id) DO NOTHING;  重复则静默跳过
```

> 文本用**单引号** `'...'`；日期写 `DATE '2005-09-18'`（或 `'2005-09-18'`，PG 能识别）；数字不加引号。

**UPDATE（三段式：表 → SET → WHERE）**

```sql
UPDATE school.students
SET city = '福州市'              -- 改哪些列、改成什么
WHERE student_no = 'S2023016';   -- 改哪些行（返回 UPDATE 1 = 改了 1 行）

-- 改多列、用表达式
UPDATE school.courses
SET credit = credit + 0.5, hours = hours + 8
WHERE course_name = '数据结构';

-- 基于其他表更新（FROM）
UPDATE school.enrollments e
SET score = 60
FROM school.students s
WHERE e.student_id = s.student_id
  AND s.student_no = 'S2023005'
  AND e.score < 60;
```

**DELETE**

```sql
DELETE FROM school.students WHERE student_no = 'S2023016';   -- 返回 DELETE 1
DELETE FROM school.students WHERE student_no = 'S2023016' RETURNING *;  -- 返回被删的行
```

> 删学生时，他在 `enrollments` 的记录会因 `ON DELETE CASCADE` 自动删除——外键在替你保护一致性。

**DELETE vs TRUNCATE**

| | `DELETE FROM 表;` | `TRUNCATE 表;` |
|---|---|---|
| 速度 | 逐行删，大表慢 | 秒清 |
| WHERE | 支持 | **不支持**（只能全清） |
| 自增序列 | 继续 | 重置回 1 |

> ⚠️ **没有 WHERE 的 UPDATE/DELETE = 全表事故**。三招防呆：① 先 `SELECT * FROM 表 WHERE 条件;` 预览命中行；② 用 `BEGIN; ... COMMIT/ROLLBACK;` 包裹；③ 盯 `UPDATE`/`DELETE` 后面的数字，数字不对立刻 `ROLLBACK`。

→ 详见 [第 6 章](第06章_数据的增删改.md)

---

## 7. 查询（第 7–11 章）

### 7.1 SELECT 子句顺序（两种都要背）

```text
书写顺序：SELECT → FROM → WHERE → GROUP BY → HAVING → ORDER BY → LIMIT
执行顺序：FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT
```

理解执行顺序能解释很多报错：`SELECT` 的别名不能用在 `WHERE` 里（那一步还没算），但能用在 `ORDER BY` 里。

```sql
SELECT city, gender, COUNT(*) AS 人数         -- 投影（DISTINCT 则对整行组合去重）
FROM school.students                          -- 来源
WHERE city IN ('北京', '上海')                 -- 筛行（分组前）
GROUP BY city, gender                         -- 分组
HAVING COUNT(*) >= 2                          -- 筛组（分组后）
ORDER BY city ASC, 人数 DESC                  -- 排序
LIMIT 10 OFFSET 20;                           -- 截断（第 3 页每页 10 条）
```

### 7.2 WHERE 运算符表

| 运算符 | 含义 | 例子 |
|---|---|---|
| `=` | 等于（**一个等号**，不是 `==`） | `WHERE city = '北京'` |
| `<>` 或 `!=` | 不等于 | `WHERE gender <> 'M'` |
| `>` `<` `>=` `<=` | 大小比较 | `WHERE score >= 60` |
| `BETWEEN a AND b` | 闭区间，**含两端** | `WHERE score BETWEEN 80 AND 90` |
| `IN (值1, 值2, ...)` | 在列表中 | `WHERE city IN ('北京','上海')` |
| `LIKE` / `ILIKE` | 模式匹配 / 忽略大小写 | `WHERE name LIKE '王%'` |
| `IS NULL` / `IS NOT NULL` | 空值判断 | `WHERE score IS NULL` |
| `AND` / `OR` / `NOT` | 逻辑组合（优先级 `NOT > AND > OR`） | `WHERE a AND (b OR c)` |

```sql
-- LIKE 通配符：% 任意长度任意字符，_ 恰好一个字符
WHERE name LIKE '王%'              -- 王开头
WHERE student_no LIKE 'S2023_01%'  -- 一个下划线配一个字符
WHERE city NOT LIKE '%京%'         -- 不含"京"
```

> ⚠️ **易错点**
> - `NULL` 判断**只能用** `IS NULL` / `IS NOT NULL`；`= NULL` 永远查不到任何行（第 7 节再讲）。
> - `BETWEEN` 是**闭区间，含两端**，边界值常出 bug。
> - `<>` 会**漏掉 NULL 行**（`NULL <> '北京'` 结果是 NULL 不是 true）→ 补 `OR city IS NULL`。
> - `AND`/`OR` 混用**无脑加括号**，别指望记优先级。

### 7.3 ORDER BY / LIMIT

```sql
ORDER BY birth_date                        -- 默认 ASC 升序
ORDER BY score DESC                        -- DESC 降序；NULL 默认排最后
ORDER BY city ASC, birth_date DESC         -- 多列：先城市升序，同城再按生日降序
ORDER BY score DESC NULLS FIRST           -- 控制 NULL 位置（空值排最前）
LIMIT 5                                    -- 只看前 5 行
LIMIT 10 OFFSET 20                         -- 跳过 20 行取 10 行（分页）
```

> **没有 ORDER BY 就没有顺序**——SQL 不保证无 ORDER BY 的返回顺序，依赖"默认顺序"的程序必是 bug。

### 7.4 聚合函数

| 函数 | 作用 | 对 NULL |
|---|---|---|
| `COUNT(*)` | 数**行数** | 全部都数 |
| `COUNT(列)` | 数该列**非空值**个数 | **跳过 NULL** |
| `SUM(列)` | 求和 | 跳过 NULL |
| `AVG(列)` | 平均值 | 跳过 NULL（分母不含 NULL 行） |
| `MAX(列)` / `MIN(列)` | 最大 / 最小 | 跳过 NULL |

```sql
SELECT COUNT(*)        FROM school.students;         -- 15：学生总数
SELECT COUNT(*)        FROM school.enrollments;      -- 42：选课记录总数
SELECT COUNT(score)    FROM school.enrollments;      -- 39：有成绩的（3 条在读未考不算）
SELECT AVG(score), MAX(score), MIN(score) FROM school.enrollments;
```

> ⚠️ `COUNT(*)` vs `COUNT(列)` 是经典考点：数"记录条数"用前者，数"该字段实际填了的"用后者。

### 7.5 GROUP BY / HAVING

```sql
-- 每个城市有多少学生
SELECT city, COUNT(*) AS 学生人数
FROM school.students
GROUP BY city
ORDER BY 学生人数 DESC;

-- 每门课选课人数与平均分，只保留人数 >= 5 的课
SELECT c.course_name,
       COUNT(*)               AS 选课人数,
       ROUND(AVG(e.score), 1) AS 平均分
FROM school.courses c
JOIN school.enrollments e ON e.course_id = c.course_id
GROUP BY c.course_name
HAVING COUNT(*) >= 5
ORDER BY 平均分 DESC;

-- 按多列分组：粒度更细
SELECT city, gender, COUNT(*) FROM school.students GROUP BY city, gender;

-- 条件计数：COUNT(*) FILTER (WHERE ...)（比 SUM(CASE WHEN) 好读）
SELECT c.course_name,
       COUNT(*)                          AS 总人次,
       COUNT(*) FILTER (WHERE e.score >= 60)  AS 及格人次,
       COUNT(*) FILTER (WHERE e.score IS NULL) AS 在读未考
FROM school.courses c
JOIN school.enrollments e ON e.course_id = c.course_id
GROUP BY c.course_name;
```

| 子句 | 筛什么 | 能用聚合函数吗 |
|---|---|---|
| `WHERE` | 筛**行**（分组前） | ✗ 不能（`ERROR: aggregate functions are not allowed in WHERE`） |
| `HAVING` | 筛**组**（分组后） | ✓ 能 |

> ⚠️ **铁律：SELECT 里的非聚合列，必须出现在 GROUP BY 里。**否则报 `column "..." must appear in the GROUP BY clause`。

> ⚠️ **整数除法陷阱**：`SELECT 7 / 2;` = `3`（整数除整数得整数）。算比率先乘 `100.0`：
> ```sql
> SELECT ROUND(100.0 * COUNT(*) FILTER (WHERE score >= 60) / COUNT(*), 1) AS 及格率
> FROM school.enrollments;
> ```

### 7.6 四种 JOIN

```sql
SELECT s.name AS 学生, c.course_name AS 课程, e.score AS 成绩
FROM school.students AS s
JOIN school.enrollments AS e ON e.student_id = s.student_id   -- JOIN = INNER JOIN
JOIN school.courses    AS c ON c.course_id  = e.course_id
WHERE s.name = '王小明';
```

| 类型 | 保留哪些行 | 集合直觉 |
|---|---|---|
| `INNER JOIN`（默认） | 只留两边都配上的 | A ∩ B |
| `LEFT JOIN` | 左表全保留，配不上的右侧补 NULL | A |
| `RIGHT JOIN` | 右表全保留（与 LEFT 对称，少用，习惯改写成 LEFT） | B |
| `FULL JOIN` | 两边都全保留，配不上的补 NULL | A ∪ B |

```sql
-- LEFT JOIN 的灵魂用法：找"没有"的行（没选任何课的学生）
SELECT s.student_no, s.name
FROM school.students s
LEFT JOIN school.enrollments e ON e.student_id = s.student_id
WHERE e.student_id IS NULL;

-- 自连接：每位教师与其同院系同事
SELECT t1.name AS 教师, t2.name AS 同院系同事
FROM school.teachers t1
JOIN school.teachers t2
  ON t1.dept_id = t2.dept_id AND t1.teacher_id <> t2.teacher_id;

-- UNION 上下拼行（列数、对应类型必须一致）
SELECT name, '学生' AS 身份 FROM school.students WHERE city = '北京'
UNION                    -- UNION 去重；UNION ALL 保留全部且更快
SELECT name, '教师' FROM school.teachers
ORDER BY name;
```

> ⚠️ **多表查询必用别名**（`AS s`）；两张表同名列必须写清 `s.student_id`。
> ⚠️ **忘写 `ON` = 笛卡尔积爆炸**：`students CROSS JOIN courses` 得 15×8=120 行。结果行数异常膨胀，先检查 `ON`。
> ⚠️ `WHERE e.student_id IS NULL` 与把条件写到 `ON ... AND` 里**不等价**：ON 里的条件只影响匹配，不过滤左表行。分工：ON 放连接条件，WHERE 放业务过滤。

### 7.7 子查询的三种位置

```sql
-- ① WHERE 里当"值"用（标量子查询，只能返回一行一列）
SELECT name, birth_date FROM school.students
WHERE birth_date = (SELECT MIN(birth_date) FROM school.students);

-- ② WHERE 里当"集合"用（IN / EXISTS / ANY / ALL）
SELECT name FROM school.students
WHERE student_id IN (SELECT student_id FROM school.enrollments WHERE course_id = 1);

-- ③ FROM 里当"临时表"用（派生表，必须有别名）
SELECT t.course_name, t.avg_score
FROM (SELECT c.course_name, ROUND(AVG(e.score),1) AS avg_score
      FROM school.courses c
      JOIN school.enrollments e ON e.course_id = c.course_id
      GROUP BY c.course_name) AS t
WHERE t.avg_score >= 75;
```

> ⚠️ **NOT IN 遇 NULL 的坑**：子查询结果里只要有一个 NULL，`NOT IN` 判断全变 NULL → 查询一行都返回不了。子查询列可能为 NULL 时，一律换 `NOT EXISTS`：
> ```sql
> SELECT s.name FROM school.students s
> WHERE NOT EXISTS (SELECT 1 FROM school.enrollments e
>                   WHERE e.student_id = s.student_id AND e.course_id = 1);
> ```
> `EXISTS` 找到第一行即短路返回，`SELECT 1` 是惯例。

### 7.8 CTE（WITH 子句）

```sql
WITH course_avg AS (                         -- 第 1 步：算每门课平均分
    SELECT c.course_name, ROUND(AVG(e.score),1) AS avg_score
    FROM school.courses c
    JOIN school.enrollments e ON e.course_id = c.course_id
    GROUP BY c.course_name
)                                            -- 多个 CTE 用逗号分隔，后者可引用前者
SELECT * FROM course_avg                     -- 第 2 步：像普通表一样用
WHERE avg_score >= 75
ORDER BY avg_score DESC;                     -- 末尾才写分号

-- 递归 CTE（了解）：生成 1~5
WITH RECURSIVE nums AS (
    SELECT 1 AS n
    UNION ALL
    SELECT n + 1 FROM nums WHERE n < 5
)
SELECT * FROM nums;
```

> 三层以上嵌套的子查询，一律重写成 CTE。PG 12+ 会把 CTE 内联，性能不吃亏。

### 7.9 窗口函数（分组统计但不折叠行）

```sql
函数(...) OVER (
    PARTITION BY 分组键    -- 按"谁"分窗口（省略 = 全表一个窗口）
    ORDER BY 排序键        -- 窗口内排序（rank / 累计值必需）
    [ROWS BETWEEN ...]     -- 帧定义（进阶）
)
```

与 GROUP BY 的本质区别：GROUP BY 把 15 行**折叠**成 3 行；窗口函数**保留全部 15 行**，只在每行旁边附加计算结果。

**排名三兄弟**

```sql
SELECT c.course_name, s.name, e.score,
       ROW_NUMBER() OVER (PARTITION BY c.course_name ORDER BY e.score DESC) AS 行号,
       RANK()       OVER (PARTITION BY c.course_name ORDER BY e.score DESC) AS 排名,
       DENSE_RANK() OVER (PARTITION BY c.course_name ORDER BY e.score DESC) AS 密排名
FROM school.enrollments e
JOIN school.students s ON s.student_id = e.student_id
JOIN school.courses  c ON c.course_id  = e.course_id
ORDER BY c.course_name, 排名;
```

| 函数 | 并列第 2 时下一行的值 | 特点 |
|---|---|---|
| `ROW_NUMBER()` | 4 | 无情递增，绝不并列（1,2,3,4） |
| `RANK()` | 4 | 并列同名次，跳过后续（1,2,2,4） |
| `DENSE_RANK()` | 3 | 并列同名次，不跳（1,2,2,3） |

**组内 Top N 标准模板（必背）**

```sql
WITH ranked AS (
    SELECT c.course_name, s.name, e.score,
           ROW_NUMBER() OVER (PARTITION BY c.course_id ORDER BY e.score DESC) AS rn
    FROM school.enrollments e
    JOIN school.students s ON s.student_id = e.student_id
    JOIN school.courses  c ON c.course_id  = e.course_id
)
SELECT course_name, name, score
FROM ranked
WHERE rn <= 2;      -- 窗口函数不能直接进 WHERE，必须再包一层
```

**其余常用窗口函数**

| 函数 | 作用 |
|---|---|
| `ROW_NUMBER()` / `RANK()` / `DENSE_RANK()` | 组内编号 / 排名 |
| `NTILE(n)` | 组内切成 n 段（四分位 `NTILE(4)`） |
| `SUM/AVG/COUNT/MAX/MIN() OVER (...)` | 组内聚合，不折叠行 |
| `LAG(列, 偏移, 默认)` / `LEAD(...)` | 前一行 / 后一行（首行取不到前一行时结果为 NULL） |
| `FIRST_VALUE(列)` / `LAST_VALUE(列)` | 窗口内第一个 / 最后一个值 |
| `NTH_VALUE(列, n)` | 窗口内第 n 个值 |

```sql
-- 组内累计 + 与前一名差距
SELECT c.course_name, s.name, e.score,
       SUM(e.score) OVER (PARTITION BY c.course_id ORDER BY e.score DESC) AS 累计分数,
       e.score - LAG(e.score) OVER (PARTITION BY c.course_id ORDER BY e.score DESC) AS 与前一名差
FROM school.enrollments e
JOIN school.students s ON s.student_id = e.student_id
JOIN school.courses  c ON c.course_id  = e.course_id;
-- 不加 ORDER BY 的 SUM(...) OVER (PARTITION BY ...) 是组内总和，不是累计
```

> ⚠️ **铁律：窗口函数只能出现在 `SELECT` 和 `ORDER BY` 里**，不能进 `WHERE`/`GROUP BY`/`HAVING`——它们在行过滤之后才计算。要按窗口结果过滤，必须像 Top N 模板那样再包一层。

→ 详见 [第 7 章](第07章_查询基础.md)、[第 8 章](第08章_聚合与分组.md)、[第 9 章](第09章_多表连接JOIN.md)、[第 11 章](第11章_子查询_CTE与窗口函数.md)

---

## 8. 常用函数速查（第 10 章）

### 8.1 NULL 处理

```sql
-- NULL 的语义是"未知"，和任何值比较结果都是 NULL（不是 true）
SELECT NULL = NULL;      -- NULL
SELECT NULL IS NULL;     -- true（判断"是不是未知"是可以的）
SELECT '' IS NULL;       -- false！空字符串 ≠ NULL

COALESCE(city, '未填写')             -- 返回第一个非空值（万金油兜底）
COALESCE(ROUND(AVG(score),1), 0)     -- 空课程平均分显示 0 而非 NULL

NULLIF(city, '北京')                 -- 两值相等则返回 NULL（北京 → NULL）
100.0 * SUM(score) / NULLIF(分母, 0) -- 防除零：分母为 0 时整体返回 NULL 而不报错
```

> ⚠️ `WHERE 条件` 只有为 `true` 的行被保留，`false` **和 NULL 都被丢弃**。
> 清洗数据时"看起来空白"的格子可能是 `''`、可能是 NULL、也可能是 `' '`：
> `WHERE city IS NULL OR trim(city) = ''`

### 8.2 字符串函数

| 函数 | 作用 | 例子 → 结果 |
|---|---|---|
| `upper` / `lower` | 大小写转换 | `upper('ok')` → `OK` |
| `length` | 字符数 | `length('数据库')` → 3；`length(NULL)` → NULL |
| `trim` / `ltrim` / `rtrim` | 去两端 / 左 / 右空白 | `trim('  x ')` → `x` |
| `substring(s, 起, 长)` | 截取（**从 1 开始，不是 0**） | `substring('S2023001', 2, 4)` → `2023` |
| `replace(s, 旧, 新)` | 替换 | `replace('a-b','-','/')` → `a/b` |
| `||` / `concat` | 拼接（`concat` 跳过 NULL） | `'a' || NULL` → NULL；`concat('a', NULL)` → `'a'` |
| `left(s, n)` / `right(s, n)` | 取左 / 右 n 个字符 | `left('S2023001', 1)` → `'S'` |
| `split_part(s, 分隔, 第几段)` | 切割取段 | `split_part('a,b,c', ',', 2)` → `'b'` |

```sql
SELECT trim(name) AS 姓名,
       substring(student_no, 2, 4) AS 年级,   -- 从第 2 个字符起取 4 个
       upper(student_no) AS 学号大写
FROM school.students;

-- 正则匹配（进阶）：~ 匹配、~* 忽略大小写
WHERE name ~ '^王[小大]'
```

### 8.3 日期时间函数

```sql
SELECT CURRENT_DATE;                          -- 今天（date）
SELECT now();                                 -- 此刻（timestamptz）
SELECT CURRENT_DATE + INTERVAL '7 days';      -- 一周后
SELECT age(CURRENT_DATE, DATE '2005-03-12');  -- 年龄："21 years 6 mons 1 day"
SELECT extract(year  FROM birth_date) FROM school.students;   -- 取年
SELECT extract(month FROM birth_date) FROM school.students;   -- 取月
SELECT date_trunc('month', now());            -- 截断到本月月初
SELECT to_char(birth_date, 'YYYY"年"MM"月"DD"日"') FROM school.students;  -- 格式化输出
SELECT to_date('2025-09-01', 'YYYY-MM-DD');   -- 字符串 → 日期
```

| 运算 | 结果类型 | 例子 |
|---|---|---|
| `date - date` | integer（天数） | `CURRENT_DATE - birth_date` |
| `date + integer` | date | `DATE '2025-09-01' + 30` |
| `date + interval` | timestamp | `now() + INTERVAL '3 hours'` |
| `interval + interval` | interval | `INTERVAL '1 day' + INTERVAL '2 hours'` |

```sql
-- 按年月统计的标准姿势（数据分析天天用）
SELECT date_trunc('month', e.enrolled_on) AS 选课月份, COUNT(*) AS 人次
FROM school.enrollments e
GROUP BY 1        -- GROUP BY 1 = 按输出第 1 列分组（语法糖）
ORDER BY 1;
```

> 时区：`timestamptz` 内部存 UTC，显示随会话时区。`SHOW timezone;` / `SET timezone = 'Asia/Shanghai';`。

### 8.4 数值函数

| 函数 / 写法 | 作用 | 例子 → 结果 |
|---|---|---|
| `round(n, 位数)` | 四舍五入 | `round(3.14159, 2)` → 3.14 |
| `trunc(n, 位数)` | 直接截断 | `trunc(3.99, 1)` → 3.9 |
| `ceil` / `floor` | 向上 / 向下取整 | `ceil(3.1)` → 4 |
| `abs` | 绝对值 | `abs(-5)` → 5 |
| `::numeric` | 类型转换（PG 语法糖） | `7::numeric / 2` → 3.5 |
| `CAST(x AS 类型)` | 标准 CAST 写法 | `CAST('123' AS int)` → 123 |

> ⚠️ `round(3.5)` 对 `numeric` 是四舍五入，但 `double precision` 走银行家舍入。**金额/成绩务必先 `::numeric` 再 round。**

### 8.5 类型转换

```sql
7::numeric                  -- PG 语法糖：整数转 numeric，7::numeric / 2 = 3.5
'123'::integer              -- 字符串转整数
CAST('123' AS integer)      -- 标准写法，两者等价
score::text                 -- 转文本（注意：会让索引失效，见第 10 节）
```

### 8.6 CASE WHEN（SQL 的 if-else）

```sql
-- 搜索式 CASE（推荐）：从上到下第一个满足的分支生效
SELECT name, score,
    CASE WHEN score >= 90 THEN '优秀'
         WHEN score >= 80 THEN '良好'
         WHEN score >= 70 THEN '中等'
         WHEN score >= 60 THEN '及格'
         WHEN score IS NULL THEN '在读'
         ELSE '不及格'
    END AS 等级
FROM school.enrollments e
JOIN school.students s ON s.student_id = e.student_id;
```

- `ELSE` 缺省时返回 NULL；
- CASE 是**表达式**，可出现在 `SELECT`、`WHERE`、`ORDER BY`、`GROUP BY` 里：

```sql
-- 自定义排序：优秀在前，不及格垫底（CASE 也能进 ORDER BY）
SELECT s.name, e.score
FROM school.enrollments e
JOIN school.students s ON s.student_id = e.student_id
WHERE e.score IS NOT NULL
ORDER BY CASE WHEN e.score >= 90 THEN 1
              WHEN e.score >= 60 THEN 2
              ELSE 3 END;

-- 配合 SUM 做条件计数（FILTER 的传统等价写法）
SELECT SUM(CASE WHEN score >= 60 THEN 1 ELSE 0 END) AS 及格数 FROM school.enrollments;
```

→ 详见 [第 10 章](第10章_NULL与常用函数.md)

---

## 9. 事务（第 12 章）

```sql
BEGIN;                                        -- 开启事务（= BEGIN TRANSACTION; = START TRANSACTION;）
UPDATE school.students SET city = '测试市' WHERE student_id = 1;
SELECT name, city FROM school.students WHERE student_id = 1;  -- 此刻看到"已改"（未提交）
ROLLBACK;                                     -- 反悔：回到 BEGIN 之前

BEGIN;
UPDATE school.students SET city = '测试市' WHERE student_id = 1;
COMMIT;                                       -- 定案：不可再 ROLLBACK
```

**SAVEPOINT：事务里的存档点**

```sql
BEGIN;
UPDATE school.students SET city = '测试A' WHERE student_id = 4;
SAVEPOINT sp1;                                -- 存档
UPDATE school.students SET city = '测试B' WHERE student_id = 5;
ROLLBACK TO sp1;                              -- 只撤销到存档点（5 撤销，4 保留）
COMMIT;
```

**隔离级别：设置与查询**

```sql
BEGIN ISOLATION LEVEL REPEATABLE READ;   -- 在 BEGIN 时指定级别
SHOW transaction_isolation;              -- 查看当前会话的隔离级别
SET lock_timeout = '5s';                 -- 等锁上限，避免无限等待
```

| 级别 | 脏读 | 不可重复读 | 幻读 | 适用 |
|---|---|---|---|---|
| READ UNCOMMITTED | （PG 不支持，等同下一档） | | | — |
| **READ COMMITTED**（默认） | 不可能 | 可能 | 可能 | 90% 场景 |
| REPEATABLE READ | 不可能 | 不可能 | PG 下也不可能 | 报表、一致性读取（写冲突会报 `could not serialize access due to concurrent update`，需 ROLLBACK 重试） |
| SERIALIZABLE | 不可能 | 不可能 | 不可能 | 最严格，冲突多需重试逻辑 |

**要点**

- 事务中提示符变成 `=*>`，`*` 提醒你有未提交事务；
- **DDL 也能进事务**（PG 特色）：建表删表同样可回滚（MySQL 多数不行）；
- 事务中报错的语句失效，但**事务还开着**，干净退出用 `ROLLBACK`；
- **自动提交**：不写 `BEGIN` 时每条语句自成微型事务，执行即提交——这就是"不带 WHERE 的 UPDATE"没有后悔药的原因；
- UPDATE/DELETE 会给目标行**加锁**，另一事务改同一行必须等；死锁会被自动检测并牺牲一方（报 `deadlock detected`）；
- 排障：`SELECT pid, state, wait_event_type, query FROM pg_stat_activity WHERE datname = 'beginner_pg';`，卡死会话可 `SELECT pg_terminate_backend(pid);`。

**防呆模板（危险操作必备咒语）**

```sql
BEGIN;
-- 危险的 UPDATE / DELETE
-- SELECT 检查影响范围
COMMIT;   -- 或 ROLLBACK;
```

→ 详见 [第 12 章](第12章_事务.md)

---

## 10. 索引与性能（第 13 章）

**CREATE INDEX 各种写法**

```sql
CREATE INDEX idx_enrollments_student ON school.enrollments(student_id);   -- 普通索引
CREATE INDEX idx_enrollments_course  ON school.enrollments(course_id);

-- 复合索引：列顺序很重要（先 student_id 再 course_id）
CREATE INDEX idx_enrollments_student_course ON school.enrollments(student_id, course_id);

CREATE UNIQUE INDEX idx_students_no ON school.students(student_no);       -- 唯一索引
CREATE INDEX idx_students_name_lower ON school.students (lower(name));    -- 表达式索引
CREATE INDEX idx_events_created ON school.big_events USING brin (created);-- 指定类型

\di school.*                                       -- 查看索引
DROP INDEX school.idx_enrollments_student;         -- 删除索引
```

> **三条重要事实**：① 主键和 UNIQUE 约束**自动**带索引；② **外键不会自动建索引**，要手动建；③ 索引自动维护，让读快、写略慢、占磁盘——**不是越多越好**。

| 索引类型 | 场景 |
|---|---|
| `btree`（默认） | 等值、范围、排序——99% 的场合 |
| `hash` | 只有等值比较（较少手选） |
| `gin` | 数组、JSONB、全文检索（`@>`、`?`） |
| `gist` | 地理/范围类型（PostGIS） |
| `brin` | 超大表 + 物理有序列（时间序列追加表） |

**EXPLAIN / EXPLAIN ANALYZE**

```sql
EXPLAIN SELECT * FROM school.enrollments WHERE student_id = 5;                 -- 只看计划
EXPLAIN ANALYZE SELECT * FROM school.enrollments WHERE student_id = 5;         -- 真执行 + 实际耗时
```

> ⚠️ `EXPLAIN ANALYZE` 会**真的执行**语句——对 UPDATE/DELETE 用它会真改数据！调试时把 UPDATE 换成同条件的 SELECT 再分析。

读法要点：

| 片段 | 含义 |
|---|---|
| `Index Scan using idx_...` | 走了索引（好消息） |
| `Seq Scan on enrollments` | 全表扫描（小表正常，大表警报） |
| `Index Cond: (student_id = 5)` | 索引里实际用的条件 |
| `Filter: ...` | 索引之外还逐行过滤的条件 |
| `Nested Loop` / `Hash Join` | 两表怎么拼 |
| `rows=3`（预估 vs 实际） | **两者差很远说明统计信息过期** |
| `Execution Time: 0.06 ms` | 真实耗时 |

**优化三步循环**：`EXPLAIN ANALYZE` → 找最贵的节点（耗时最长的缩进块）→ 改（加索引 / 改写 SQL）→ 再 `EXPLAIN ANALYZE` 对比。

**索引失效的几种写法**

```sql
WHERE user_no = 500                          -- ✓ 走索引（列裸在等号左边）
WHERE user_no BETWEEN 100 AND 200            -- ✓ 走索引
WHERE created >= now() - interval '7 days'   -- ✓ 走索引

WHERE user_no + 1 = 501                      -- ✗ 列上做运算 → 全表扫
WHERE lower(email) = 'a@b.c'                 -- ✗ 函数包裹（除非建表达式索引）
WHERE user_no::text = '500'                  -- ✗ 隐式类型转换毁索引
WHERE name LIKE '%王'                        -- ✗ 前置 % 的 LIKE 用不了 B-tree
WHERE name LIKE '王%'                        -- ✓ 后置 % 可以
```

**VACUUM / ANALYZE**

```sql
VACUUM school.big_events;          -- 回收空间供表内复用
VACUUM ANALYZE school.big_events;  -- 顺带刷新统计信息
VACUUM FULL school.big_events;     -- 物理重组归还磁盘（锁全表，维护窗口才用）
ANALYZE school.big_events;         -- 只刷新统计信息（大批量导入后手动跑）
```

**其他优化要点**：只取需要的列（`SELECT *` 是性能杀手）；深分页改 keyset（`WHERE id > 上页末尾id LIMIT 20`）；批量插入用多值 INSERT 或 `COPY`；`generate_series(1, 100000)` 可一次造 10 万行测试数据。

→ 详见 [第 13 章](第13章_索引与EXPLAIN.md)

---

## 11. 备份与恢复（第 14 章）

**三个工具的分工**

| 工具 | 备什么 | 格式 | 场景 |
|---|---|---|---|
| `pg_dump` | **单个数据库** | SQL 文本 / 自定义 / 目录 | 日常备份、迁移 |
| `pg_dumpall` | **整个集群**（全部库 + 角色、表空间） | SQL 文本 | 服务器整体搬迁 |
| `pg_basebackup` | 物理全量 + WAL | 二进制 | 建从库、PITR（进阶） |

> ⚠️ `pg_dump` **不含角色和密码**（角色是集群级对象）。新服务器恢复后连不上，用 `pg_dumpall --globals-only` 补角色。

**pg_dump：两种格式**

```bash
# ① SQL 文本格式（可读、通用）
pg_dump -h localhost -U student_pg -d beginner_pg -f backup.sql

# 只备份单张表
pg_dump -h localhost -U student_pg -d beginner_pg -t school.students -f students.sql

# ② 自定义格式（压缩、可选择性恢复，推荐）
pg_dump -h localhost -U student_pg -d beginner_pg -Fc -f backup.dump

# 全集群含角色（服务器搬迁）
pg_dumpall -h localhost -U postgres -f all.sql
```

**恢复到 SQL 文本备份**（备份里不含 `CREATE DATABASE`，目标库要先建）

```bash
psql -h localhost -U student_pg -d postgres -c "CREATE DATABASE restore_test OWNER student_pg;"
psql -h localhost -U student_pg -d restore_test -f backup.sql
```

**pg_restore**

```bash
pg_restore --list backup.dump                              # 查看备份内容清单（带编号）
pg_restore -h localhost -U student_pg -d restore_test2 backup.dump

# 常用选项（一行含义）
#   -d 目标库        恢复到哪个库（库要先存在）
#   -j 4             4 个并行任务恢复（大库提速明显）
#   -t students      只恢复这一张表（可多次指定）
#   --data-only      只恢复数据，不建结构
#   --schema-only    只恢复结构（复制表结构的快捷方式）
#   -c               恢复前先 DROP 已有对象（⚠️ 危险，看清再按）
```

**两种格式怎么选**

| | SQL 文本 | 自定义（`-Fc`） |
|---|---|---|
| 可读性 | ✅ `cat` 直接看 | ❌ 二进制 |
| 恢复工具 | 任何 psql | 只能 pg_restore |
| 压缩 | 需外挂 gzip | ✅ 内置（约文本的 1/3） |
| 并行恢复 | ❌ | ✅ `-j N` |
| 选择性恢复 | ❌ | ✅ 只恢复某些表 |

**定时备份（cron + 日期文件名）**

```bash
# ~/pg_backup.sh（chmod +x 后可手动跑一次验证）
#!/bin/bash
set -euo pipefail
BACKUP_DIR="$HOME/pg_backups"
STAMP=$(date +%Y%m%d_%H%M)
mkdir -p "$BACKUP_DIR"
pg_dump -h localhost -U student_pg -d beginner_pg -Fc -f "$BACKUP_DIR/beginner_pg_$STAMP.dump"
find "$BACKUP_DIR" -name "beginner_pg_*.dump" -mtime +14 -delete   # 删 14 天前旧备份

# crontab -e 加入（每天凌晨 2:30）
30 2 * * * /home/me/pg_backup.sh >> /home/me/pg_backup.log 2>&1
```

> `pg_dump` 客户端版本要 **≥ 服务器版本**（16 的客户端备 14 的库可以，反过来报 `server version mismatch`）。
> 备份账号需对全库对象有读权限（`GRANT SELECT ON ALL TABLES`）。
> 备份三问（每季度自检）：**能不能恢复？恢复要多快？备份在另一台机器上吗？**

→ 详见 [第 14 章](第14章_备份与恢复.md)

---

## 12. 权限（第 15 章）

**两级权限，顺序不能乱**

```text
第一层：能不能连？ ── pg_hba.conf + 角色的 LOGIN 属性 + 数据库的 CONNECT 权限
第二层：进来能干什么？── 对 schema 的 USAGE + 对表/函数等的 SELECT/INSERT/UPDATE/...
```

> **铁律**：访问 `school.students` 需要（1）模式 `school` 的 **`USAGE`** **加上**（2）表 `students` 的 **`SELECT`**，缺一个都 `permission denied`。

**权限一览**

| 对象 | 可用权限 |
|---|---|
| 表 | `SELECT` / `INSERT` / `UPDATE` / `DELETE` / `TRUNCATE` / `REFERENCES` / `TRIGGER` / `ALL` |
| 模式 | `USAGE`（能"路过"）/ `CREATE`（能在里面建对象） |
| 数据库 | `CONNECT` / `CREATE`（建 schema）/ `TEMPORARY` |

**GRANT / REVOKE 常用写法**

```sql
-- 只读账号四步（缺一不可）
CREATE ROLE ta_reader LOGIN PASSWORD 'ta_reader_2024';
GRANT CONNECT ON DATABASE beginner_pg TO ta_reader;              -- 允许进库
GRANT USAGE ON SCHEMA school TO ta_reader;                       -- 允许使用模式（最常漏）
GRANT SELECT ON ALL TABLES IN SCHEMA school TO ta_reader;        -- 模式内全部现存表

-- 第五步（新手 100% 遗漏）：默认权限，管"将来新建的表"
ALTER DEFAULT PRIVILEGES FOR ROLE student_pg IN SCHEMA school
    GRANT SELECT ON TABLES TO ta_reader;

-- 回收
REVOKE SELECT ON ALL TABLES IN SCHEMA school FROM ta_reader;
REVOKE CONNECT ON DATABASE beginner_pg FROM PUBLIC;   -- 全体角色禁止连此库（收紧私库）

-- 函数权限（第 16 章：只能走函数改成绩）
GRANT EXECUTE ON FUNCTION school2.fn_set_score(varchar, varchar, numeric) TO teacher_grp;
```

**角色当"组"用（团队管理正解）**

```sql
CREATE ROLE readonly_group NOLOGIN;              -- 组：不能登录，只是权限容器
GRANT USAGE ON SCHEMA school TO readonly_group;
GRANT SELECT ON ALL TABLES IN SCHEMA school TO readonly_group;
ALTER DEFAULT PRIVILEGES FOR ROLE student_pg IN SCHEMA school
    GRANT SELECT ON TABLES TO readonly_group;

CREATE ROLE alice LOGIN PASSWORD '...';
GRANT readonly_group TO alice;                   -- 新成员 = 建号 + 入组，权限一处生效
```

**查看权限的三种途径**

```sql
\du                       -- 角色与成员关系
\dp school.*              -- 模式内对象的权限表
\l+                       -- 各库的 CONNECT 权限

SELECT grantee, table_name, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'school' AND table_name = 'students';

SELECT has_table_privilege('ta_reader', 'school.students', 'SELECT');   -- true / false
```

> `\dp` 速读：`=r/owner` 表示 PUBLIC 只读；`student_pg=arwdDxt/student_pg` 中每个字母一种权限（a=insert, r=select, w=update, d=delete…）。

**pg_hba.conf（`/etc/postgresql/16/main/pg_hba.conf`，自上而下首条匹配即生效）**

```text
# TYPE  DATABASE      USER         ADDRESS          METHOD
local   all           postgres                      peer            ← sudo -u postgres 的原理
host    beginner_pg   student_pg   127.0.0.1/32     scram-sha-256   ← SSH 隧道走的就是这条
host    all           all          0.0.0.0/0        reject          ← 兜底拒绝
```

| 认证方式 | 安全性 | 说明 |
|---|---|---|
| `scram-sha-256` | ✅ 推荐 | 密码加盐哈希（PG 14+ 默认） |
| `md5` | 过时 | 新系统别用 |
| `peer` | 仅本机 | 校验系统用户名=数据库用户名（只支持 local） |
| `trust` | ☠️ | **免密**，绝不允许出现在生产网 |
| `cert` | 最强 | 客户端证书认证 |

```bash
sudo pg_ctlcluster 16 main reload     # 改完 pg_hba.conf 必须 reload 生效
# 排错：FATAL: no pg_hba.conf entry = 来源不在任何一条允许规则里
```

**SQL 注入防御**

```python
# ✗ 危险：拼字符串
sql = f"SELECT * FROM school.students WHERE student_no = '{user_input}'"
# ✓ 正确：参数化查询，占位符的值永远不会被当作 SQL 执行
cur.execute("SELECT * FROM school.students WHERE student_no = %s", (user_input,))
```

```bash
# psql 脚本安全用变量（别拼字符串）
psql -v target='S2023001' -f query.sql
# 脚本里写 WHERE student_no = :'target'
```

→ 详见 [第 15 章](第15章_用户权限与安全.md)

---

## 13. 危险操作清单（每条都配"执行前必做"）

| 危险操作 | 后果 | 执行前必做 |
|---|---|---|
| `UPDATE 表 SET ...;` **不带 WHERE** | 全表每行被改，`UPDATE 15` 就是事故现场 | 先用**同条件 `SELECT *`** 预览命中行；再用 `BEGIN; ... ROLLBACK/COMMIT;` 包裹 |
| `DELETE FROM 表;` **不带 WHERE** | 全表数据清空，不可撤销 | 同上；并确认外键 `ON DELETE CASCADE` 会连带删掉哪些子表数据 |
| `DROP DATABASE 库名;` | 整库瞬间消失，**不进回收站** | 确认名字没拼错；确认**当前没连**在这个库上；先做一次 `pg_dump` 备份 |
| `DROP TABLE 表名;` | 表结构 + 全部数据一起没 | 确认外键引用关系；先 `pg_dump -t 表名` 单表备份 |
| `DROP SCHEMA 模式名 CASCADE;` | 模式内**所有**表一起删 | 先 `\dt 模式.*` 列出将被删的表；脚本里用它等于"清空重建" |
| `TRUNCATE TABLE 表名;` | 秒清全部数据（且重置自增），无 WHERE 可补救 | 确认这就是你要的；重要表先 `pg_dump` |
| `DROP ROLE 角色名;` | 角色消失，权限全失效 | 角色必须**先没有任何对象和权限**，否则报 `cannot be dropped because some objects depend on it`；练习环境先 `DROP DATABASE` 它名下的库，生产用 `REASSIGN OWNED` |
| `REVOKE CONNECT ON DATABASE 库 FROM PUBLIC;` | 所有非授权角色（含你自己）都可能连不上 | 先确认自己用的是超级管理员或已显式 GRANT CONNECT 的账号 |
| `pg_restore -c` | 恢复前先 **DROP 已有对象**，把目标库现有数据抹掉 | 确认 `-d` 指向的是**测试库**而不是生产库；先 `pg_restore --list` 看清单 |
| `EXPLAIN ANALYZE UPDATE/DELETE ...` | 会**真的执行**，真改数据 | 把语句换成同条件的 `SELECT` 再 ANALYZE |
| `DROP DATABASE` / `DROP TABLE` 后手抖想复盘 | 数据库层**没有回收站** | 备份先行（[第 14 章](第14章_备份与恢复.md)），并把恢复演练做过一遍 |
| `pg_hba.conf` 里写 `trust` / `0.0.0.0/0` | 任何能连上端口的人直接进库 | 用 `scram-sha-256`；来源 IP 精确到 `/32`；末尾加 `reject` 兜底 |
| `sudo rm -rf /var/lib/postgresql/16` / `apt purge postgresql-16` | 数据目录与配置一起被删，**毁灭** | 执行前默念一遍路径，确认没有多余空格；先确认备份已异地存好 |

> **三层防御（从[第 0 章](第00章_学习准备.md)起就承诺的三招）**：① 先 `SELECT` 再改；② 用事务包裹（`BEGIN` → 操作 → 确认 → `COMMIT`/`ROLLBACK`）；③ 备份先行。
> **练习零风险**：本教程所有操作都在 `beginner_pg` 练习库中；改乱了随时运行 `scripts/03_reset_school.sql` 一键恢复。

→ 详见 [第 0 章](第00章_学习准备.md)、[第 5 章](第05章_建表_数据类型与约束.md)、[第 6 章](第06章_数据的增删改.md)、[第 12 章](第12章_事务.md)、[第 14 章](第14章_备份与恢复.md)
