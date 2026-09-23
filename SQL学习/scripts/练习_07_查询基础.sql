-- ============================================================
-- 《PostgreSQL 从零开始》第 7 章练习：SELECT / WHERE / ORDER BY
--
-- 运行方式：
--   psql -h localhost -U student_pg -d beginner_pg -f scripts/练习_07_查询基础.sql
--
-- 本章练习全是 SELECT，不改数据，随便试。
-- ============================================================

\echo '>>> 重置示例数据 ...'
\ir 03_reset_school.sql

-- ============================================================
-- 【题目】
-- ============================================================

-- 练习 1：查询所有课程的课程名、学分、学时，按学分从高到低排。

-- 练习 2：查询所有"北京"学生的学号和姓名，按学号升序。

-- 练习 3：查询 2023 级入学（enrolled_on >= 2023-01-01）的学生，
--          按出生日期从小到大（年纪大→年纪小）排。

-- 练习 4：查询所有姓"王"的学生（LIKE）。

-- 练习 5：查询成绩在 80 到 90 之间（含两端）的选课记录，
--          显示 student_id、course_id、score，按成绩降序。

-- 练习 6：查询城市为 NULL（未填写）的学生，显示姓名。

-- 练习 7：查询"城市不是北京、也不是上海"的学生。
--   陷阱：有一条数据会莫名其妙消失——是谁？为什么？改对它。

-- 练习 8：学生来自哪些不同的城市？（去重，不含 NULL）

-- 练习 9：按学号排序，取第 6~10 名学生（分页：每页 5 条，第 2 页）。

-- 练习 10：选课表中成绩最高的 5 条记录（NULL 的"在读"记录排除在外，
--           并且想清楚 NULL 默认排在哪一头）。

-- ============================================================
-- 【参考答案】
-- ============================================================

-- 答案 1：
SELECT course_name, credit, hours
FROM school.courses
ORDER BY credit DESC;

-- 答案 2：
SELECT student_no, name
FROM school.students
WHERE city = '北京'
ORDER BY student_no;
-- 王小明、赵磊、孙丽，共 3 人

-- 答案 3：
SELECT student_no, name, birth_date
FROM school.students
WHERE enrolled_on >= DATE '2023-01-01'
ORDER BY birth_date ASC;          -- ASC 可省略，写出来更清楚
-- 排最前的是 2004-04-14 孙丽；2002 级的 4 人（赵磊/吴倩/郑浩/曹阳）不在结果里

-- 答案 4：
SELECT student_no, name
FROM school.students
WHERE name LIKE '王%';

-- 答案 5：
SELECT student_id, course_id, score
FROM school.enrollments
WHERE score BETWEEN 80 AND 90     -- 闭区间，含 80 和 90
ORDER BY score DESC;

-- 答案 6：
SELECT name
FROM school.students
WHERE city IS NULL;               -- 郑浩（绝不能写 = NULL）

-- 答案 7：
SELECT name, city
FROM school.students
WHERE city <> '北京' AND city <> '上海';
-- 这条会漏掉 city 为 NULL 的郑浩：NULL <> '北京' 结果是 NULL，行被丢弃
-- 正确写法（两种均可）：
SELECT name, city
FROM school.students
WHERE (city <> '北京' AND city <> '上海') OR city IS NULL;

SELECT name, city
FROM school.students
WHERE city NOT IN ('北京', '上海') OR city IS NULL;   -- NOT IN 同样会漏 NULL

-- 答案 8：
SELECT DISTINCT city
FROM school.students
WHERE city IS NOT NULL;           -- DISTINCT 会把多个 NULL 合成一个，先过滤更清晰

-- 答案 9：
SELECT student_no, name
FROM school.students
ORDER BY student_no
LIMIT 5 OFFSET 5;                 -- 跳过前 5，取 5 条 → S2023006 ~ S2023010

-- 答案 10：
SELECT student_id, course_id, score
FROM school.enrollments
WHERE score IS NOT NULL           -- 排除在读未考
ORDER BY score DESC               -- DESC 时 NULL 默认排最前，先剔除最稳妥
LIMIT 5;
-- 前 5：95（孙丽·Python）、93（吴倩·英语）、92×2（王小明·数据库原理、韩梅·Python）、91（李华·英语）
