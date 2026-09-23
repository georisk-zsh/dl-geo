-- ============================================================
-- 《PostgreSQL 从零开始》脚本 01：创建学习用户、数据库、模式
--
-- 运行身份：管理员（postgres）
--   Linux:   sudo -u postgres psql -f 01_create_user_db.sql
--   macOS:   psql -U postgres -f 01_create_user_db.sql   （或你的超级用户）
--
-- 创建内容：
--   角色   student_pg   （登录密码 student_pg_2024，仅练习用）
--   数据库 beginner_pg  （归属 student_pg，UTF8）
--   模式   school       （归属 student_pg，并设为默认搜索路径）
--
-- ⚠️ 本脚本会先删除已存在的同名数据库/角色（便于反复重建），
--    如果 beginner_pg 里已有你的数据，请先备份！
-- ============================================================

-- ① 删旧（幂等：已存在才删，不存在则跳过）
DROP DATABASE IF EXISTS beginner_pg;   -- 若提示"有其他会话正在使用"，
                                       -- 先关闭占用它的 psql/pgAdmin 再重跑
DROP ROLE IF EXISTS student_pg;        -- 角色名下有对象时会报错，
                                       -- 删库之后再删角色通常就干净了

-- ② 建学习账号（LOGIN 属性 = 可登录；密码仅练习用途）
CREATE ROLE student_pg LOGIN PASSWORD 'student_pg_2024';

-- ③ 建数据库：归属 student_pg，UTF8 编码（中文必需）
CREATE DATABASE beginner_pg
    OWNER student_pg
    ENCODING 'UTF8'
    TEMPLATE template0;

-- ④ 进入新库（psql 元命令，切换当前连接）
\connect beginner_pg

-- ⑤ 在新库内建 school 模式，同样归属 student_pg
CREATE SCHEMA school AUTHORIZATION student_pg;

-- ⑥ 把 school 设为 student_pg 在本库的默认搜索路径
--    （之后 psql 里写 students 即等于 school.students，不用每次加前缀）
ALTER ROLE student_pg IN DATABASE beginner_pg
    SET search_path TO school, public;

-- 完成。验证：
--   \l    → 应看到 beginner_pg（Owner = student_pg）
--   \dn   → 应看到 school（Owner = student_pg）
--   \du   → 应看到 student_pg
--
-- 下一步：导入示例数据
--   psql -h localhost -U student_pg -d beginner_pg -f 02_school_schema.sql
