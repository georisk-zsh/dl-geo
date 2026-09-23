-- ============================================================
-- 《PostgreSQL 从零开始》第 10 章练习：NULL、日期、字符串、数值
--
-- 运行方式：
--   psql -h localhost -U student_pg -d beginner_pg -f scripts/练习_10_NULL与函数.sql
-- ============================================================

\echo '>>> 重置示例数据 ...'
\ir 03_reset_school.sql

-- ============================================================
-- 【题目】
-- ============================================================

-- 练习 1：输出学生的 姓名、当前年龄（周岁，整数）。
--          提示：age(birth_date) 或 extract(year FROM age(...))。

-- 练习 2：从学号里截取年级（'S2023001' → '2023'），输出 姓名、年级。

-- 练习 3：输出学生标签："王小明（北京）"；城市未填写的显示"王小明（未填写）"。

-- 练习 4：列出所有"在读未考"的选课记录：学生名、课程名、选课日期。

-- 练习 5：CASE WHEN——给每条有成绩的选课记录打等级：
--   >=90 优秀，>=80 良好，>=70 中等，>=60 及格，否则 不及格。
--   并统计每个等级的人次。

-- 练习 6：每门课"女学生选课人次"和"女生占比"（保留 1 位小数）。
--          如果某门课 0 女生，占比显示 NULL 即可（用 NULLIF 防除零）。

-- 练习 7：2023 年 9 月以后（不含）选课的记录有几条？
--          以及各"选课月份"的人次分布。

-- 练习 8：字符串处理——把学生姓名里可能存在的首尾空格清理后再输出；
--          并演示 length() 在 NULL 城市上的表现。

-- 练习 9：数值函数——把大学物理的学分四舍五入到整数、
--          把高等数学(下)的学时折算成"多少个整天"（向零取整）和"多少个半天"（向上取整）。

-- ============================================================
-- 【参考答案】
-- ============================================================

-- 答案 1：
SELECT name,
       extract(year FROM age(birth_date)) AS 年龄   -- age() 返回区间，取年部分
FROM school.students
ORDER BY 年龄 DESC;

-- 答案 2：substring(字符串, 起始位置, 长度)——位置从 1 开始！
SELECT name, substring(student_no, 2, 4) AS 年级
FROM school.students;
-- S2023001 → '2023'（跳过第 1 位 S，取 4 位）

-- 答案 3：COALESCE 兜底 + || 拼接
SELECT name || '（' || COALESCE(city, '未填写') || '）' AS 学生标签
FROM school.students;
-- 郑浩 → '郑浩（未填写）'；如果不用 COALESCE，他这一行会整个变成 NULL
--（|| 遇到 NULL 结果就是 NULL；concat() 则会跳过 NULL，两种行为都要知道）

-- 答案 4：
SELECT s.name AS 学生, c.course_name AS 课程, e.enrolled_on AS 选课日期
FROM school.enrollments e
JOIN school.students s ON s.student_id = e.student_id
JOIN school.courses  c ON c.course_id  = e.course_id
WHERE e.score IS NULL;
-- 3 条：陈静·微观经济、郑浩·高等数学(下)、韩梅·微观经济

-- 答案 5：
SELECT s.name, c.course_name, e.score,
       CASE WHEN e.score >= 90 THEN '优秀'
            WHEN e.score >= 80 THEN '良好'
            WHEN e.score >= 70 THEN '中等'
            WHEN e.score >= 60 THEN '及格'
            ELSE '不及格'
       END AS 等级
FROM school.enrollments e
JOIN school.students s ON s.student_id = e.student_id
JOIN school.courses  c ON c.course_id  = e.course_id
WHERE e.score IS NOT NULL
ORDER BY e.score DESC;

-- 等级人次统计（FILTER 版；SUM(CASE ...) 是传统等价写法）
SELECT CASE WHEN e.score >= 90 THEN '优秀'
            WHEN e.score >= 80 THEN '良好'
            WHEN e.score >= 70 THEN '中等'
            WHEN e.score >= 60 THEN '及格'
            ELSE '不及格' END AS 等级,
       COUNT(*) AS 人次
FROM school.enrollments e
WHERE e.score IS NOT NULL
GROUP BY 1
ORDER BY 1;
-- 优秀 6、良好 12、中等 9、及格 7、不及格 5（合计 39 = 有成绩的记录数）

-- 答案 6：
SELECT c.course_name AS 课程,
       COUNT(*) FILTER (WHERE s.gender = 'F') AS 女生人次,
       ROUND(100.0 * COUNT(*) FILTER (WHERE s.gender = 'F')
             / NULLIF(COUNT(*), 0), 1)         AS 女生占比
FROM school.courses c
JOIN school.enrollments e ON e.course_id = c.course_id
JOIN school.students  s ON s.student_id = e.student_id
GROUP BY c.course_name
ORDER BY 女生占比 DESC;
-- NULLIF(分母, 0)：分母为 0 时整体返回 NULL（代表"无意义"）而不是报错
-- 本数据每门课都有人选，NULLIF 不会触发，但生产代码必须防

-- 答案 7：
SELECT COUNT(*) AS 九月以后
FROM school.enrollments
WHERE enrolled_on > DATE '2023-09-30';          -- 3 条（2024-09-02 的在读记录）

SELECT date_trunc('month', enrolled_on) AS 月份, COUNT(*) AS 人次
FROM school.enrollments
GROUP BY 1
ORDER BY 1;
-- 2023-02-01：9、2023-09-01：30、2024-09-01：3

-- 答案 8：
SELECT trim(name) AS 清理后姓名,
       city,
       length(city) AS 城市字符数          -- 郑浩 → NULL（length(NULL)=NULL）
FROM school.students;
-- 本数据姓名其实没有多余空格，trim 是防御性清洗；
-- 对脏数据还可用 btrim(列, ' ') 或正则 regexp_replace(列, '\s', '', 'g')

-- 答案 9：
SELECT course_name,
       credit                          AS 学分,
       round(credit)                   AS 四舍五入到整数,    -- 3.0 → 3
       hours,
       trunc(hours::numeric / 8)       AS 八小时整天_向零取整,  -- 48/8=6
       ceil(hours::numeric / 4)        AS 四小时半天_向上取整   -- 48/4=12
FROM school.courses
WHERE course_name IN ('大学物理', '高等数学(下)');
-- 大学物理：学分 3.0→3，48 学时 = 6 个整天或 12 个半天
-- 高等数学(下)：学分 4.0→4，64 学时 = 8 个整天或 16 个半天
