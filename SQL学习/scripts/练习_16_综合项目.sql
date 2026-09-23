-- ============================================================
-- 《PostgreSQL 从零开始》第 16 章综合项目：学生选课管理系统（school2）
--
-- 运行方式：
--   ① 以 student_pg 执行本文件主体（建模式/表/视图/函数/数据）：
--      psql -h localhost -U student_pg -d beginner_pg -f scripts/练习_16_综合项目.sql
--
--   ② 文件末尾【需要管理员权限】的段落（创建角色、授权）：
--      把那段复制出来，另存后以管理员执行：
--      sudo -u postgres psql -d beginner_pg -f 那个文件
--      （若直接用 student_pg 跑整份文件，末段会报 permission denied，属预期，不影响主体）
--
-- 项目结构：school2 模式 = school 的结构 + created_at 审计列 + 视图 + 函数 + 三级权限
-- ============================================================

-- ---------- ① 重建 school2 模式（可重复执行） ----------
DROP SCHEMA IF EXISTS school2 CASCADE;
CREATE SCHEMA school2 AUTHORIZATION student_pg;

-- ---------- ② 建表（与 school 相同设计，enrollments 增加 created_at 审计列） ----------
CREATE TABLE school2.departments (
    dept_id   integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    dept_name varchar(40) NOT NULL UNIQUE
);

CREATE TABLE school2.teachers (
    teacher_id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name       varchar(40) NOT NULL,
    title      varchar(20),
    hire_date  date,
    dept_id    integer REFERENCES school2.departments(dept_id)
);

CREATE TABLE school2.students (
    student_id  integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    student_no  varchar(12) NOT NULL UNIQUE,
    name        varchar(40) NOT NULL,
    gender      char(1) CHECK (gender IN ('M', 'F')),
    birth_date  date CHECK (birth_date > DATE '1980-01-01'),
    city        varchar(20),
    enrolled_on date DEFAULT CURRENT_DATE
);

CREATE TABLE school2.courses (
    course_id   integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    course_name varchar(60) NOT NULL,
    teacher_id  integer REFERENCES school2.teachers(teacher_id) ON DELETE SET NULL,
    credit      numeric(3,1) NOT NULL DEFAULT 2.0 CHECK (credit BETWEEN 0.5 AND 10),
    hours       integer DEFAULT 32 CHECK (hours > 0)
);

CREATE TABLE school2.enrollments (
    enrollment_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    student_id    integer NOT NULL REFERENCES school2.students(student_id)
                     ON DELETE CASCADE,
    course_id     integer NOT NULL REFERENCES school2.courses(course_id)
                     ON DELETE CASCADE,
    enrolled_on   date NOT NULL DEFAULT CURRENT_DATE,
    score         numeric(5,1) CHECK (score BETWEEN 0 AND 100),
    created_at    timestamptz NOT NULL DEFAULT now(),   -- 项目新增：操作留痕
    UNIQUE (student_id, course_id)
);

-- ---------- ③ 从 school 模式复制数据（显式列清单，created_at 走默认值） ----------
INSERT INTO school2.departments (dept_name)               SELECT dept_name FROM school.departments;
INSERT INTO school2.teachers (name, title, hire_date, dept_id)
    SELECT name, title, hire_date,
           (SELECT d2.dept_id FROM school2.departments d2
             WHERE d2.dept_name = d.dept_name)            -- 按名称重新映射编号
    FROM school.teachers t, school.departments d WHERE t.dept_id = d.dept_id;

INSERT INTO school2.students (student_no, name, gender, birth_date, city, enrolled_on)
    SELECT student_no, name, gender, birth_date, city, enrolled_on
    FROM school.students;

INSERT INTO school2.courses (course_name, teacher_id, credit, hours)
    SELECT c.course_name,
           (SELECT t2.teacher_id FROM school2.teachers t2
             JOIN school.teachers t1 ON t1.name = t2.name
             WHERE t1.teacher_id = c.teacher_id),          -- 教师按名对齐
           c.credit, c.hours
    FROM school.courses c;

INSERT INTO school2.enrollments (student_id, course_id, enrolled_on, score)
    SELECT (SELECT s2.student_id FROM school2.students s2
             WHERE s2.student_no = s.student_no),
           (SELECT c2.course_id FROM school2.courses c2
             WHERE c2.course_name = c.course_name),
           e.enrolled_on, e.score
    FROM school.enrollments e
    JOIN school.students s ON s.student_id = e.student_id
    JOIN school.courses  c ON c.course_id  = e.course_id;

-- 自检：数据应与 school 完全一致（5/6/15/8/42）
SELECT 'school2.departments' AS 对象, COUNT(*) FROM school2.departments
UNION ALL SELECT 'school2.teachers',    COUNT(*) FROM school2.teachers
UNION ALL SELECT 'school2.students',    COUNT(*) FROM school2.students
UNION ALL SELECT 'school2.courses',     COUNT(*) FROM school2.courses
UNION ALL SELECT 'school2.enrollments', COUNT(*) FROM school2.enrollments;

-- ---------- ④ 视图：对外查询接口 ----------
-- 视图 1：课程详情（课程+教师+院系+选课统计）
CREATE OR REPLACE VIEW school2.v_course_detail AS
SELECT c.course_id,
       c.course_name,
       c.credit,
       t.name      AS teacher_name,
       d.dept_name,
       COUNT(e.enrollment_id) AS enrolled_cnt,
       ROUND(AVG(e.score), 1) AS avg_score
FROM school2.courses c
LEFT JOIN school2.teachers    t ON t.teacher_id = c.teacher_id
LEFT JOIN school2.departments d ON d.dept_id    = t.dept_id
LEFT JOIN school2.enrollments e ON e.course_id  = c.course_id
GROUP BY c.course_id, c.course_name, c.credit, t.name, d.dept_name;

-- 视图 2：学生成绩单与挂科预警
CREATE OR REPLACE VIEW school2.v_transcript AS
SELECT s.student_no,
       s.name,
       COUNT(e.score)                              AS graded_cnt,
       ROUND(AVG(e.score), 1)                      AS avg_score,
       COUNT(*) FILTER (WHERE e.score < 60)        AS fail_cnt,
       CASE WHEN COUNT(e.score) = 0 THEN '无成绩'
            WHEN COUNT(*) FILTER (WHERE e.score < 60) = 0 THEN '正常'
            WHEN COUNT(*) FILTER (WHERE e.score < 60) <= 2 THEN '预警'
            ELSE '严重预警' END                     AS status
FROM school2.students s
LEFT JOIN school2.enrollments e ON e.student_id = s.student_id
GROUP BY s.student_no, s.name;

-- 视图试用：
SELECT * FROM school2.v_course_detail WHERE enrolled_cnt >= 3 ORDER BY enrolled_cnt DESC;
SELECT * FROM school2.v_transcript WHERE status <> '正常' ORDER BY fail_cnt DESC;
-- 预警名单：刘洋/陈静/周涛/郑浩/蒋鑫（各挂 1 门），曹阳显示"无成绩"

-- ---------- ⑤ 函数：带校验的成绩登记 ----------
CREATE OR REPLACE FUNCTION school2.fn_set_score(
    p_student_no  varchar,
    p_course_name varchar,
    p_score       numeric)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
    v_sid integer;
    v_cid integer;
BEGIN
    SELECT student_id INTO v_sid FROM school2.students WHERE student_no = p_student_no;
    SELECT course_id  INTO v_cid FROM school2.courses  WHERE course_name = p_course_name;

    IF v_sid IS NULL OR v_cid IS NULL THEN
        RETURN '错误：学生或课程不存在';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM school2.enrollments
                   WHERE student_id = v_sid AND course_id = v_cid) THEN
        RETURN '错误：该学生未选此课程';
    END IF;

    UPDATE school2.enrollments
    SET score = p_score
    WHERE student_id = v_sid AND course_id = v_cid;
    RETURN '已登记：' || p_student_no || ' 的 ' || p_course_name || ' = ' || p_score;
END;
$$;

-- 函数测试（三次成功 + 三次被拒绝）：
SELECT school2.fn_set_score('S2023003', '数据库原理', 91.5);   -- 张芳：正常登记
SELECT school2.fn_set_score('S2023003', '不存在的课', 80);     -- → 错误：学生或课程不存在
SELECT school2.fn_set_score('S2023999', '数据库原理', 80);     -- → 错误：学生或课程不存在
SELECT school2.fn_set_score('S2023015', '数据库原理', 80);     -- → 错误：该学生未选此课程（曹阳没选课）
SELECT school2.fn_set_score('S2023004', '线性代数', 61);       -- 刘洋补考通过 58→61
SELECT score FROM school2.enrollments e
JOIN school2.students s ON s.student_id = e.student_id
WHERE s.student_no = 'S2023003' AND e.course_id = 1;           -- 验证已写入 91.5

-- 把函数测试改过的数据复原（按 school 原值）
UPDATE school2.enrollments SET score = 78
WHERE student_id = (SELECT student_id FROM school2.students WHERE student_no='S2023003')
  AND course_id  = 1;
UPDATE school2.enrollments SET score = 58
WHERE student_id = (SELECT student_id FROM school2.students WHERE student_no='S2023004')
  AND course_id  = 4;

-- ---------- ⑥ 索引：审计查询要用的列 ----------
CREATE INDEX idx_s2_enroll_created ON school2.enrollments (created_at);
CREATE INDEX idx_s2_enroll_student ON school2.enrollments (student_id);
-- 按月留痕统计（索引的用武之地）：
SELECT date_trunc('month', created_at) AS 操作月份, COUNT(*)
FROM school2.enrollments
GROUP BY 1 ORDER BY 1;

-- ============================================================
-- ⑦ 权限部分 —— 【需要管理员权限执行】
--   退出当前 psql，复制下面整段存为 grant.sql，然后：
--     sudo -u postgres psql -d beginner_pg -f grant.sql
--   （直接用 student_pg 跑本文件时，这段会报 permission denied，属预期）
-- ============================================================
/*
-- 清理旧角色（重复执行时先回收其权限再删）
DROP OWNED BY teacher_li, jw_admin, student_reader, teacher_grp;
DROP ROLE IF EXISTS teacher_li;
DROP ROLE IF EXISTS jw_admin;
DROP ROLE IF EXISTS student_reader;
DROP ROLE IF EXISTS teacher_grp;

-- 教务管理员：school2 全部读写
CREATE ROLE jw_admin LOGIN PASSWORD 'jw_admin_2024';
GRANT USAGE, CREATE ON SCHEMA school2 TO jw_admin;
GRANT ALL ON ALL TABLES IN SCHEMA school2 TO jw_admin;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA school2 TO jw_admin;  -- IDENTITY 序列也要授权
ALTER DEFAULT PRIVILEGES FOR ROLE student_pg IN SCHEMA school2
    GRANT ALL ON TABLES TO jw_admin;

-- 教师组：只读 + 通过函数改成绩（不能直接 UPDATE 表，防绕过校验）
CREATE ROLE teacher_grp NOLOGIN;
GRANT USAGE ON SCHEMA school2 TO teacher_grp;
GRANT SELECT ON ALL TABLES IN SCHEMA school2 TO teacher_grp;
GRANT EXECUTE ON FUNCTION school2.fn_set_score(varchar, varchar, numeric) TO teacher_grp;
ALTER DEFAULT PRIVILEGES FOR ROLE student_pg IN SCHEMA school2
    GRANT SELECT ON TABLES TO teacher_grp;

CREATE ROLE teacher_li LOGIN PASSWORD 'teacher_li_2024';
GRANT teacher_grp TO teacher_li;

-- 学生演示账号：只看成绩单视图
CREATE ROLE student_reader LOGIN PASSWORD 'student_2024';
GRANT USAGE ON SCHEMA school2 TO student_reader;
GRANT SELECT ON school2.v_transcript TO student_reader;

-- 验证（分别用新账号连接）：
--   psql -h localhost -U teacher_li  -d beginner_pg
--     → SELECT * FROM school2.v_transcript LIMIT 3;              ✓ 可以
--     → UPDATE school2.enrollments SET score=100;               ✗ permission denied
--     → SELECT school2.fn_set_score('S2023004','大学物理',63);   ✓ 走函数改分成功
--   psql -h localhost -U student_reader -d beginner_pg
--     → SELECT * FROM school2.v_transcript WHERE student_no='S2023001';  ✓
--     → SELECT * FROM school2.students;                         ✗ permission denied
*/

-- ---------- ⑧ 项目收尾：备份（终端里执行，不是 SQL） ----------
/*
pg_dump -h localhost -U student_pg -d beginner_pg -Fc -f school2_project.dump
pg_restore --list school2_project.dump | head     # 检查备份内容可读
# 交付文档三件套（表结构 \d 说明 / 视图函数用法 / 运维手册）见教程 16.5 节
*/
