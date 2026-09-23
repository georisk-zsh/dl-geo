-- ============================================================
-- 《PostgreSQL 从零开始》第 6 章练习：INSERT / UPDATE / DELETE
--
-- 运行方式（先重置数据，保证与参考答案一致）：
--   psql -h localhost -U student_pg -d beginner_pg -f scripts/练习_06_增删改.sql
--
-- 使用方法：先只看上半部分的【题目】，自己在 psql 里写；
-- 写完（或卡住 10 分钟）再看文件末尾的【参考答案】。
-- ============================================================

\echo '>>> 重置示例数据 ...'
\ir 03_reset_school.sql

-- ============================================================
-- 【题目】
-- ============================================================

-- 练习 1：插入一名新学生——学号 S2023016、姓名 谢婷、性别 F、
--          生日 2005-09-18、城市 厦门，并让数据库告诉你她的 student_id。

-- 练习 2：一次性插入两个新院系：'体育教学部'、'马克思主义学院'。

-- 练习 3：让谢婷选"数据库原理"这门课。
--   提示：enrollments 需要的是 student_id 和 course_id，不是名字；
--         你不能假设练习 1 返回的编号是几——用子查询 INSERT ... SELECT 拿到编号。
--   提示：enrolled_on 让它取默认值（今天）。

-- 练习 4：把谢婷的城市改成 '福州市'。改之前先用 SELECT 预览 WHERE 会命中谁。

-- 练习 5（补考通过）：把"数据库原理"这门课所有不及格的成绩改成 60。
--   要求：整批操作放进事务里；先用 SELECT 查出会影响哪些行，确认后再 COMMIT。

-- 练习 6：删除学号 S2023016 的学生谢婷。
--   观察点：她在练习 3 里创建的选课记录去哪了？（级联删除 ON DELETE CASCADE）

-- 练习 7：删除练习 2 添加的两个院系。
--   思考：为什么删 departments 不会像删学生那样连累别的表？

-- 练习 8（防身术演练）：在事务里执行一条【故意不带 WHERE】的
--   UPDATE school.students SET city = '被误改了';
--   观察 psql 返回 UPDATE 多少行，然后 ROLLBACK。
--   思考：如果当时没开事务，这 15 行数据靠什么找回来？

-- ============================================================
-- 【参考答案】（先自己做，再看这里）
-- ============================================================

-- 答案 1：显式列名 + RETURNING 拿回自增 id
INSERT INTO school.students (student_no, name, gender, birth_date, city)
VALUES ('S2023016', '谢婷', 'F', DATE '2005-09-18', '厦门')
RETURNING student_id, student_no, name;

-- 答案 2：一条语句批量插入
INSERT INTO school.departments (dept_name) VALUES ('体育教学部'), ('马克思主义学院');

-- 答案 3：INSERT ... SELECT：子查询按名字定位两个编号，VALUES 无法做到
INSERT INTO school.enrollments (student_id, course_id)
SELECT s.student_id, c.course_id
FROM school.students s, school.courses c
WHERE s.student_no = 'S2023016'
  AND c.course_name = '数据库原理';

-- 答案 4：先预览再执行（两句都要会）
SELECT student_id, name, city FROM school.students WHERE student_no = 'S2023016';
UPDATE school.students
SET city = '福州市'
WHERE student_no = 'S2023016';      -- UPDATE 1：只改一行

-- 答案 5：事务包裹 + 先预览 + 后提交
BEGIN;
SELECT s.name, c.course_name, e.score               -- ① 预览：会改哪些行
FROM school.enrollments e
JOIN school.students s ON s.student_id = e.student_id
JOIN school.courses  c ON c.course_id  = e.course_id
WHERE c.course_name = '数据库原理' AND e.score < 60;
-- 预览应看到：周涛 59 分（只有他一人）
UPDATE school.enrollments e                         -- ② 执行修改
SET score = 60
FROM school.courses c
WHERE c.course_id = e.course_id
  AND c.course_name = '数据库原理'
  AND e.score < 60;                                 -- UPDATE 1
COMMIT;                                             -- ③ 确认无误，提交

-- 答案 6：删除学生；选课记录被外键 ON DELETE CASCADE 自动删除
BEGIN;
DELETE FROM school.students WHERE student_no = 'S2023016';   -- DELETE 1
-- 验证级联：她的选课记录应该已经不在了
SELECT COUNT(*) FROM school.enrollments e
JOIN school.students s ON s.student_id = e.student_id
WHERE s.student_no = 'S2023016';                            -- 0 行
COMMIT;

-- 答案 7：departments 只被 teachers.dept_id 引用，而该外键没有指定
-- ON DELETE 动作（默认 NO ACTION）——但这两个新院系没有教师引用，
-- 所以可以直接删；如果有教师挂着，删除会被拒绝（数据库在保护一致性）。
DELETE FROM school.departments
WHERE dept_name IN ('体育教学部', '马克思主义学院');   -- DELETE 2

-- 答案 8：危险操作演练
BEGIN;
UPDATE school.students SET city = '被误改了';        -- UPDATE 15：全表！
ROLLBACK;                                           -- 救回来了
SELECT COUNT(*) FROM school.students WHERE city = '被误改了';   -- 0：一行都没有
-- 思考答案：没开事务的话，只能靠备份恢复（第 14 章）——
-- 这就是"危险操作先包事务、定期备份"两条铁律存在的原因。
