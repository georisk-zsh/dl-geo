# 第 10 章 处理 NULL、日期、字符串与数值

> [📖 返回目录](README.md) · ⬅️ [上一章：第 9 章 多表连接](第09章_多表连接JOIN.md) · ➡️ [下一章：第 11 章 子查询、CTE 与窗口函数](第11章_子查询_CTE与窗口函数.md)
>
> **前置知识**：[第 7 章 查询基础](第07章_查询基础.md) · **速查**：[附录 C SQL 速查表](附录C_SQL速查表.md) · **报错**：[附录 B 错误信息速查](附录B_错误信息速查.md)

真实数据永远有缺失（未考试的 score、未填的 city）、有日期计算、有脏字符串。本章是"数据清洗工具箱"。

## 10.1 NULL 深入：三值逻辑

**NULL 不是 0、不是空字符串 `''`、也不是"没有值"——它的语义是"未知"（unknown）。**

三张对比实验（在 psql 里跑，建立直觉）：

```sql
SELECT NULL = NULL;      -- 结果：NULL（两个"未知"相等吗？不知道！）
SELECT NULL <> 1;        -- 结果：NULL（未知的东西不等于 1 吗？也不知道）
SELECT NULL IS NULL;     -- 结果：true（判断"是不是未知"是可以的）
```

WHERE 的规则：**只有条件为 true 的行被保留，false 和 NULL 都被丢弃。**这带来两个新手必踩的坑：

**坑一：`<>` 会漏掉 NULL 行**

```sql
-- 想找"非北京的学生的"：
SELECT name, city FROM school.students WHERE city <> '北京';
-- city 为 NULL 的学生【不出现】！因为 NULL <> '北京' 的结果是 NULL，不是 true
-- 修正：
SELECT name, city FROM school.students
WHERE city <> '北京' OR city IS NULL;
```

**坑二：NOT IN 遇上子查询含 NULL 会全军覆没**（[第 11 章](第11章_子查询_CTE与窗口函数.md)子查询处再演示，先记结论：子查询可能返回 NULL 时用 NOT EXISTS）。

## 10.2 NULL 的工具函数

### COALESCE：第一个非空值（万金油）

```sql
SELECT name, COALESCE(city, '未填写') AS 城市 FROM school.students;

SELECT c.course_name,
       COALESCE(ROUND(AVG(e.score), 1), 0) AS 平均分   -- 空课程平均分显示 0 而非 NULL
FROM school.courses c
LEFT JOIN school.enrollments e ON e.course_id = c.course_id
GROUP BY c.course_name;
```

### NULLIF：两值相等则返回 NULL（防除零、去默认值）

```sql
SELECT NULLIF(city, '北京') FROM school.students;   -- 北京 → NULL，其他原样

SELECT 100.0 * SUM(score) / NULLIF(SUM(CASE WHEN score IS NOT NULL THEN 1 END), 0)
FROM school.enrollments;    -- 分母为 0 时整体返回 NULL 而不报"除数为零"
```

### 空字符串 ≠ NULL

```sql
SELECT '' IS NULL;        -- false！空字符串是"已知：内容为空"，NULL 是"未知"
SELECT length('');        -- 0
SELECT length(NULL);      -- NULL
```

导入数据时"看起来空白"的格子可能是 `''`、可能是 NULL、甚至可能是 `' '`（一个空格）——清洗时三种都要想到：

```sql
SELECT name FROM school.students
WHERE city IS NULL OR trim(city) = '';
```

## 10.3 日期与时间函数

```sql
SELECT CURRENT_DATE;                          -- 今天（date）
SELECT now();                                 -- 此刻（timestamptz）
SELECT CURRENT_DATE + INTERVAL '7 days';      -- 一周后（date + interval → timestamp）
SELECT age(CURRENT_DATE, DATE '2005-03-12');  -- 年龄："21 years 6 mons 1 day"（随当天日期变化）
SELECT extract(year  FROM birth_date) FROM school.students;   -- 取年
SELECT extract(month FROM birth_date) FROM school.students;   -- 取月
SELECT date_trunc('month', now());            -- 截断到本月月初，如 2026-09-01 00:00:00
```

**日期算术规则表：**

| 运算 | 结果类型 | 例子 |
|---|---|---|
| `date - date` | integer（天数） | `CURRENT_DATE - birth_date` = 已活天数 |
| `date + integer` | date | `'2025-09-01' + 30` |
| `date + interval` | timestamp | `now() + INTERVAL '3 hours'` |
| `interval + interval` | interval | `INTERVAL '1 day' + INTERVAL '2 hours'` |

**按年月统计的标准姿势**（`date_trunc` + GROUP BY，数据分析天天用）：

```sql
SELECT date_trunc('month', e.enrolled_on) AS 选课月份,
       COUNT(*) AS 人次
FROM school.enrollments e
GROUP BY 1                        -- GROUP BY 1 = 按输出第 1 列分组（语法糖，好用）
ORDER BY 1;
```

**格式化输出**：

```sql
SELECT to_char(birth_date, 'YYYY"年"MM"月"DD"日"') FROM school.students;
SELECT to_date('2025-09-01', 'YYYY-MM-DD');      -- 字符串 → 日期
```

> 时区进阶一句话：`timestamptz` 列内部存 UTC，显示随会话时区（`SHOW timezone;`，`SET timezone = 'Asia/Shanghai';`）。跨时区系统永远用 timestamptz。

## 10.4 字符串函数

| 函数 | 作用 | 例子 → 结果 |
|---|---|---|
| `upper` / `lower` | 大小写转换 | `upper('ok')` → `OK` |
| `length` | 字符数 | `length('数据库')` → 3 |
| `trim` / `ltrim` / `rtrim` | 去两端/左/右空白 | `trim('  x ')` → `x` |
| `substring(s, 起, 长)` | 截取（**从 1 开始**） | `substring('S2023001', 2, 4)` → `2023` |
| `replace` | 替换 | `replace('a-b-c','-','/')` → `a/b/c` |
| `||` 或 `concat` | 拼接（concat 会跳过 NULL） | `'a' || NULL` → NULL；`concat('a', NULL)` → `'a'` |
| `left(s, n)` / `right(s, n)` | 取左/右 n 个字符 | `left('S2023001', 1)` → `'S'` |
| `split_part(s, 分隔符, 第几段)` | 切割取段 | `split_part('a,b,c', ',', 2)` → `'b'` |

```sql
-- 学生信息规范化：去首尾空格 + 学号取年级
SELECT trim(name)          AS 姓名,
       substring(student_no, 2, 4) AS 年级,
       upper(student_no)   AS 学号大写
FROM school.students;
```

> **模式匹配进阶**：`LIKE` 之外 PG 还有 POSIX 正则（`~` 匹配、`~*` 不区分大小写）和 `SIMILAR TO`。需要复杂匹配时：`WHERE name ~ '^王[小大]'`。

## 10.5 数值函数与四舍五入

| 函数/写法 | 作用 | 例子 → 结果 |
|---|---|---|
| `round(n, 位数)` | 四舍五入 | `round(3.14159, 2)` → 3.14 |
| `trunc(n, 位数)` | 直接截断 | `trunc(3.99, 1)` → 3.9 |
| `ceil` / `floor` | 向上/向下取整 | `ceil(3.1)` → 4 |
| `abs` | 绝对值 | `abs(-5)` → 5 |
| `::numeric` | 类型转换（PG 语法糖） | `7::numeric / 2` → 3.5 |
| `CAST(x AS 类型)` | 标准 CAST | `CAST('123' AS int)` → 123 |

```sql
SELECT round(AVG(score), 2) FROM school.enrollments;    -- 平均分保留 2 位
SELECT ceil(hours / 16.0)  FROM school.courses;         -- 学时折算成"多少个半天"
```

> `round(3.5)` 对 `numeric` 是"四舍五入"，但 `double precision` 走银行家舍入且结果仍是近似值——**金额/成绩务必先 `::numeric` 再 round**。

## 10.6 CASE WHEN：SQL 的 if-else

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
- CASE 是**表达式**，可以出现在 SELECT、WHERE、ORDER BY、GROUP BY 里：

```sql
-- 按自定义等级排序（优秀在前，不及格垫底）
... ORDER BY CASE WHEN score >= 90 THEN 1
                  WHEN score >= 60 THEN 2
                  ELSE 3 END;
```

- 配合 SUM 就是"条件计数/求和"（[第 8 章](第08章_聚合与分组.md) FILTER 的传统等价写法）：

```sql
SELECT SUM(CASE WHEN score >= 60 THEN 1 ELSE 0 END) AS 及格数 FROM school.enrollments;
```

## 本章小结

- NULL = 未知，参与比较返回 NULL，`WHERE NULL` 的行被丢弃；判断只能 `IS [NOT] NULL`；
- `<>` 会漏 NULL 行、`NOT IN` 遇 NULL 全空——两个经典坑的成因和解法；
- `COALESCE` 给 NULL 兜底，`NULLIF` 制造 NULL（防除零）；空字符串 ≠ NULL；
- 日期三件套：`age()`、`extract()`、`date_trunc()`；按月统计 = `date_trunc + GROUP BY 1`；
- 字符串注意 `substring` 从 1 起、`concat` 会跳过 NULL 而 `||` 不跳；
- 数值先 `::numeric` 再 round；CASE WHEN 是万能分支表达式，能进 ORDER BY 和聚合。

练习：[scripts/练习_10_NULL与函数.sql](scripts/练习_10_NULL与函数.sql)。

---

> [📖 返回目录](README.md) · ⬅️ [上一章：第 9 章 多表连接](第09章_多表连接JOIN.md) · ➡️ [下一章：第 11 章 子查询、CTE 与窗口函数](第11章_子查询_CTE与窗口函数.md)
