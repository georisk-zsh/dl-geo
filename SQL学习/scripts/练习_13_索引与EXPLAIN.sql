-- ============================================================
-- 《PostgreSQL 从零开始》第 13 章练习：索引与 EXPLAIN
--
-- 运行方式：
--   psql -h localhost -U student_pg -d beginner_pg -f scripts/练习_13_索引与EXPLAIN.sql
--
-- 本练习会创建一张 10 万行的大表 big_events，结束后统一清理。
-- ============================================================

\echo '>>> 重置示例数据 ...'
\ir 03_reset_school.sql

\timing on          -- psql 元命令：显示每条语句耗时（毫秒）

-- ============================================================
-- 【题目】
-- ============================================================

-- 练习 1：创建大表 big_events（id 自增主键、user_no 整数、amount 精确小数、
--          created 带时区时间戳），并用 generate_series 一次性灌入 10 万行随机数据。

-- 练习 2：EXPLAIN ANALYZE 查询 user_no = 500 的记录，记下扫描方式与耗时；
--          给 user_no 建索引后重跑，对比两者的计划与耗时。

-- 练习 3：索引失效实验——把条件写成 user_no + 1 = 501（语义上同样匹配 500），
--          EXPLAIN 看它还走不走索引。为什么？

-- 练习 4：范围查询 user_no BETWEEN 100 AND 110，观察索引是否生效；
--          再查 user_no BETWEEN 1 AND 99999（几乎全表），索引还划算吗？计划怎么变？

-- 练习 5：给 students.name 建一个 lower(name) 表达式索引，
--          然后分别 EXPLAIN lower(name) = '王小明' 的前后差异。

-- 练习 6：keyset 分页——big_events 按 id 升序每页 20 条，
--          a) OFFSET 方式取第 1000 页（OFFSET 19980）；
--          b) WHERE id > 上一页最大 id 方式取同样内容。
--          EXPLAIN ANALYZE 对比谁快。

-- 练习 7：统计信息——EXPLAIN（不带 ANALYZE）看 user_no = 500 的预估行数，
--          然后 ANALYZE big_events，重看预估值有没有变化。
--          （本表刚建完统计基本准确，重点是记住"预估 vs 实际差异大 = 该 ANALYZE 了"）

-- 练习 8：清理——删除 big_events 表和练习 5 的表达式索引。

-- ============================================================
-- 【参考答案】
-- ============================================================

-- 答案 1：
CREATE TABLE school.big_events (
    id      bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_no integer,
    amount  numeric(10,2),
    created timestamptz DEFAULT now()
);

INSERT INTO school.big_events (user_no, amount, created)
SELECT (random() * 1000)::int,                        -- 0~999 随机整数
       round((random() * 500)::numeric, 2),           -- 0~500 两位小数
       now() - (random() * interval '365 days')       -- 过去一年内随机时刻
FROM generate_series(1, 100000);                      -- 生成 1..100000 共 10 万行
-- INSERT 0 100000，本机通常 1~3 秒

-- 答案 2：
EXPLAIN ANALYZE SELECT * FROM school.big_events WHERE user_no = 500;
-- 无索引时：Seq Scan on big_events，Execution Time 数毫秒到几十毫秒（10 万行全翻一遍）

CREATE INDEX idx_big_events_user ON school.big_events (user_no);

EXPLAIN ANALYZE SELECT * FROM school.big_events WHERE user_no = 500;
-- 建索引后：Index Scan using idx_big_events_user ... Index Cond: (user_no = 500)
-- Execution Time 掉到 0.0x 毫秒级——快 1~2 个数量级，表越大差距越夸张

-- 答案 3：
EXPLAIN ANALYZE SELECT * FROM school.big_events WHERE user_no + 1 = 501;
-- 计划退回 Seq Scan + Filter——索引失效！
-- 原因：索引存的是 user_no 的原始值，"user_no + 1"的结果在索引里没有；
-- 数据库只能逐行计算表达式再比较。列必须"裸着"出现在等号/不等号左边

-- 答案 4：
EXPLAIN ANALYZE SELECT * FROM school.big_events WHERE user_no BETWEEN 100 AND 110;
-- 走索引（Index Scan），条件成为 Index Cond —— 范围查询是 B-tree 的强项

EXPLAIN ANALYZE SELECT * FROM school.big_events WHERE user_no BETWEEN 1 AND 99999;
-- 计划大概率变成 Seq Scan——这是优化器的正确决策！
-- 范围覆盖了几乎全表，走索引反而要"回表"10 万次，不如顺序扫一遍
-- 结论：索引不是万金油，优化器会按"选择性"自动选择，你要做的是提供选择的可能性

-- 答案 5：
EXPLAIN ANALYZE SELECT * FROM school.students WHERE lower(name) = '王小明';
-- 无表达式索引：Seq Scan（student_id 主键索引帮不上 name 的函数调用）

CREATE INDEX idx_students_name_lower ON school.students (lower(name));

EXPLAIN ANALYZE SELECT * FROM school.students WHERE lower(name) = '王小明';
-- students 只有 15 行，计划仍是 Seq Scan——15 行走索引不划算，属正常现象；
-- 换到 big_events 上验证才看得出差别：
CREATE INDEX idx_big_events_created ON school.big_events (created);
EXPLAIN ANALYZE SELECT count(*) FROM school.big_events WHERE created > now() - interval '7 days';
-- 7 天约占 2% 数据，选择性高 → Index Scan/Bitmap Index Scan 生效

-- 答案 6：
-- a) OFFSET 深分页：必须"数过"前 999 页的 19980 行才能开始返回
EXPLAIN ANALYZE SELECT id FROM school.big_events ORDER BY id LIMIT 20 OFFSET 19980;

-- b) keyset 分页：先拿到第 999 页最后一行的 id（模拟程序里记住上一页末尾）
SELECT id FROM school.big_events ORDER BY id LIMIT 20 OFFSET 19980;   -- 假设最后一行 id = 20000
EXPLAIN ANALYZE SELECT id FROM school.big_events WHERE id > 20000 ORDER BY id LIMIT 20;
-- OFFSET 版本要扫过 2 万行；keyset 版本直接从主键索引 id=20000 处开始取 20 行即停
-- 页码越深差距越大（第 5000 页时是秒级 vs 毫秒级）——列表页深分页的标配解法

-- 答案 7：
EXPLAIN SELECT * FROM school.big_events WHERE user_no = 500;
-- 只看预估：rows=100（规划器按 user_no 均匀分布估算 100000/1000=100）

ANALYZE school.big_events;      -- 采样刷新统计信息（pg_statistic）
-- 实际每页 EXPLAIN ANALYZE 的 actual rows 在 100 上下浮动——估算准说明统计新鲜；
-- 生产中大量 DELETE/UPDATE 后预估值可能严重偏离，那是性能骤降的常见原因

-- 答案 8：清理本练习产物
DROP INDEX IF EXISTS school.idx_students_name_lower;   -- students 的表达式索引
DROP INDEX IF EXISTS school.idx_big_events_created;
DROP INDEX IF EXISTS school.idx_big_events_user;
DROP TABLE IF EXISTS school.big_events;

\timing off
