-- ============================================================
-- 《PostgreSQL 从零开始》脚本 02：建表 + 示例数据（school 模式）
--
-- 运行身份：student_pg（普通用户即可）
--   psql -h localhost -U student_pg -d beginner_pg -f 02_school_schema.sql
--
-- 本脚本【可重复执行】：每次都会删掉 school 模式并重建，
-- 因此随时可以"一键恢复初始数据"（练习被改乱时重跑即可）。
--
-- 数据规模：5 院系 / 6 教师 / 15 学生 / 8 课程 / 42 条选课记录
-- 设计要点（对应教程第 5 章）：
--   · 主键用 GENERATED ALWAYS AS IDENTITY（数据库自动发号）
--   · enrollments.score 允许 NULL（在读未考试）
--   · 学生 11（郑浩）city 为 NULL（练习 NULL 处理）
--   · 学生 15（曹阳）没有任何选课（练习 LEFT JOIN 找"没有"）
--   · 课程 8（数据结构）仅 2 人选（低选课人数场景）
--   · 5 名学生有挂科记录（练习聚合过滤与预警查询）
-- ============================================================

-- ① 重建模式（CASCADE 连同内部所有表一起删）
DROP SCHEMA IF EXISTS school CASCADE;
CREATE SCHEMA school AUTHORIZATION student_pg;

-- ② 建表顺序：先被引用的表（外键指向它），删除顺序则相反
-- 2.1 院系表（最底层，被 teachers 引用）
CREATE TABLE school.departments (
    dept_id   integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    dept_name varchar(40) NOT NULL UNIQUE              -- 院系名不许重复
);

-- 2.2 教师表（dept_id 外键 → departments）
CREATE TABLE school.teachers (
    teacher_id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name       varchar(40) NOT NULL,
    title      varchar(20),                            -- 职称：教授/副教授/讲师
    hire_date  date,
    dept_id    integer REFERENCES school.departments(dept_id)
);

-- 2.3 学生表
CREATE TABLE school.students (
    student_id  integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    student_no  varchar(12) NOT NULL UNIQUE,           -- 学号唯一
    name        varchar(40) NOT NULL,
    gender      char(1) CHECK (gender IN ('M', 'F')), -- 性别只允许 M/F
    birth_date  date CHECK (birth_date > DATE '1980-01-01'),
    city        varchar(20),                           -- 可为 NULL（未填写）
    enrolled_on date DEFAULT CURRENT_DATE              -- 入学日期
);

-- 2.4 课程表（teacher_id 外键 → teachers，删教师时课程保留、教师置空）
CREATE TABLE school.courses (
    course_id   integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    course_name varchar(60) NOT NULL,
    teacher_id  integer REFERENCES school.teachers(teacher_id)
                    ON DELETE SET NULL,
    credit      numeric(3,1) NOT NULL DEFAULT 2.0
                    CHECK (credit BETWEEN 0.5 AND 10), -- 学分：精确小数
    hours       integer DEFAULT 32 CHECK (hours > 0)
);

-- 2.5 选课表（双外键 + 复合唯一：同一学生同一课程只能选一次）
CREATE TABLE school.enrollments (
    enrollment_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    student_id    integer NOT NULL
                    REFERENCES school.students(student_id)
                    ON DELETE CASCADE,                 -- 删学生 → 选课记录级联删除
    course_id     integer NOT NULL
                    REFERENCES school.courses(course_id)
                    ON DELETE CASCADE,
    enrolled_on   date NOT NULL DEFAULT CURRENT_DATE,  -- 选课日期
    score         numeric(5,1) CHECK (score BETWEEN 0 AND 100),  -- NULL=在读未考
    UNIQUE (student_id, course_id)
);

-- ③ 表注释（psql 里 \d+ 表名 可见，也可以在 pgAdmin 中查看）
COMMENT ON TABLE  school.departments IS '院系表：学院/系的基础信息';
COMMENT ON TABLE  school.teachers    IS '教师表：属于某个院系（dept_id 外键）';
COMMENT ON TABLE  school.students    IS '学生表：学号 student_no 唯一，city 可为空';
COMMENT ON TABLE  school.courses     IS '课程表：由某位教师开设（teacher_id 外键）';
COMMENT ON TABLE  school.enrollments IS '选课成绩表：多对多关系表，score 为 NULL 表示在读未考';

-- ④ 示例数据
-- 4.1 院系（5 行）
INSERT INTO school.departments (dept_name) VALUES
    ('计算机科学与技术学院'),
    ('数学科学学院'),
    ('外国语学院'),
    ('物理学院'),
    ('经济管理学院');

-- 4.2 教师（6 行；最后一列是 dept_id）
INSERT INTO school.teachers (name, title, hire_date, dept_id) VALUES
    ('张伟', '教授',   DATE '2010-09-01', 1),
    ('李娜', '副教授', DATE '2015-03-15', 1),
    ('王强', '讲师',   DATE '2020-09-01', 2),
    ('刘敏', '教授',   DATE '2012-06-20', 3),
    ('陈杰', '副教授', DATE '2018-09-10', 4),
    ('赵丽', '讲师',   DATE '2021-02-28', 5);

-- 4.3 学生（15 行；注意：郑浩 city 为 NULL，4 人为 2022 级）
INSERT INTO school.students (student_no, name, gender, birth_date, city, enrolled_on) VALUES
    ('S2023001', '王小明', 'M', DATE '2005-03-12', '北京', DATE '2023-09-01'),
    ('S2023002', '李华',   'F', DATE '2004-07-25', '上海', DATE '2023-09-01'),
    ('S2023003', '张芳',   'F', DATE '2005-01-08', '广州', DATE '2023-09-01'),
    ('S2023004', '刘洋',   'M', DATE '2004-11-30', '深圳', DATE '2023-09-01'),
    ('S2023005', '陈静',   'F', DATE '2005-05-17', '成都', DATE '2023-09-01'),
    ('S2023006', '杨帆',   'M', DATE '2004-09-03', '杭州', DATE '2023-09-01'),
    ('S2023007', '赵磊',   'M', DATE '2003-12-21', '北京', DATE '2022-09-01'),
    ('S2023008', '孙丽',   'F', DATE '2004-04-14', '北京', DATE '2023-09-01'),
    ('S2023009', '周涛',   'M', DATE '2005-08-02', '西安', DATE '2023-09-01'),
    ('S2023010', '吴倩',   'F', DATE '2004-06-19', '南京', DATE '2022-09-01'),
    ('S2023011', '郑浩',   'M', DATE '2003-10-27', NULL,   DATE '2022-09-01'),
    ('S2023012', '冯雪',   'F', DATE '2005-02-05', '天津', DATE '2023-09-01'),
    ('S2023013', '蒋鑫',   'M', DATE '2004-12-09', '苏州', DATE '2023-09-01'),
    ('S2023014', '韩梅',   'F', DATE '2005-04-28', '长沙', DATE '2023-09-01'),
    ('S2023015', '曹阳',   'M', DATE '2004-08-16', '郑州', DATE '2022-09-01');

-- 4.4 课程（8 行；最后一列是学时）
INSERT INTO school.courses (course_name, teacher_id, credit, hours) VALUES
    ('数据库原理',       1, 3.5, 48),
    ('Python 程序设计',  2, 3.0, 48),
    ('高等数学(下)',     3, 4.0, 64),
    ('线性代数',         3, 3.0, 48),
    ('大学英语(四)',     4, 2.5, 32),
    ('大学物理',         5, 3.0, 48),
    ('微观经济学',       6, 3.0, 48),
    ('数据结构',         1, 4.0, 64);

-- 4.5 选课记录（42 行）
--    三条 score 为 NULL：陈静/微观经济学、郑浩/高等数学、韩梅/微观经济学（在读）
--    学生 15（曹阳）故意没有任何选课记录
INSERT INTO school.enrollments (student_id, course_id, enrolled_on, score) VALUES
    ( 1, 1, DATE '2023-09-04', 92.0),   -- 王小明·数据库原理
    ( 1, 3, DATE '2023-09-04', 85.0),   -- 王小明·高等数学(下)
    ( 1, 8, DATE '2023-09-04', 88.0),   -- 王小明·数据结构
    ( 2, 1, DATE '2023-09-04', 88.0),
    ( 2, 5, DATE '2023-09-04', 91.0),
    ( 2, 3, DATE '2023-09-04', 79.0),
    ( 3, 1, DATE '2023-09-04', 78.0),
    ( 3, 2, DATE '2023-09-04', 84.0),
    ( 3, 7, DATE '2023-09-04', 73.0),
    ( 4, 2, DATE '2023-09-04', 66.0),
    ( 4, 4, DATE '2023-09-04', 58.0),   -- 刘洋·线性代数：不及格
    ( 4, 6, DATE '2023-09-04', 62.0),
    ( 5, 1, DATE '2023-09-04', 68.0),
    ( 5, 6, DATE '2023-09-04', 55.0),   -- 陈静·大学物理：不及格（第 6 章补考示例）
    ( 5, 7, DATE '2024-09-02', NULL),   -- 陈静·微观经济学：在读未考
    ( 6, 3, DATE '2023-09-04', 90.0),
    ( 6, 4, DATE '2023-09-04', 82.0),
    ( 6, 6, DATE '2023-09-04', 74.0),
    ( 7, 1, DATE '2023-02-20', 71.0),
    ( 7, 2, DATE '2023-02-20', 77.0),
    ( 7, 5, DATE '2023-02-20', 64.0),
    ( 8, 2, DATE '2023-09-04', 95.0),
    ( 8, 4, DATE '2023-09-04', 88.0),
    ( 8, 7, DATE '2023-09-04', 80.0),
    ( 9, 1, DATE '2023-09-04', 59.0),   -- 周涛·数据库原理：不及格
    ( 9, 3, DATE '2023-09-04', 65.0),
    ( 9, 8, DATE '2023-09-04', 72.0),
    (10, 5, DATE '2023-02-20', 93.0),
    (10, 7, DATE '2023-02-20', 86.0),
    (10, 4, DATE '2023-02-20', 70.0),
    (11, 1, DATE '2023-02-20', 83.0),
    (11, 6, DATE '2023-02-20', 49.0),   -- 郑浩·大学物理：不及格
    (11, 3, DATE '2024-09-02', NULL),   -- 郑浩·高等数学(下)：在读未考
    (12, 2, DATE '2023-09-04', 89.0),
    (12, 5, DATE '2023-09-04', 76.0),
    (12, 1, DATE '2023-09-04', 81.0),
    (13, 4, DATE '2023-09-04', 61.0),
    (13, 3, DATE '2023-09-04', 55.0),   -- 蒋鑫·高等数学(下)：不及格
    (13, 6, DATE '2023-09-04', 68.0),
    (14, 2, DATE '2023-09-04', 92.0),
    (14, 7, DATE '2024-09-02', NULL),   -- 韩梅·微观经济学：在读未考
    (14, 5, DATE '2023-09-04', 87.0);

-- ⑤ 自检：五个数字对得上，说明数据完整
SELECT 'departments' AS 表, COUNT(*) AS 行数 FROM school.departments
UNION ALL SELECT 'teachers',    COUNT(*) FROM school.teachers
UNION ALL SELECT 'students',    COUNT(*) FROM school.students
UNION ALL SELECT 'courses',     COUNT(*) FROM school.courses
UNION ALL SELECT 'enrollments', COUNT(*) FROM school.enrollments;
-- 预期：5 / 6 / 15 / 8 / 42

SELECT COUNT(*) FILTER (WHERE score IS NULL) AS 在读未考,
       COUNT(*) FILTER (WHERE score < 60)    AS 不及格记录
FROM school.enrollments;
-- 预期：在读未考 3、不及格记录 5
