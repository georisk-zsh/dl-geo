-- ============================================================
-- 《PostgreSQL 从零开始》第 8 章练习：聚合与分组
--
-- 运行方式：
--   psql -h localhost -U student_pg -d beginner_pg -f scripts/练习_08_聚合分组.sql
-- ============================================================

\echo '>>> 重置示例数据 ...'
\ir 03_reset_school.sql

-- ============================================================
-- 【题目】
-- ============================================================

-- 练习 1：一条 SELECT 查出三个数字：
--          选课记录总数 / 有成绩的记录数 / 成绩不及格（<60）的记录数。
--          思考：COUNT(*) 和 COUNT(score) 差的 3 是什么？

-- 练习 2：每门课程的选课人次、平均分（保留 1 位小数）、最高分。
--          按平均分降序。课程名来自 courses 表（需要 JOIN）。

-- 练习 3：平均分高于 80 的课程（只显示课程名和平均分）。
--          用 GROUP BY + HAVING 实现。

-- 练习 4：每个城市各有多少学生？城市为 NULL 的组显示"未填写"，
--          按人数降序。（提示：先 COALESCE 再 GROUP BY）

-- 练习 5：每位学生的平均分（只统计有成绩的课程）、已考门数，
--          按平均分取前 3 名。（注意：没选课的曹阳要不要出现？两种口径都试试）

-- 练习 6：每门课的及格率 = 及格人次 ÷ 该课总人次 × 100%，
--          保留 1 位小数。在读者按"在读"算。
--          （提示：COUNT(*) FILTER；整数除法陷阱）

-- 练习 7：按月份统计选课人次（2023-02、2023-09、2024-09 三组）。
--          提示：date_trunc('month', enrolled_on)。

-- 练习 8：体会 WHERE vs HAVING——
--          a) 只统计 2023-09-04 当天新增的选课记录，按课程分组计数；
--          b) 在 a 的基础上只保留人次 >= 5 的课程。
--          说清楚两个过滤条件分别该用 WHERE 还是 HAVING，为什么。

-- ============================================================
-- 【参考答案】
-- ============================================================

-- 答案 1：
SELECT COUNT(*)               AS 记录总数,     -- 42（所有选课记录）
       COUNT(score)           AS 有成绩,       -- 39（3 条在读未考被跳过）
       COUNT(*) FILTER (WHERE score < 60) AS 不及格   -- 5
FROM school.enrollments;
-- 差的 3 = score 为 NULL 的"在读"记录：COUNT(列) 不数 NULL，COUNT(*) 数所有行

-- 答案 2：
SELECT c.course_name,
       COUNT(*)                     AS 人次,
       ROUND(AVG(e.score), 1)       AS 平均分,
       MAX(e.score)                 AS 最高分
FROM school.courses c
JOIN school.enrollments e ON e.course_id = c.course_id
GROUP BY c.course_name
ORDER BY 平均分 DESC;

-- 答案 3：
SELECT c.course_name, ROUND(AVG(e.score), 1) AS 平均分
FROM school.courses c
JOIN school.enrollments e ON e.course_id = c.course_id
GROUP BY c.course_name
HAVING AVG(e.score) > 80;          -- 组级条件必须用 HAVING
-- Python 程序设计 83.8、大学英语(四) 82.2

-- 答案 4：
SELECT COALESCE(city, '未填写') AS 城市, COUNT(*) AS 人数
FROM school.students
GROUP BY COALESCE(city, '未填写')  -- SELECT 里的表达式要在 GROUP BY 里出现
ORDER BY 人数 DESC;

-- 答案 5：口径 A（INNER JOIN，没选课的曹阳不出现——推荐）
SELECT s.name,
       COUNT(e.score)         AS 已考门数,
       ROUND(AVG(e.score), 1) AS 平均分
FROM school.students s
JOIN school.enrollments e ON e.student_id = s.student_id
GROUP BY s.name
ORDER BY 平均分 DESC
LIMIT 3;
-- 韩梅 89.5、王小明 88.3、孙丽 87.7
-- 口径 B（LEFT JOIN，曹阳以 NULL 平均分出现）：
SELECT s.name, COUNT(e.score) AS 已考门数, ROUND(AVG(e.score), 1) AS 平均分
FROM school.students s
LEFT JOIN school.enrollments e ON e.student_id = s.student_id
GROUP BY s.name
ORDER BY 平均分 DESC NULLS LAST;
-- 统计口径决定结论——报表里必须写清楚用的是哪一种

-- 答案 6：
SELECT c.course_name,
       COUNT(*)  AS 总人次,
       COUNT(*) FILTER (WHERE e.score >= 60) AS 及格人次,
       ROUND(100.0 * COUNT(*) FILTER (WHERE e.score >= 60) / COUNT(*), 1) AS 及格率
FROM school.courses c
JOIN school.enrollments e ON e.course_id = c.course_id
GROUP BY c.course_name
ORDER BY 及格率 DESC;
-- 关键点：先乘 100.0 强制小数除法，否则 4/5 会被整成 0
-- 在读记录算"未及格"（它确实没及格）——另一种口径是只统计有成绩的，
-- 分母换成 COUNT(e.score) 即可，说清楚你选的口径就行

-- 答案 7：
SELECT date_trunc('month', enrolled_on) AS 月份, COUNT(*) AS 人次
FROM school.enrollments
GROUP BY 1                          -- GROUP BY 1 = 按第一个输出列分组
ORDER BY 1;
-- 2023-02: 8、2023-09: 31、2024-09: 3

-- 答案 8：
-- a) "2023-09-04 当天新增"是对【行】的过滤，发生在分组之前 → WHERE
SELECT c.course_name, COUNT(*) AS 人次
FROM school.courses c
JOIN school.enrollments e ON e.course_id = c.course_id
WHERE e.enrolled_on = DATE '2023-09-04'
GROUP BY c.course_name
ORDER BY 人次 DESC;
-- b) "人次 >= 5"是对【组】的过滤，发生在分组之后 → HAVING
SELECT c.course_name, COUNT(*) AS 人次
FROM school.courses c
JOIN school.enrollments e ON e.course_id = c.course_id
WHERE e.enrolled_on = DATE '2023-09-04'
GROUP BY c.course_name
HAVING COUNT(*) >= 5
ORDER BY 人次 DESC;
-- 数据库原理（6 人）、Python 程序设计（5 人）、高等数学(下)（5 人）三组都通过；
-- 记忆法：WHERE 在 GROUP BY 之前（筛行），HAVING 在之后（筛组）
