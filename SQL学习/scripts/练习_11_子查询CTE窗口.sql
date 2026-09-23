-- ============================================================
-- 《PostgreSQL 从零开始》第 11 章练习：子查询、CTE、窗口函数
--
-- 运行方式：
--   psql -h localhost -U student_pg -d beginner_pg -f scripts/练习_11_子查询CTE窗口.sql
-- ============================================================

\echo '>>> 重置示例数据 ...'
\ir 03_reset_school.sql

-- ============================================================
-- 【题目】
-- ============================================================

-- 练习 1（标量子查询）：查询所有"高于全库平均分"的选课记录。
--          先用一条 SELECT 得到全库平均分（保留 1 位小数），再写主查询。

-- 练习 2（IN）：选出选修了"高等数学(下)"的学生的姓名。

-- 练习 3（NOT EXISTS）：选出【没有】选修"高等数学(下)"的学生姓名。
--          写完对比：如果用 NOT IN 写，结果一样吗？本数据为什么碰巧一样？

-- 练习 4（CTE）：每门课的平均分（只算有成绩的），列出平均分 >= 75 的课程。
--          要求用 WITH ... AS 的 CTE 写法。

-- 练习 5（窗口·排名）：每门课内部按成绩排名（RANK，允许并列），
--          输出 课程、学生、成绩、排名，在读（NULL）记录排除。

-- 练习 6（组内 Top N）：每门课成绩最高的 2 名学生。
--          提示：ROW_NUMBER + 外层 WHERE（窗口函数不能直接进 WHERE）。

-- 练习 7（窗口·累计与偏移）：按课程内成绩从高到低，
--          显示 累计分数（SUM OVER）和 与前一名的差距（LAG）。

-- 练习 8（相关子查询）：选修"数据库原理"且成绩高于【该课平均分】的学生。
--          相关子查询和"JOIN + 派生表"两种写法都要会。

-- 练习 9（综合·排名并列差异）：用一条语句同时显示 RANK 与 DENSE_RANK，
--          找一门有并列成绩的课程观察两者差别；没有并列就自己造一条
--          （UPDATE 某条成绩与另一条相同，对比完再重置）。

-- ============================================================
-- 【参考答案】
-- ============================================================

-- 答案 1：
SELECT ROUND(AVG(score), 1) FROM school.enrollments;   -- ≈ 76.3（先看基准）

SELECT s.name, c.course_name, e.score
FROM school.enrollments e
JOIN school.students s ON s.student_id = e.student_id
JOIN school.courses  c ON c.course_id  = e.course_id
WHERE e.score > (SELECT AVG(score) FROM school.enrollments)
ORDER BY e.score DESC;

-- 答案 2：
SELECT s.name
FROM school.students s
WHERE s.student_id IN (SELECT e.student_id
                       FROM school.enrollments e
                       JOIN school.courses c ON c.course_id = e.course_id
                       WHERE c.course_name = '高等数学(下)');

-- 答案 3：
SELECT s.name
FROM school.students s
WHERE NOT EXISTS (SELECT 1
                  FROM school.enrollments e
                  JOIN school.courses c ON c.course_id = e.course_id
                  WHERE e.student_id = s.student_id
                    AND c.course_name = '高等数学(下)');
-- NOT IN 版结果相同——因为 student_id 是 NOT NULL 的外键列，子查询永远不返回 NULL。
-- 之前第 10/11 章的警告只针对"可能返回 NULL 的列"。
-- 但 NOT EXISTS 永远安全且语义清晰，建议养成默认写它的习惯。

-- 答案 4：
WITH course_avg AS (
    SELECT c.course_name,
           ROUND(AVG(e.score), 1) AS avg_score
    FROM school.courses c
    JOIN school.enrollments e ON e.course_id = c.course_id
    GROUP BY c.course_name
)
SELECT * FROM course_avg
WHERE avg_score >= 75
ORDER BY avg_score DESC;
-- 五门课达标：Python 程序设计 83.8、大学英语(四) 82.2、数据结构 80.0、微观经济学 79.7、数据库原理 77.5

-- 答案 5：
SELECT c.course_name AS 课程, s.name AS 学生, e.score AS 成绩,
       RANK() OVER (PARTITION BY c.course_name ORDER BY e.score DESC) AS 排名
FROM school.enrollments e
JOIN school.students s ON s.student_id = e.student_id
JOIN school.courses  c ON c.course_id  = e.course_id
WHERE e.score IS NOT NULL
ORDER BY c.course_name, 排名;

-- 答案 6：窗口函数不能出现在 WHERE 里 → 套一层
WITH ranked AS (
    SELECT c.course_name AS 课程, s.name AS 学生, e.score AS 成绩,
           ROW_NUMBER() OVER (PARTITION BY c.course_name
                              ORDER BY e.score DESC) AS rn
    FROM school.enrollments e
    JOIN school.students s ON s.student_id = e.student_id
    JOIN school.courses  c ON c.course_id  = e.course_id
)
SELECT 课程, 学生, 成绩
FROM ranked
WHERE rn <= 2
ORDER BY 课程, rn;

-- 答案 7：
SELECT c.course_name AS 课程, s.name AS 学生, e.score AS 成绩,
       SUM(e.score) OVER (PARTITION BY c.course_name
                          ORDER BY e.score DESC)           AS 累计分数,
       e.score - LAG(e.score) OVER (PARTITION BY c.course_name
                                    ORDER BY e.score DESC) AS 与前一名差
FROM school.enrollments e
JOIN school.students s ON s.student_id = e.student_id
JOIN school.courses  c ON c.course_id  = e.course_id
WHERE e.score IS NOT NULL
ORDER BY c.course_name, e.score DESC;
-- 每门课第一名 LAG 取不到前值 → 与前一名差为 NULL（LAG(列,1,默认值) 可指定兜底）
-- 注意：不加 ORDER BY 时 SUM OVER 是"组内总和"，加了才是"逐行累计"——务必亲手对比

-- 答案 8：写法一：相关子查询（先算出该课平均分）
SELECT s.name, e.score
FROM school.enrollments e
JOIN school.students s ON s.student_id = e.student_id
JOIN school.courses  c ON c.course_id  = e.course_id
WHERE c.course_name = '数据库原理'
  AND e.score > (SELECT AVG(e2.score)
                 FROM school.enrollments e2
                 WHERE e2.course_id = c.course_id);
-- 数据库原理平均 77.5 → 高于它的 5 人：王小明 92、李华 88、郑浩 83、冯雪 81、张芳 78

-- 写法二：CTE 先算每课平均，再 JOIN 比较（大表时通常更快）
WITH course_avg AS (
    SELECT course_id, AVG(score) AS avg_score
    FROM school.enrollments
    GROUP BY course_id
)
SELECT s.name, e.score, ROUND(ca.avg_score, 1) AS 该课平均
FROM school.enrollments e
JOIN school.students  s  ON s.student_id  = e.student_id
JOIN school.courses   c  ON c.course_id   = e.course_id
JOIN course_avg       ca ON ca.course_id  = e.course_id
WHERE c.course_name = '数据库原理'
  AND e.score > ca.avg_score;

-- 答案 9：先造一个并列：把冯雪的数据库原理 81 改成 83（与郑浩并列）
UPDATE school.enrollments
SET score = 83
WHERE student_id = 12 AND course_id = 1;

WITH ranked AS (
    SELECT s.name, e.score,
           RANK()       OVER (ORDER BY e.score DESC) AS rk,
           DENSE_RANK() OVER (ORDER BY e.score DESC) AS drk
    FROM school.enrollments e
    JOIN school.students s ON s.student_id = e.student_id
    WHERE e.course_id = 1 AND e.score IS NOT NULL
)
SELECT * FROM ranked ORDER BY rk;
-- 两个 83 并列：RANK 显示 3、3 然后跳到 5；DENSE_RANK 显示 3、3 然后是 4
-- 观察完恢复数据：
\ir 03_reset_school.sql
