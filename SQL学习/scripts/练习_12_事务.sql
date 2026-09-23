-- ============================================================
-- 《PostgreSQL 从零开始》第 12 章练习：事务
--
-- 运行方式：
--   单会话部分：psql -h localhost -U student_pg -d beginner_pg -f scripts/练习_12_事务.sql
--   双会话部分：按文件中的说明，开两个 psql 窗口手动操作（无法脚本化，
--               因为两个会话必须"同时"活着——这正是并发实验的意义）
-- ============================================================

\echo '>>> 重置示例数据 ...'
\ir 03_reset_school.sql

-- ============================================================
-- 【题目·单会话】
-- ============================================================

-- 练习 1：在事务中把学生 2（李华）的城市改成 '魔都'，
--          事务内查询确认已改，然后 ROLLBACK，再查确认恢复。

-- 练习 2：在事务中完成"两步操作"：
--          ① 插入新学生 S2023016 谢婷；② 让她选修课程 1。
--          两次都成功后 COMMIT；然后删掉她，验证选课记录级联消失。

-- 练习 3：SAVEPOINT——事务内先改学生 4 的城市为 'A'，存档 sp1，
--          再改学生 5 的城市为 'B'；回滚到 sp1；提交。
--          最终学生 4、5 的城市分别是什么？先推理再验证。

-- 练习 4：故意触发错误——事务内执行一条违反 CHECK 约束的插入
--          （比如 score = 999 的选课记录），观察报错后事务状态，
--          然后正确收尾。思考：报错后还能 COMMIT 前面的语句吗？

-- ============================================================
-- 【题目·双会话】（开两个 psql 窗口，都连 student_pg，对照教程 12.3 节）
-- ============================================================

-- 实验 A：READ COMMITTED 可见性
--   会话1：BEGIN; SELECT city FROM school.students WHERE student_id=2;
--   会话2：UPDATE school.students SET city='魔都' WHERE student_id=2;   （自动提交）
--   会话1：再 SELECT 同一行 —— 看到的还是 '上海'（会话2 未提交？不，
--          会话2 是自动提交的！所以会话1 在 READ COMMITTED 下会看到 '魔都'）
--   会话1：ROLLBACK;
--   想看到"读旧值"，把会话2 也放进事务且不提交试试。

-- 实验 B：行锁等待
--   会话1：BEGIN; UPDATE school.students SET city='X' WHERE student_id=3;
--   会话2：BEGIN; UPDATE school.students SET city='Y' WHERE student_id=3;  （卡住）
--   会话1：COMMIT;   → 会话2 解除阻塞
--   会话2：COMMIT;   → 最终 'Y'（后提交者覆盖）
--   两边都收尾后：UPDATE school.students SET city='广州' WHERE student_id=3;（恢复数据）

-- 实验 C：死锁
--   会话1：BEGIN; UPDATE school.students SET city='A' WHERE student_id=4;
--   会话2：BEGIN; UPDATE school.students SET city='A' WHERE student_id=5;
--   会话1：UPDATE school.students SET city='A' WHERE student_id=5;   （等会话2）
--   会话2：UPDATE school.students SET city='A' WHERE student_id=4;   （等会话1 → 死锁！）
--   约 1 秒后其中一方报 "deadlock detected"，另一方成功——观察谁被牺牲。
--   存活方 COMMIT；被牺牲方重新 BEGIN 完成自己的两条再 COMMIT。

-- ============================================================
-- 【参考答案·单会话】
-- ============================================================

-- 答案 1：
BEGIN;
UPDATE school.students SET city = '魔都' WHERE student_id = 2;
SELECT name, city FROM school.students WHERE student_id = 2;   -- '魔都'（未提交状态）
ROLLBACK;
SELECT name, city FROM school.students WHERE student_id = 2;   -- '上海'：回来了

-- 答案 2：
BEGIN;
INSERT INTO school.students (student_no, name, gender, birth_date, city)
VALUES ('S2023016', '谢婷', 'F', DATE '2005-09-18', '厦门')
RETURNING student_id;                                          -- 假设返回 16

INSERT INTO school.enrollments (student_id, course_id)
VALUES (16, 1);                                                -- 用实际返回的编号
COMMIT;                                                        -- 两步一起生效

-- 验证级联删除：删学生，选课记录应自动消失
SELECT COUNT(*) FROM school.enrollments WHERE student_id = 16; -- 1（还在）
DELETE FROM school.students WHERE student_no = 'S2023016';     -- DELETE 1
SELECT COUNT(*) FROM school.enrollments WHERE student_id = 16; -- 0（被 CASCADE 带走）

-- 答案 3：
BEGIN;
UPDATE school.students SET city = 'A' WHERE student_id = 4;
SAVEPOINT sp1;                          -- 存档：此时 4 已改、5 未改
UPDATE school.students SET city = 'B' WHERE student_id = 5;
ROLLBACK TO sp1;                        -- 只撤销到存档点：5 的改动撤销
COMMIT;                                 -- 4 的改动生效
-- 预期：学生 4 城市 'A'（保留），学生 5 城市 '深圳'（被回滚）
SELECT student_id, name, city FROM school.students WHERE student_id IN (4, 5);

-- 恢复数据（答案 3 故意留下的 'A'）：
UPDATE school.students SET city = '深圳' WHERE student_id = 4;

-- 答案 4：
BEGIN;
UPDATE school.students SET city = '测试' WHERE student_id = 6;   -- 先做一步成功的
INSERT INTO school.enrollments (student_id, course_id, score)
VALUES (6, 1, 999);                                              -- 违反 CHECK 0~100
-- ERROR: new row for relation "enrollments" violates check constraint
-- 观察提示符仍是 beginner_pg=*>（星号在 = 和 > 之间，表示事务还开着），但事务已进入"失败状态"
COMMIT;
-- ROLLBACK —— 报错语句之后整张事务"中毒"，只能整体回滚：
-- psql 会提示 cannot run inside a transaction block / or COMMIT acts as ROLLBACK
-- 结论：出错后该事务里【所有】改动（包括前面那条成功的 UPDATE）都无法提交。
-- 生产代码的应对：捕获异常 → ROLLBACK → 从头重试整个事务（不是从出错行续跑）
SELECT city FROM school.students WHERE student_id = 6;           -- '杭州'（未变，已回滚）
