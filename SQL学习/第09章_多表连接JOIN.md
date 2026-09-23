# 第 9 章 多表连接：JOIN

> [📖 返回目录](README.md) · ⬅️ [上一章：第 8 章 聚合与分组](第08章_聚合与分组.md) · ➡️ [下一章：第 10 章 处理 NULL、日期、字符串与数值](第10章_NULL与常用函数.md)
>
> **前置知识**：[第 5 章 建表](第05章_建表_数据类型与约束.md)、[第 7 章 查询基础](第07章_查询基础.md) · **速查**：[附录 C SQL 速查表](附录C_SQL速查表.md) · **报错**：[附录 B 错误信息速查](附录B_错误信息速查.md)

数据被规范地拆在五张表里（第 1、5 章），JOIN 负责把它们"拼"回来。**JOIN 是 SQL 精通与否的分水岭**，请放慢速度。

## 9.1 为什么需要 JOIN

"王小明选了哪些课、各多少分？"——enrollments 里只有 student_id=1、course_id=1 这样的编号，姓名和课程名分别在另外两张表。JOIN 沿着外键把三张表按编号对上：

```sql
SELECT s.name AS 学生, c.course_name AS 课程, e.score AS 成绩
FROM school.students AS s
JOIN school.enrollments AS e ON e.student_id = s.student_id
JOIN school.courses    AS c ON c.course_id  = e.course_id
WHERE s.name = '王小明';
```

要点：

- `FROM 表A JOIN 表B ON 连接条件`——ON 说明"哪一列对哪一列"；
- **表别名**（`AS s`）是多表查询的标配，列名冲突（两张表都有 `student_id`）时必须用 `s.student_id` 消歧；
- 连续 JOIN：先 students ⋈ enrollments 得到大结果，再 ⋈ courses。理论上可以一直连下去。

## 9.2 一定要懂的 mental model：JOIN 是"乘法再筛选"

`A JOIN B ON 条件` 的过程可以想象为：对 A 的每一行，去 B 里找满足条件的所有行配对。**配不上的行怎么办？**——这正是不同 JOIN 类型的分野。

用两张小表做实验（在 psql 里跟做）：

```sql
-- 有学生的城市集合 vs 有教师的学院……不如直接造两张玩具表：
CREATE TABLE tmp_a (id int, val text);
CREATE TABLE tmp_b (id int, val text);
INSERT INTO tmp_a VALUES (1,'a1'), (2,'a2'), (3,'a3');
INSERT INTO tmp_b VALUES (2,'b2'), (3,'b3'), (4,'b4');
-- a 有 1,2,3；b 有 2,3,4；公共的是 2,3
```

### INNER JOIN（默认）：只留配上的

```sql
SELECT a.id, a.val, b.id, b.val
FROM tmp_a a JOIN tmp_b b ON a.id = b.id;      -- JOIN = INNER JOIN
```

```text
 id | val | id | val
----+-----+----+-----
  2 | a2  |  2 | b2
  3 | a3  |  3 | b3
```

1 只在 a 有、4 只在 b 有——都消失。

### LEFT JOIN：左表全保留，配上不上的右边补 NULL

```sql
SELECT a.id, a.val, b.id, b.val
FROM tmp_a a LEFT JOIN tmp_b b ON a.id = b.id;
```

```text
 id | val | id  | val
----+-----+-----+-----
  1 | a1  |     |            ← b 侧没有匹配，补 NULL
  2 | a2  |   2 | b2
  3 | a3  |   3 | b3
```

### RIGHT JOIN 与 FULL JOIN

- `RIGHT JOIN`：右表全保留（与 LEFT 对称，实践中少用，习惯性改成 LEFT 写）；
- `FULL JOIN`：两边都全保留，各自配不上的都补 NULL（1、2、3、4 全出现）。

### 速记图（集合直觉）

```text
INNER：   交集（2,3）            A ∩ B
LEFT：    左整圆（1,2,3）        A
RIGHT：   右整圆（2,3,4）        B
FULL：    并集（1,2,3,4）        A ∪ B
```

练完删掉玩具表：

```sql
DROP TABLE tmp_a; DROP TABLE tmp_b;
```

## 9.3 LEFT JOIN 的灵魂用法：找"没有"的行

"**没有选任何课的学生**"是 LEFT JOIN 最重要的应用模式：

```sql
SELECT s.student_no, s.name
FROM school.students s
LEFT JOIN school.enrollments e ON e.student_id = s.student_id
WHERE e.student_id IS NULL;
```

原理：LEFT JOIN 保住每个学生，没选课的学生那行的 `e.*` 全是 NULL，再用 `IS NULL` 把这些行挑出来。换 NOT EXISTS 也可以（[第 11 章](第11章_子查询_CTE与窗口函数.md)），两种都要求会。

同理："没有学生选的课"：

```sql
SELECT c.course_name
FROM school.courses c
LEFT JOIN school.enrollments e ON e.course_id = c.course_id
WHERE e.course_id IS NULL;
```

> ⚠️ `WHERE e.student_id IS NULL` 与 `ON ... AND` 不等价：写到 ON 里的条件只影响**匹配**，不会过滤左表行。ON 放连接条件，WHERE 放业务过滤——初学阶段严格遵守这个分工。

## 9.4 表连接自己：自连接

"每位教师与其同院系的其他教师"——一张表当两张用：

```sql
SELECT t1.name AS 教师, t2.name AS 同院系同事
FROM school.teachers t1
JOIN school.teachers t2
  ON t1.dept_id = t2.dept_id AND t1.teacher_id <> t2.teacher_id
ORDER BY t1.dept_id;
```

自连接的经典场景：组织架构（查上下级）、好友关系、同城用户……凡是"表内行与行有关系"都用它。

## 9.5 三表以上与"链式外键"

[第 5 章](第05章_建表_数据类型与约束.md)的关系链这时全用上了——"成绩单"是四表 JOIN：

```sql
SELECT s.student_no      AS 学号,
       s.name            AS 学生,
       c.course_name     AS 课程,
       t.name            AS 教师,
       d.dept_name       -- 选修课程的开课院系
FROM school.enrollments e
JOIN school.students   s ON s.student_id  = e.student_id
JOIN school.courses    c ON c.course_id   = e.course_id
LEFT JOIN school.teachers t ON t.teacher_id = c.teacher_id   -- 可能暂无教师 → LEFT
LEFT JOIN school.departments d ON d.dept_id = t.dept_id
ORDER BY s.student_no, c.course_name;
```

设计选择显式化为 JOIN 选择：**teachers 那层为什么用 LEFT？** 因为课程可能 teacher_id 为 NULL（ON DELETE SET NULL）——用 INNER 会丢掉这些课程。

## 9.6 JOIN × GROUP BY：分组分析的标准形态

[第 8 章](第08章_聚合与分组.md)已经预热，再看两例（后续练习主角）：

```sql
-- 每位学生的平均分与选课数（只统计有成绩的课）
SELECT s.name,
       COUNT(e.score)          AS 已考门数,
       ROUND(AVG(e.score), 1)  AS 平均分
FROM school.students s
JOIN school.enrollments e ON e.student_id = s.student_id
GROUP BY s.name
ORDER BY 平均分 DESC;
```

```sql
-- 各院系教师开设的课程数与总学分
SELECT d.dept_name, COUNT(c.course_id) AS 课程数, SUM(c.credit) AS 总学分
FROM school.departments d
LEFT JOIN school.teachers t ON t.dept_id = d.dept_id      -- 院系全保留
LEFT JOIN school.courses  c ON c.teacher_id = t.teacher_id
GROUP BY d.dept_name
ORDER BY 总学分 DESC NULLS LAST;
```

## 9.7 多表行数爆炸：笛卡尔积警告

JOIN **忘了写 ON** 会怎样？

```sql
SELECT COUNT(*) FROM school.students CROSS JOIN school.courses;
-- 15 × 8 = 120 行：每个学生与每门课都配了一遍（笛卡尔积）
```

所有行两两配对。`CROSS JOIN` 偶有用途（生成组合），但 99% 的场景是**忘写 ON 的 bug**：两张千行表的笛卡尔积 = 一百万行。看到结果行数异常膨胀，先检查 ON。

## 9.8 UNION：上下拼接（JOIN 的对照组）

JOIN 是**左右拼列**，UNION 是**上下拼行**：

```sql
SELECT name, '学生' AS 身份 FROM school.students WHERE city = '北京'
UNION
SELECT name, '教师' FROM school.teachers
ORDER BY name;
```

规则：两个 SELECT 的**列数和对应类型必须一致**；`UNION` 去重、`UNION ALL` 保留全部（不去重，更快，能用 ALL 就用 ALL）。

## 本章小结

- JOIN 沿外键拼表：`FROM a JOIN b ON a.键 = b.键`，多表连写、别名消歧；
- 四种类型：INNER 只留交集、LEFT 保左表、RIGHT 保右表、FULL 全保留；配不上的补 NULL；
- **LEFT JOIN + IS NULL = 找"没有"**（没选课的学生/没人选的课）；
- 自连接让一张表内部互查；链式外键四表查成绩单；
- JOIN 与 GROUP BY 组合是分组分析的标准形态；
- 忘写 ON = 笛卡尔积爆炸；UNION 上下拼行要求列结构一致，默认去重。

练习：[scripts/练习_09_多表连接.sql](scripts/练习_09_多表连接.sql)。

---

> [📖 返回目录](README.md) · ⬅️ [上一章：第 8 章 聚合与分组](第08章_聚合与分组.md) · ➡️ [下一章：第 10 章 处理 NULL、日期、字符串与数值](第10章_NULL与常用函数.md)
