# 第 11 章 子查询、CTE 与窗口函数

> [📖 返回目录](README.md) · ⬅️ [上一章：第 10 章 处理 NULL、日期、字符串与数值](第10章_NULL与常用函数.md) · ➡️ [下一章：第 12 章 事务](第12章_事务.md)
>
> **前置知识**：[第 7 章 查询基础](第07章_查询基础.md)、[第 8 章 聚合与分组](第08章_聚合与分组.md)、[第 9 章 多表连接](第09章_多表连接JOIN.md) · **速查**：[附录 C SQL 速查表](附录C_SQL速查表.md) · **报错**：[附录 B 错误信息速查](附录B_错误信息速查.md)

本章三块内容层层递进：子查询是"查询里的查询"；CTE 给复杂查询命名分层；窗口函数是 SQL 高手的分水岭——"分组统计但保留每一行"。

## 11.1 子查询的三种位置

### ① WHERE 里：当作一个"值"用（标量子查询）

```sql
-- 出生最早（年纪最大）的学生是谁？
SELECT name, birth_date FROM school.students
WHERE birth_date = (SELECT MIN(birth_date) FROM school.students);
```

子查询必须**只返回一行一列**才能当"值"用，否则报 `more than one row returned by a subquery`。

### ② WHERE 里：当作一个"集合"用

```sql
-- 选了"数据库原理"的所有学生
SELECT s.name FROM school.students s
JOIN school.enrollments e ON e.student_id = s.student_id
WHERE e.course_id = (SELECT course_id FROM school.courses
                     WHERE course_name = '数据库原理');
```

集合运算符：`IN (子查询)`、`NOT IN (子查询)`、`EXISTS (子查询)`、`ANY/SOME`、`ALL`。

**NOT IN 的 NULL 大坑（[第 10 章](第10章_NULL与常用函数.md)伏笔回收）**：

```sql
-- 想找"没选数据库原理的学生"，这样写有隐患：
SELECT name FROM school.students
WHERE student_id NOT IN (SELECT student_id FROM school.enrollments
                         WHERE course_id = 1);
-- 若子查询结果里出现一个 NULL，NOT IN 的判断全变 NULL → 查询一行都返回！
-- 子查询列允许 NULL 时（student_id 这里非空所以侥幸没事），必须换 NOT EXISTS：
SELECT s.name FROM school.students s
WHERE NOT EXISTS (SELECT 1 FROM school.enrollments e
                  WHERE e.student_id = s.student_id AND e.course_id = 1);
```

**IN vs EXISTS 的选择**：日常两者皆可；涉及 NULL 风险或大表关联时，`EXISTS`（半连接，找到一行即停）更安全高效。

### ③ FROM 里：当作一张"临时表"用（派生表）

```sql
-- 选课人数 >= 5 的课程的平均分（聚合结果再被外层查询使用）
SELECT t.course_name, t.avg_score
FROM (SELECT c.course_name, ROUND(AVG(e.score), 1) AS avg_score
      FROM school.courses c
      JOIN school.enrollments e ON e.course_id = c.course_id
      GROUP BY c.course_name) AS t          -- 派生表必须有别名 t
WHERE t.avg_score >= 75;
```

这其实等价于[第 8 章](第08章_聚合与分组.md)的 `GROUP BY + HAVING`——很多问题子查询和 HAVING 都能解，会两种才能读别人的代码。

## 11.2 相关子查询：内层引用外层的列

```sql
-- 每门课的选课人数（不 JOIN 也能写）
SELECT c.course_name,
       (SELECT COUNT(*) FROM school.enrollments e
        WHERE e.course_id = c.course_id) AS 选课人数
FROM school.courses c
ORDER BY 选课人数 DESC;
```

外层每扫一行课程，内层就"带着这个 course_id"去数一遍——像循环。数据量大时性能不如 GROUP BY JOIN，但表达"每行旁边挂一个聚合值"很直观。

## 11.3 CTE：WITH 子句，复杂查询的分而治之

**CTE（Common Table Expression，公用表表达式）= 只在本次查询中存在的临时命名结果集。**

上面派生表的例子用 CTE 重写——先分步、后组装，逻辑瞬间清晰：

```sql
WITH course_avg AS (                       -- 第 1 步：算每门课平均分
    SELECT c.course_name, ROUND(AVG(e.score), 1) AS avg_score
    FROM school.courses c
    JOIN school.enrollments e ON e.course_id = c.course_id
    GROUP BY c.course_name
)
SELECT * FROM course_avg                    -- 第 2 步：像用普通表一样用它
WHERE avg_score >= 75
ORDER BY avg_score DESC;
```

**可以连续定义多个 CTE，后面的引用前面的**（链式，最像写程序的地方）：

```sql
WITH student_avg AS (
    SELECT s.student_id, s.name, AVG(e.score) AS avg_score
    FROM school.students s
    JOIN school.enrollments e ON e.student_id = s.student_id
    GROUP BY s.student_id, s.name
),
top3 AS (
    SELECT * FROM student_avg ORDER BY avg_score DESC LIMIT 3
)
SELECT t.name, t.avg_score,
       (SELECT COUNT(*) FROM student_avg a WHERE a.avg_score > t.avg_score) AS 排在他前面的人数
FROM top3 t;
```

**递归 CTE（了解即可，面试常问）**——生成 1 到 5 的数列：

```sql
WITH RECURSIVE nums AS (
    SELECT 1 AS n                 -- 起点
    UNION ALL
    SELECT n + 1 FROM nums WHERE n < 5    -- 递归引用自己
)
SELECT * FROM nums;               -- 1,2,3,4,5
```

> 建议：**凡是三层以上嵌套的子查询，一律重写成 CTE**。`WITH` 的本质是给人读的——数据库优化器（PG 12+）会把 CTE 内联，性能不吃亏。

## 11.4 窗口函数：分组统计但不折叠行

### 老问题的精确表达

"**每个**学生**各自**的平均分，并且**每个学生每一行**都显示这个平均分"——GROUP BY 做不到（每组只剩一行），相关子查询能做但难看。窗口函数一招解决：

```sql
SELECT s.name, c.course_name, e.score,
       ROUND(AVG(e.score) OVER (PARTITION BY s.student_id), 1) AS 本人平均分
FROM school.enrollments e
JOIN school.students s ON s.student_id = e.student_id
JOIN school.courses  c ON c.course_id  = e.course_id;
```

语法拆解：

```sql
聚合函数(...) OVER (
    PARTITION BY 分组键     -- 按"谁"分窗口（可省略=全表一个窗口）
    ORDER BY 排序键         -- 窗口内按什么排序（对 rank/累计值必需）
    [ROWS BETWEEN ...]      -- 帧定义：窗口里再用行范围切一刀（进阶）
)
```

**与 GROUP BY 的本质区别**：GROUP BY 把 15 行折叠成 3 行；窗口函数保留全部 15 行，只是**在每行旁边**附加计算结果。

### 排名三兄弟：ROW_NUMBER / RANK / DENSE_RANK

"每门课内部按成绩排名"（组内 Top N 问题的钥匙）：

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

同分时的差异（假设两人并列第 2）：

| 函数 | 下一行的值 | 特点 |
|---|---|---|
| `ROW_NUMBER()` | 4 | 无情递增，绝不并列（1,2,3,4） |
| `RANK()` | 4 | 并列同名次，跳过后续（1,2,2,4） |
| `DENSE_RANK()` | 3 | 并列同名次，不跳（1,2,2,3） |

**组内 Top N 的标准模板**（子查询 + ROW_NUMBER，必背）：

```sql
-- 每门课成绩最高的 2 条记录
WITH ranked AS (
    SELECT c.course_name, s.name, e.score,
           ROW_NUMBER() OVER (PARTITION BY c.course_id ORDER BY e.score DESC) AS rn
    FROM school.enrollments e
    JOIN school.students s ON s.student_id = e.student_id
    JOIN school.courses  c ON c.course_id  = e.course_id
)
SELECT course_name, name, score
FROM ranked
WHERE rn <= 2;               -- 窗口函数不能直接进 WHERE，必须再包一层
```

> **铁律**：窗口函数**只能出现在 SELECT 和 ORDER BY** 里，不能进 WHERE/GROUP BY/HAVING——因为它们在行过滤之后才计算。要按窗口结果过滤，就得像上面这样套一层。

### 组内累计与偏移：SUM OVER / LAG / LEAD

```sql
-- 每门课内按分数从高到低"累计"有多少人次；以及每人与前一名的差距
SELECT c.course_name, s.name, e.score,
       SUM(e.score)  OVER (PARTITION BY c.course_id ORDER BY e.score DESC) AS 累计分数,
       LAG(e.score)  OVER (PARTITION BY c.course_id ORDER BY e.score DESC) AS 前一名分数,
       e.score - LAG(e.score) OVER (PARTITION BY c.course_id ORDER BY e.score DESC) AS 与前一名差
FROM school.enrollments e
JOIN school.students s ON s.student_id = e.student_id
JOIN school.courses  c ON c.course_id  = e.course_id
ORDER BY c.course_name, e.score DESC;
```

- `SUM(...) OVER (PARTITION BY ... ORDER BY ...)` = 组内**累计**（跑动总和，不加 ORDER BY 则是组内总和）；
- `LAG(列)` 取"排序后前一行"的值、`LEAD(列)` 取后一行——算环比、算名次差的标准工具；首行取不到前一行，结果为 NULL（可 `LAG(列, 1, 默认值)` 指定兜底）。

### 常用窗口函数一览

| 函数 | 作用 |
|---|---|
| `ROW_NUMBER()` / `RANK()` / `DENSE_RANK()` | 组内编号/排名 |
| `NTILE(n)` | 组内切成 n 段（四分位：`NTILE(4)`） |
| `SUM/AVG/COUNT/MAX/MIN() OVER` | 组内聚合，不折叠行 |
| `LAG(列, 偏移, 默认)` / `LEAD(...)` | 前一行/后一行 |
| `FIRST_VALUE(列)` / `LAST_VALUE(列)` | 窗口内第一个/最后一个值 |
| `NTH_VALUE(列, n)` | 窗口内第 n 个值 |

## 11.5 EXISTS 再看一眼：存在性检查的利器

```sql
-- 至少有一门课不及格的学生（EXISTS 版）
SELECT s.name FROM school.students s
WHERE EXISTS (SELECT 1 FROM school.enrollments e
              WHERE e.student_id = s.student_id AND e.score < 60);
```

`SELECT 1` 是惯例——EXISTS 只关心"有没有行"，不关心选什么。找到第一行即短路返回，比 `IN (大子查询)` 更适合大表。

## 本章小结

- 子查询三种位置：标量值（单行单列）、集合（IN/EXISTS/ANY）、临时表（FROM 里，要别名）；
- `NOT IN` 遇 NULL 全空 → 用 `NOT EXISTS`；`EXISTS` 找到即停，语义就是"存在性"；
- CTE（WITH）把复杂查询拆成命名步骤，可链式、可递归，优于三层嵌套；
- 窗口函数 = `函数 OVER (PARTITION BY ... ORDER BY ...)`，**分组统计但不折叠行**；
- 排名三兄弟的并列差异；组内 Top N = `ROW_NUMBER + 外层 WHERE rn <= N`；
- 窗口函数只能出现在 SELECT/ORDER BY；LAG/LEAD 处理前后行。

练习：[scripts/练习_11_子查询CTE窗口.sql](scripts/练习_11_子查询CTE窗口.sql)。

---

> [📖 返回目录](README.md) · ⬅️ [上一章：第 10 章 处理 NULL、日期、字符串与数值](第10章_NULL与常用函数.md) · ➡️ [下一章：第 12 章 事务](第12章_事务.md)
