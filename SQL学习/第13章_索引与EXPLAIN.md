# 第 13 章 索引与 EXPLAIN：让查询快起来

> [📖 返回目录](README.md) · ⬅️ [上一章：第 12 章 事务](第12章_事务.md) · ➡️ [下一章：第 14 章 备份与恢复](第14章_备份与恢复.md)
>
> **前置知识**：[第 7 章 查询基础](第07章_查询基础.md)、[第 9 章 多表连接](第09章_多表连接JOIN.md) · **速查**：[附录 C SQL 速查表](附录C_SQL速查表.md) · **报错**：[附录 B 错误信息速查](附录B_错误信息速查.md)

数据到百万行时，"扫全表"和"走索引"可能差上千倍。本章学习：索引是什么、什么时候加、怎么用 EXPLAIN 验证。

## 13.1 没有索引的世界：全表扫描

```sql
SELECT * FROM school.enrollments WHERE student_id = 5;
```

PostgreSQL 最笨但也最可靠的找法：**从第一行扫到最后一行**（Sequential Scan，顺序扫描）。48 行毫无压力；4800 万行就是灾难——平均要翻 2400 万行。

索引就是**提前建好的"字典部首目录"**：B-tree（平衡多路搜索树）把列值有序组织，查找从树根往下走，`O(log n)` 步定位——4800 万行只需 ~26 步。

## 13.2 建索引与看索引

```sql
-- enrollments.student_id 有外键，但外键不会自动建索引！
CREATE INDEX idx_enrollments_student ON school.enrollments(student_id);
CREATE INDEX idx_enrollments_course  ON school.enrollments(course_id);

-- 复合索引：先按 student_id 再按 course_id 排（顺序很重要！）
CREATE INDEX idx_enrollments_student_course ON school.enrollments(student_id, course_id);

-- 唯一索引：既保证唯一又加速（和 UNIQUE 约束背后是同一个东西）
CREATE UNIQUE INDEX idx_students_no ON school.students(student_no);

\di school.*                    -- 查看模式下的索引
\d school.enrollments           -- 表结构尾部会列出索引
DROP INDEX school.idx_enrollments_student;    -- 删除
```

**重要事实：**

1. 主键和 UNIQUE 约束**自动**带索引，不用手动建；
2. 外键**不会**自动建索引——本教程的 enrollments 两列都该建（上面已建）；
3. 索引是**自动维护**的：INSERT/UPDATE/DELETE 时同步更新，所以索引让读变快、让写略变慢、占额外磁盘——**不是越多越好**。

## 13.3 EXPLAIN：看数据库怎么执行查询

`EXPLAIN` 显示**执行计划**（打算怎么找数据），`EXPLAIN ANALYZE` 真正执行并附带**实际耗时**（所以 ANALYZE 会真的跑语句——对 UPDATE/DELETE 用 ANALYZE 会真改数据！调试时把 UPDATE 换成同条件的 SELECT 分析）。

```sql
EXPLAIN SELECT * FROM school.enrollments WHERE student_id = 5;

EXPLAIN ANALYZE SELECT c.course_name, e.score
FROM school.enrollments e
JOIN school.courses c ON c.course_id = e.course_id
WHERE e.student_id = 5;
```

典型输出解读（各版本细节略有差异，结构不变）：

```text
Nested Loop  (cost=0.29..24.15 rows=4 width=94) (actual time=0.03..0.05 rows=3 loops=1)
  ->  Index Scan using idx_enrollments_student_course on enrollments e
        (cost=0.29..8.30 rows=3 width=8) (actual time=0.015..0.024 rows=3 loops=1)
        Index Cond: (student_id = 5)
  ->  Memoize ...
Planning Time: 0.2 ms
Execution Time: 0.06 ms
```

逐项拆解：

| 片段 | 含义 |
|---|---|
| `Index Scan using idx_...` | 用了哪个索引（好消息） |
| `Seq Scan on enrollments` | 全表扫描（小表正常，大表警报） |
| `Index Cond: (student_id = 5)` | 索引里实际用的条件 |
| `Filter: ...` | 索引之外还逐行过滤的条件 |
| `Nested Loop` / `Hash Join` | 两表怎么拼（小表用嵌套循环，大表哈希） |
| `rows=3` | 预估/实际产出行数——**两者差很远说明统计信息过期** |
| `Execution Time: 0.06 ms` | 真实耗时 |

**优化就是三步循环**：EXPLAIN ANALYZE → 找到最贵的节点（耗时最长的缩进块）→ 改（加索引/改写法）→ 再 EXPLAIN ANALYZE 对比。

## 13.4 大数据体验：造一张 10 万行的表

48 行的表现在看不出差距，造个大的（顺便学 `generate_series`）：

```sql
CREATE TABLE school.big_events (
    id       bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_no  integer,
    amount   numeric(10,2),
    created  timestamptz DEFAULT now()
);

INSERT INTO school.big_events (user_no, amount, created)
SELECT (random()*1000)::int,
       round((random()*500)::numeric, 2),
       now() - (random() * interval '365 days')
FROM generate_series(1, 100000);            -- 一次性生成 10 万行

-- 无索引查询
EXPLAIN ANALYZE SELECT * FROM school.big_events WHERE user_no = 500;
--   Seq Scan on big_events ... Execution Time: ~15 ms（全表 10 万行都翻了一遍）

CREATE INDEX idx_big_events_user ON school.big_events(user_no);

EXPLAIN ANALYZE SELECT * FROM school.big_events WHERE user_no = 500;
--   Index Scan using idx_big_events_user ... Execution Time: ~0.1 ms
-- 速度快两个数量级；数据量越大差距越夸张
```

体验完删掉（本章练习里还会再造）：`DROP TABLE school.big_events;`

## 13.5 什么查询能用上索引（重要！）

B-tree 索引喜欢**等值和范围**，讨厌**函数包裹**：

```sql
WHERE user_no = 500                          -- ✓ 走索引
WHERE user_no BETWEEN 100 AND 200            -- ✓ 走索引
WHERE user_no + 1 = 501                      -- ✗ 对列做运算 → 只能全表扫
WHERE lower(email) = 'a@b.c'                 -- ✗ 同上（除非建表达式索引）
WHERE created >= now() - interval '7 days'   -- ✓ 列在等号左边、裸着
WHERE user_no::text = '500'                  -- ✗ 隐式类型转换毁索引
```

对函数查询的正规解法——**表达式索引**（把"计算结果"建进索引）：

```sql
CREATE INDEX idx_students_name_lower ON school.students (lower(name));
-- 现在 WHERE lower(name) = '王小明' 能走索引了
```

**LIKE 的坑**：`LIKE '%王'`（前置通配符）用不了普通 B-tree 索引；`LIKE '王%'`（后置）可以。频繁的模糊搜索考虑 `pg_trgm` 扩展（超出本教程，知道名字即可）。

## 13.6 索引类型一览（按需选型）

| 类型 | 场景 | 例子 |
|---|---|---|
| `btree`（默认） | 等值、范围、排序 | 99% 的场合 |
| `hash` | 只有等值比较 | PG 10+ 可用，较少手选 |
| `gin` | 包含类查询：数组、JSONB、全文检索 | `@>`、`?` 运算符 |
| `gist` | 地理/范围类型 | PostGIS、范围查询 |
| `brin` | 超大表 + 物理有序列 | 时间序列追加表 |

```sql
CREATE INDEX idx_events_created ON school.big_events USING brin (created);
```

## 13.7 优化清单（背下这个优先级）

按"性价比"从高到低：

1. **先看执行计划**再动手（EXPLAIN ANALYZE），别凭感觉；
2. **给 WHERE/JOIN ON/ORDER BY 热列加索引**，外键列别忘了；
3. **只取需要的列**（`SELECT *` 是性能杀手之一）；
4. **分页改 keyset**：深分页 `OFFSET 100000` 要扫过前 10 万行，改 `WHERE id > 上页末尾id LIMIT 20`；
5. **批量插入**：一万条 INSERT 合成一个多值 INSERT 或 `COPY`，快一个数量级；
6. 统计信息过期（预估 rows 严重偏离实际）→ 管理员跑 `ANALYZE 表名;`（PG 平时自动做，手动分析通常在大批量导入后）；
7. 系统层面：`shared_buffers`、`work_mem` 等参数（[第 15 章](第15章_用户权限与安全.md)后的进阶话题，先把 SQL 层做好）。

## 13.8 VACUUM：MVCC 的清洁工（概念了解）

[第 12 章](第12章_事务.md)说过 MVCC 靠多版本实现。被删除/更新的旧版本行不会立刻物理消失，由 **autovacuum**（后台自动运行）定期回收。日常无需手动干预；大批量删除后想立刻归还磁盘，管理员可执行：

```sql
VACUUM school.big_events;         -- 回收空间供表内复用
VACUUM ANALYZE school.big_events; -- 顺带刷新统计信息
VACUUM FULL school.big_events;    -- 物理重组归还磁盘（锁全表，维护窗口才用）
```

> 看到 `dead tuples` 增长异常、表膨胀，就是 autovacuum 跟不上了——监控它，但初学阶段交给自动机制即可。

## 本章小结

- 索引 = 有序目录，把 O(n) 扫表变 O(log n) 查找；主键/UNIQUE 自动有索引，**外键要手动建**；
- `EXPLAIN ANALYZE` 是优化的起点：Seq Scan/Index Scan、Index Cond、预估 vs 实际行数、Execution Time；
- 索引失效三宗罪：列上做运算、函数包裹（除非表达式索引）、隐式类型转换；前置 `%` 的 LIKE 不走索引；
- 复合索引列顺序有讲究；索引让读快写慢，按查询建而不是无脑堆；
- 深分页用 keyset、批量导入用 COPY、导入后 ANALYZE；VACUUM 负责 MVCC 版本清理。

练习：[scripts/练习_13_索引与EXPLAIN.sql](scripts/练习_13_索引与EXPLAIN.sql)。

---

> [📖 返回目录](README.md) · ⬅️ [上一章：第 12 章 事务](第12章_事务.md) · ➡️ [下一章：第 14 章 备份与恢复](第14章_备份与恢复.md)
