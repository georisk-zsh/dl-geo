-- ============================================================
-- 《PostgreSQL 从零开始》第 9 章练习：多表连接 JOIN
--
-- 运行方式：
--   psql -h localhost -U student_pg -d beginner_pg -f scripts/练习_09_多表连接.sql
-- ============================================================

\echo '>>> 重置示例数据 ...'
\ir 03_reset_school.sql

-- ============================================================
-- 【题目】
-- ============================================================

-- 练习 1：完整成绩单——每个学生的姓名、课程名、成绩，
--          按学生姓名、课程名排序。（三表 INNER JOIN）

-- 练习 2：每门课的课程名、授课教师、教师所属院系。
--          注意：教师可能为空吗？该用哪种 JOIN？

-- 练习 3：找出没有选任何课的学生。（LEFT JOIN + IS NULL 模式）

-- 练习 4：找出没有任何学生选的课程。
--          本数据集里可能返回 0 行——那怎么证明你的 SQL 是对的？
--          再写一条"选课人次最少的课程"验证。

-- 练习 5：自连接——同一院系的教师两两配对（显示同事关系），
--          输出 院系、教师A、教师B，注意不要出现 (张伟,张伟) 或重复对。

-- 练习 6：每位教师开了几门课、总学分是多少？教师即使没开课也要显示（0 门）。

-- 练习 7：各院系的：教师数、开课数、选课总人次。
--          一个院系即使什么都没有也要出现在结果里。选课人次按"课程被选"归属到开课院系。

-- 练习 8：UNION——把"北京的学生"和"所有教师"合并成一张名单，
--          两列：姓名、身份（'学生'/'教师'），按身份、姓名排序。

-- ============================================================
-- 【参考答案】
-- ============================================================

-- 答案 1：
SELECT s.name AS 学生, c.course_name AS 课程, e.score AS 成绩
FROM school.students s
JOIN school.enrollments e ON e.student_id = s.student_id
JOIN school.courses    c ON c.course_id  = e.course_id
ORDER BY s.name, c.course_name;

-- 答案 2：courses.teacher_id 外键是 ON DELETE SET NULL，可能为空 → LEFT JOIN
--         （当前数据里没有空教师，但写法要能容纳）
SELECT c.course_name AS 课程,
       t.name        AS 授课教师,
       d.dept_name   AS 院系
FROM school.courses c
LEFT JOIN school.teachers    t ON t.teacher_id = c.teacher_id
LEFT JOIN school.departments d ON d.dept_id    = t.dept_id
ORDER BY c.course_name;

-- 答案 3：LEFT JOIN 保住每个学生，没选课的行 e 侧全 NULL
SELECT s.student_no, s.name
FROM school.students s
LEFT JOIN school.enrollments e ON e.student_id = s.student_id
WHERE e.student_id IS NULL;
-- 曹阳（S2023015）

-- 答案 4：同样的模式换方向
SELECT c.course_name
FROM school.courses c
LEFT JOIN school.enrollments e ON e.course_id = c.course_id
WHERE e.course_id IS NULL;
-- 返回 0 行——本数据集每门课都有人选，"0 行"也是正确答案
-- 验证：退一步查"选课人次最少的课"，如果 SQL 有 bug，这条也会暴露
SELECT c.course_name, COUNT(e.enrollment_id) AS 人次
FROM school.courses c
LEFT JOIN school.enrollments e ON e.course_id = c.course_id
GROUP BY c.course_name
ORDER BY 人次 ASC
LIMIT 3;
-- 数据结构 2 人次最少；把它的记录删光再跑上面的查询就能看到它出现
-- （试完记得跑 03_reset_school.sql 恢复）

-- 答案 5：
SELECT d.dept_name AS 院系,
       t1.name      AS 教师A,
       t2.name      AS 教师B
FROM school.teachers t1
JOIN school.teachers    t2 ON t1.dept_id = t2.dept_id
LEFT JOIN school.departments d ON d.dept_id = t1.dept_id
WHERE t1.teacher_id < t2.teacher_id      -- 三重保险：排除自己配自己 + 去掉重复对
ORDER BY d.dept_name, t1.name;
-- 计算机学院：张伟-李娜；数学学院：无（王强独苗）；其余院系各 1 名教师，无同事

-- 答案 6：
SELECT t.name AS 教师,
       COUNT(c.course_id) AS 开课数,     -- COUNT(列)：没课时数 0 而不是 1
       COALESCE(SUM(c.credit), 0) AS 总学分   -- SUM 全空返回 NULL，兜底成 0
FROM school.teachers t
LEFT JOIN school.courses c ON c.teacher_id = t.teacher_id
GROUP BY t.name
ORDER BY 开课数 DESC, t.name;

-- 答案 7：链式 LEFT JOIN：departments → teachers → courses → enrollments
SELECT d.dept_name AS 院系,
       COUNT(DISTINCT t.teacher_id) AS 教师数,
       COUNT(DISTINCT c.course_id)  AS 开课数,
       COUNT(e.enrollment_id)       AS 选课人次
FROM school.departments d
LEFT JOIN school.teachers    t ON t.dept_id    = d.dept_id
LEFT JOIN school.courses     c ON c.teacher_id = t.teacher_id
LEFT JOIN school.enrollments e ON e.course_id  = c.course_id
GROUP BY d.dept_name
ORDER BY 选课人次 DESC;
-- 关键点：教师数/开课数必须 COUNT(DISTINCT ...)——
-- 链式 JOIN 后每行教师会因选课记录被复制多份，直接 COUNT 会数重复
-- 例如计算机学院 2 名教师、3 门课（数据库原理+数据结构+Python）、人次 = 8+2+6 = 16

-- 答案 8：
SELECT s.name AS 姓名, '学生' AS 身份
FROM school.students s
WHERE s.city = '北京'
UNION                              -- 两段列数/类型一致（varchar + 文本常量）
SELECT t.name, '教师'
FROM school.teachers t
ORDER BY 身份, 姓名;
-- UNION 默认去重；两段都确定无重复时用 UNION ALL 更快
