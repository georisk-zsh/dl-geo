# 附录 D 章节自测与面试题

这份附录有两个用途：

1. **学完一章就自测一章**——第一部分按章给出 5 道题，覆盖概念辨析、读代码说结果、写 SQL 小任务三类；每章题目后面跟一份折叠的答案解析，先自己做，做完再展开对答案。
2. **面试/复习前集中过一遍**——第二部分是按主题分组的面试题，标注了难度（🟢基础 / 🟡进阶 / 🔴加分项），答案可以当背记材料。

**做题前的两个约定**

- 所有 SQL 都基于教程的示例库：数据库 `beginner_pg`、用户 `student_pg`、模式 `school`，五张表 `departments / teachers / students / courses / enrollments`。
- 如果练习把数据改乱了，先跑一次重置脚本再做题：
  ```bash
  $ psql -h localhost -U student_pg -d beginner_pg -f scripts/03_reset_school.sql
  ```

**示例数据速查（做题时会反复用到）**

| 项目 | 数值 |
|---|---|
| 院系 / 教师 / 学生 / 课程 | 5 / 6 / 15 / 8 |
| 选课记录 | 42 条 |
| 其中 score 为 NULL（在读未考） | 3 条（陈静·微观经济学、郑浩·高等数学(下)、韩梅·微观经济学） |
| 其中不及格（score < 60） | 5 条（分属 5 名学生） |
| 有成绩的记录 | 39 条 |
| 没有任何选课记录的学生 | 1 名（S2023015 曹阳） |
| city 为 NULL 的学生 | 1 名（S2023011 郑浩） |
| 选课人数最少的课程 | 数据结构（仅 2 人） |

> 以下出现的每一个数字（行数、人数、分数）都是用 `scripts/02_school_schema.sql` 的数据核过的。如果和你的结果对不上，先确认数据没被前面的练习改过。

---

# 第一部分 章节自测题

## 第 0 章 自测：你具备开始条件了吗

> 本章没有 SQL 题，只有一份"开工前检查清单"。**全部能打勾，才建议进入[第 1 章](第01章_数据库基础概念.md)。**

- [ ] 我能打开终端（Ubuntu 桌面 `Ctrl + Alt + T`；macOS 用"终端"；Windows 用 PowerShell）；
- [ ] 我知道在 Linux 终端里粘贴是 `Ctrl + Shift + V`，不是 `Ctrl + V`；
- [ ] 我知道教程里形如 `$ sudo apt update` 的 `$` 是提示符，不需要自己输入；
- [ ] 我知道 psql 里每条 SQL 必须以**分号 `;`** 结尾，而 `\` 开头的元命令不用；
- [ ] 我知道按上箭头 `↑` 可以翻出上一条命令，`Ctrl + C` 可以中断正在跑的命令；
- [ ] 我能说出至少三类危险操作：`rm -rf`、`DROP TABLE/DATABASE`、**不带 WHERE 的 UPDATE/DELETE**；
- [ ] 我记住了危险操作三板斧：**先 SELECT 预览 → 用事务包住 → 改重要数据先备份**；
- [ ] 我知道练习库改坏了可以运行 `scripts/03_reset_school.sql` 一键还原。

<details><summary>查看答案解析</summary>

这是一份自查清单，没有对错之分，只有"准备好了"和"还没准备好"。

任何一条打不了勾，回到[第 0 章](第00章_学习准备.md)对应小节补上：

- 粘贴方式、命令历史、中断命令 → 0.8 节；
- 提示符的含义、分号的作用、三种内容框的区别 → 0.9 节；
- 危险操作清单与防御三招 → 0.10 节。

> 特别提醒：0.10 节提到的"先 SELECT 再改"，会在[第 6 章](第06章_数据的增删改.md)和[第 12 章](第12章_事务.md)反复出现，是本书最重要的一条操作习惯。

</details>

## 第 1 章 数据库基础概念

1. **判断**：在 PostgreSQL 里，`database` 和 `schema` 是同义词，只是两种叫法。（　）
2. **选择**：在 `beginner_pg.school.students` 这个写法里，`students` 是（　）。
   A. 一台服务器　B. 一个数据库　C. 一张表　D. 一个模式
3. **概念**：主键（Primary Key）有哪三条硬规矩？为什么说"手机号"不适合当主键？
4. **读场景说结果**：往 `school.enrollments` 里插入一条 `student_id = 999, course_id = 1` 的记录，会发生什么？为什么？
5. **写 SQL**：写出"查询 `beginner_pg` 库里 `school` 模式下 `students` 表全部数据"的完整三层写法，并说明平时为什么可以省略库名前缀。

<details><summary>查看答案解析</summary>

1. **答案：错**。
   解析：`database` 和 `schema` 是**同义词**的说法属于 MySQL——MySQL 里 `CREATE DATABASE` 和 `CREATE SCHEMA` 是一回事。PostgreSQL 里它们是两层不同的结构：一个数据库里面可以有多个模式，模式是"数据库内部的命名空间/文件夹"。

2. **答案：C**。
   解析：完整写法是 `库.模式.表`，所以 `beginner_pg` 是数据库、`school` 是模式、`students` 是表。

3. **答案**：唯一（任意两行的主键值不能相同）、非空（必须填写）、稳定（一旦确定尽量不变）。
   解析：手机号不适合当主键，因为它违反了"稳定"这条——学生会换号。学号才是天然主键（每人一个、不变、唯一）。另外学号本身是业务信息，所以示例里另用自增整数 `student_id` 当主键，学号放 `UNIQUE` 约束，这是更稳妥的做法。

4. **答案：报外键约束错误，插入被拒绝**。
   解析：`enrollments.student_id` 是指向 `school.students(student_id)` 的外键，数据库要求这个值必须在 `students` 里已存在。示例数据只有 15 名学生（student_id 1~15），999 号不存在，所以会被拒绝。报错大意是 `violates foreign key constraint`，`DETAIL` 行会写 `Key (student_id)=(999) is not present in table "students"`。这正是外键"防止脏数据"的价值。

5. **答案**：
   ```sql
   SELECT * FROM beginner_pg.school.students;   -- 完整三层写法
   ```
   平时可以省略库名，是因为连接时已经用 `-d beginner_pg` 指定了当前库：
   ```bash
   $ psql -h localhost -U student_pg -d beginner_pg
   ```
   已连接的库就是"当前库"，所以日常写成 `school.students` 即可；再配合[第 4 章](第04章_数据库用户与模式.md)的 `search_path`，连 `school.` 前缀也能省。

</details>

## 第 2 章 安装与服务管理

1. **判断**：在 Ubuntu 上用 `apt install postgresql-16` 装完，PostgreSQL 服务会**自动启动**。（　）
2. **选择**：下面哪个是 PostgreSQL 的**数据目录**（里面放着真正的数据，删了就毁灭）？
   A. `/etc/postgresql/16/main/`　B. `/var/lib/postgresql/16/main/`　C. `/var/log/postgresql/`　D. `/usr/share/postgresql/`
3. **问答**：`sudo -u postgres psql` 为什么不需要输入密码就能进？
4. **操作**：改完 `pg_hba.conf` 后想让新规则生效，应该用 `reload` 还是 `restart`？为什么？哪些改动反而必须 `restart`？
5. **场景**：数据库装在云服务器上，为什么推荐"SSH 隧道"而不是把 5432 端口开放到公网？另外，SSH 会话里填的 Username 和数据库用户 `student_pg` 是同一回事吗？

<details><summary>查看答案解析</summary>

1. **答案：对**。
   解析：Ubuntu/Debian 的包安装完成后会自动启动服务并设置开机自启，用 `pg_lsclusters` 能看到 `Status = online`。注意 RHEL / Rocky / CentOS 系**不会**自动启动，需要 `sudo systemctl enable --now postgresql-16`。

2. **答案：B**。
   解析：
   - `/var/lib/postgresql/16/main/` → **数据目录**（所有数据真正存放的地方，绝不要手动删改）；
   - `/etc/postgresql/16/main/` → **配置目录**（`postgresql.conf`、`pg_hba.conf`）；
   - `/var/log/postgresql/` → **日志目录**（出错第一站）。

3. **答案**：因为 `sudo -u postgres` 是"以 Linux 系统用户 postgres 的身份执行命令"。
   解析：PostgreSQL 在 Linux 上装了之后会自动创建一个同名的系统用户 `postgres`。不写 `-h` 时连接走本机 Unix 套接字，默认认证方式是 `peer`——校验的是**系统用户名和数据库用户名是否一致**，不检查密码。因为此时系统用户和数据库用户都叫 postgres，所以直接放行。这也是为什么这个账号"初始没有密码、禁止远程登录"。

4. **答案**：用 `reload`。
   解析：`reload` 只是让服务重新读取配置文件，**不断开现有连接**；`restart` 会停掉整个服务、断开所有连接，在生产服务器上随手 restart 会影响正在使用数据库的人。改完用：
   ```bash
   $ sudo pg_ctlcluster 16 main reload
   ```
   反过来，`listen_addresses` 这类**启动参数**（决定服务监听哪个地址/端口）改了以后必须 `restart` 才能生效。

5. **答案**：
   - SSH 隧道让**数据库端口从公网上彻底消失**——你连的是本机的一个端口，SSH 把流量加密后送到服务器的 `127.0.0.1:5432`。好处：5432 不暴露给全网扫描、服务器配置零改动（`listen_addresses` 保持默认 `localhost` 即可）、换网络换 IP 也不用改 `pg_hba.conf` 和防火墙；直连方案则要改两个配置文件 + 防火墙/安全组，攻击面大得多。
   - **不是同一回事**，这是新手最大的混淆点：
     - SSH 会话说到底用的是 **Linux 系统账号**（如 `ubuntu`）→ 决定你能否登录这台服务器、能碰系统里哪些文件；
     - `student_pg` 是**数据库账号** → 决定你登录服务器之后能否连数据库、能查哪些表。

     两套体系完全独立：能 SSH 上服务器 ≠ 能连数据库。

</details>

## 第 3 章 psql 与 pgAdmin

1. **判断**：psql 的元命令（如 `\dt`）也必须用分号结尾才会执行。（　）
2. **选择**：想查看 `students` 表的列名、类型、约束和索引，应该用哪个命令？
   A. `\dt students`　B. `\d students`　C. `\l students`　D. `\du students`
3. **读报错**：psql 报出下面这段，怎么读？
   ```text
   ERROR:  syntax error at or near "FORM"
   LINE 1: SELECT * FORM students;
                    ^
   ```
4. **写元命令**：写出完成下面三件事的元命令——① 列出 `school` 模式下的所有表；② 把 NULL 显示成 `∅`；③ 显示每条 SQL 的耗时。
5. **问答**：提示符 `beginner_pg=>`、`postgres=#`、`beginner_pg->` 分别表示什么状态？

<details><summary>查看答案解析</summary>

1. **答案：错**。
   解析：`\` 开头的是**元命令**，是发给 psql 自己处理的（不是 SQL，也没发给服务器），回车立即执行，**不需要分号**。需要分号的是 SQL 语句。

2. **答案：B**。
   解析：`\d 表名` 看表结构（列、类型、可空性、默认值、索引、约束全在里面）；`\d+ 表名` 还附带注释等更多细节。`\dt` 是列**表清单**，`\l` 列数据库，`\du` 列角色。

3. **答案**：三步读法——**看 ERROR 一行（错什么）→ 看 `^` 指的位置（错在哪）→ 回头改**。
   解析：这条报的是 `syntax error at or near "FORM"`，`^` 正好指向 `FORM`：`FROM` 拼错了。psql 的报错永远先看 ERROR 行和最下面的位置箭头，比通读整段有用得多。
   顺便记住：中文输入法是新手隐形杀手——SQL 关键词、逗号、引号、分号必须是半角英文。报 `syntax error` 又找不到原因时，把这一段删掉重打。

4. **答案**：
   ```sql
   \dt school.*        -- ① 列出 school 模式下的表
   \pset null ∅        -- ② NULL 显示成 ∅，一眼区分"空值"和"空字符串"
   \timing on          -- ③ 之后每条 SQL 都显示耗时（毫秒），再敲一次 \timing off 关闭
   ```

5. **答案**：
   - `beginner_pg=>` → 普通用户（末尾是 `=>`），当前连的库是 `beginner_pg`；
   - `postgres=#` → 超级管理员（末尾是 `#`），当前库是 `postgres`；
   - `beginner_pg->` → 上一句 SQL **还没写完**（最常见的原因是忘了分号），psql 在等你继续输入，补一个 `;` 回车即可；想放弃这条语句用 `\r` 清空或 `Ctrl + C` 取消。

   > 敲 SQL 之前扫一眼提示符，确认"我是谁、在哪个库"——这是防错第一课。

</details>

## 第 4 章 数据库用户与模式

1. **判断**：`CREATE ROLE pg_student LOGIN PASSWORD 'xxx';` 能成功创建这个角色。（　）
2. **选择**：`search_path` 的作用是（　）。
   A. 指定数据文件存放的目录
   B. 指定"不写模式前缀时，按什么顺序去找表"
   C. 指定用户登录时的默认密码
   D. 指定服务器监听的端口
3. **写 SQL**：以管理员身份完成三件事——创建可登录角色 `student_pg`（密码 `student_pg_2024`）、创建数据库 `beginner_pg` 并指定其所有者为 `student_pg`、在该库里创建模式 `school` 并归 `student_pg` 所有。
4. **读代码说结果**：`SHOW search_path;` 返回 `school, public`。那么执行 `SELECT * FROM students;` 时，数据库会去哪里找这张表？
5. **问答**：PostgreSQL 15 起，`public` 模式的建表权限发生了什么变化？为什么教程里的 `student_pg` **仍然**能在 `public` 里建表？

<details><summary>查看答案解析</summary>

1. **答案：错**。
   解析：`pg_` 前缀的角色名被 PostgreSQL 保留给系统角色（如 `pg_read_all_data`、`pg_monitor`），自建角色一律避开。这条语句会报：
   ```text
   ERROR:  role name "pg_student" is reserved
   DETAIL:  Role names starting with "pg_" are reserved.
   ```
   教程里示例用户叫 `student_pg` 而不是 `pg_student`，正是这个原因。

2. **答案：B**。
   解析：`search_path` 决定"不写模式前缀时按什么顺序找表"。默认值是 `"$user", public`；教程的脚本 01 把它设成了 `school, public`，所以可以直接写 `students` 而不用写 `school.students`。

3. **答案**（注意第 2、3 句要在不同会话里执行）：
   ```sql
   -- 管理员会话里
   CREATE ROLE student_pg LOGIN PASSWORD 'student_pg_2024';
   CREATE DATABASE beginner_pg OWNER student_pg ENCODING 'UTF8';

   \connect beginner_pg                     -- 元命令：切进新库
   CREATE SCHEMA school AUTHORIZATION student_pg;
   ```
   数据库必须由管理员或有 `CREATEDB` 权限的角色创建；模式是**在具体的某个数据库内部**创建的，所以要先 `\c` 切进去。
   教程还多做了一步（重要）：
   ```sql
   ALTER ROLE student_pg IN DATABASE beginner_pg SET search_path = school, public;
   ```

4. **答案**：先找 `school.students`（找到了就用），找不到再找 `public.students`；两个都没有才报 `relation "students" does not exist`。
   解析：`search_path` 是**从左到右**依次尝试的。初学者常见的 `relation does not exist` 报错，一个高频原因就是表建在 `school` 里，而搜索路径里没有 `school`。

5. **答案**：PG 15 起，`public` 模式的 `CREATE` 权限从"所有人都有"收紧为"**仅数据库所有者**"（PG 14 及更早任何角色都能在 public 里建表），这是安全改进而不是 bug。
   解析：为什么 `student_pg` 还能建？因为我们是 `CREATE DATABASE beginner_pg OWNER student_pg`——`student_pg` 就是本库的**所有者**，而 PG 15 起 `public` 模式的所有者是特殊角色 `pg_database_owner`（"当前数据库所有者"的占位符），库主天然拥有 public 模式的全部权限。
   真正会被挡住的，是**非本库所有者的普通角色**（比如[第 15 章](第15章_用户权限与安全.md)的只读账号 `ta_reader`），它会报 `permission denied for schema public`。所以"库主在 public 里建不了表"是个常见误解——但业务表放进自己的模式（`school`）依然是更好的习惯。

</details>

## 第 5 章 建表：数据类型与约束

1. **选择**：下面哪个类型最适合存"成绩、金额"这类要求分毫不差的数值？
   A. `real`　B. `double precision`　C. `numeric(5,1)`　D. `text`
2. **判断**：一张表**只能有一个主键**，但**可以有多个 UNIQUE 约束**。（　）
3. **写 SQL**：创建一张社团表 `school.clubs`，要求：`club_id` 自增整数主键；`club_name` 必填且不允许重复；`members`（人数）必填、默认为 0、且不能小于 0。
4. **问答**：`enrollments` 表上的 `UNIQUE (student_id, course_id)` 是干什么用的？它和这条记录上的两个外键管的是同一件事吗？
5. **读报错说原因**：执行下面这条语句后报错，为什么？
   ```sql
   INSERT INTO school.students (student_no, name, birth_date)
   VALUES ('S2023099', '穿越者', DATE '1900-01-01');

   -- ERROR: new row for relation "students" violates check constraint
   --        "students_birth_date_check"
   ```

<details><summary>查看答案解析</summary>

1. **答案：C**。
   解析：`numeric(p, s)` 是**精确小数**，不会有浮点误差。`real` / `double precision` 是近似值类型，经典陷阱是 `0.1 + 0.2` 算出 `0.30000000000000004`。凡是"分毫不差"的数值（金额、分数、利率）一律用 `numeric`，示例里 `credit numeric(3,1)`、`score numeric(5,1)` 都是这个道理。

2. **答案：对**。
   解析：主键自带"唯一 + 非空"，一张表只能有一个（可以是由多列组成的复合主键）。`UNIQUE` 约束一张表可以有多个，而且**允许 NULL**（主键不允许）——所以 `student_no` 用 `NOT NULL UNIQUE` 而不是主键。

3. **答案**：
   ```sql
   CREATE TABLE school.clubs (
       club_id    integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
       club_name  varchar(40) NOT NULL UNIQUE,
       members    integer NOT NULL DEFAULT 0 CHECK (members >= 0)
   );
   ```
   解析：这一句把四个知识点都用上了——`GENERATED ALWAYS AS IDENTITY` 自增主键、`NOT NULL` 必填、`UNIQUE` 不重复、`DEFAULT` 默认值 + `CHECK` 自定义校验。

4. **答案**：`UNIQUE (student_id, course_id)` 是**复合唯一约束**，保证"同一个学生、同一门课程只能有一条选课记录"，也就是防止重复选课。
   解析：它和两个外键**管的是不同的事**：
   - **外键**（`REFERENCES students` / `REFERENCES courses`）管"**引用的 id 必须存在**"——不能给不存在的学生或课程建选课记录；
   - **复合唯一约束**管"**同一个人不能重复选同一门课**"。

   两者互补，缺一不可。

5. **答案**：`students.birth_date` 上有 `CHECK (birth_date > DATE '1980-01-01')`，而 `1900-01-01` 不满足这个条件，所以被拒绝。
   解析：约束是**在写入时**由数据库强制执行的——不管你是从 psql 敲进去、还是应用代码写进去、甚至是别人直连数据库塞进去，违规数据都进不了库。每一声报错都是数据库在替你挡脏数据。

</details>

## 第 6 章 数据的增删改

1. **判断**：`INSERT INTO 表 VALUES ('值1', '值2')`（不写列名）是推荐写法，因为更简洁。（　）
2. **写 SQL**：插入一名新生（学号 `S2023016`、姓名 `谢婷`、性别 `F`、城市 `厦门`），并让语句**返回数据库自动分配的 student_id**。
3. **读结果**：有人不小心执行了 `UPDATE school.students SET city = '北京';`，psql 返回 `UPDATE 15`。发生了什么？现在有哪些补救办法？
4. **写 SQL**：把学号 `S2023005` 这位学生所有**低于 60 分**的成绩统一改成 60 分（提示：用 `UPDATE ... FROM` 关联 `students` 表）。
5. **问答**：`DELETE FROM 表;` 和 `TRUNCATE 表;` 有什么区别？

<details><summary>查看答案解析</summary>

1. **答案：错**。
   解析：不写列名的写法依赖**列的物理顺序**，表结构一变（加一列、调换顺序）整条语句就全错位了，是新手雷区。推荐姿势是**永远显式写出列名清单**：
   ```sql
   INSERT INTO school.students (student_no, name, gender, city)
   VALUES ('S2023016', '谢婷', 'F', '厦门');
   ```
   列名清单和 VALUES 一一对应；没出现的列取默认值（`student_id` 自增、`enrolled_on` 是今天）。

2. **答案**：
   ```sql
   INSERT INTO school.students (student_no, name, gender, city)
   VALUES ('S2023016', '谢婷', 'F', '厦门')
   RETURNING student_id;
   -- 返回：16（示例数据已有 15 名学生，自增主键下一个就是 16）
   ```
   解析：`RETURNING` 是 PostgreSQL 非常好用的扩展，写入的同时把结果返回给你——程序开发里最常用的场景就是"拿到刚插入那行的自增 id"。

3. **答案**：**没有写 WHERE，全表 15 行的 `city` 全被改成了"北京"**（`UPDATE 15` 就是被改动的行数，这个数字就是事故现场）。
   解析：补救办法按场景从轻到重：
   - 如果在 `BEGIN;` 事务里执行的 → 立刻 `ROLLBACK;`，什么都没发生；
   - 练习库（`beginner_pg`）→ 重跑 `scripts/03_reset_school.sql` 一键还原初始数据；
   - 生产环境 → 只能靠[第 14 章](第14章_备份与恢复.md)的备份恢复，代价很大。

   所以[第 6 章](第06章_数据的增删改.md)的安全铁律是：**① 先 SELECT 预览会命中哪些行；② 用事务包住；③ 盯着 `UPDATE` 后面的数字，和预期不符立刻 ROLLBACK。**

4. **答案**：
   ```sql
   UPDATE school.enrollments e
   SET score = 60
   FROM school.students s
   WHERE e.student_id = s.student_id
     AND s.student_no = 'S2023005'
     AND e.score < 60;
   -- UPDATE 1：陈静的"大学物理"从 55 分被提到 60 分
   ```
   解析：`S2023005` 是陈静（student_id = 5）。她共有 3 条选课记录，其中"大学物理"是 55 分（不及格），"微观经济学"的 score 是 NULL（在读未考），另一门是 68 分。条件 `score < 60` 只命中那 1 条，所以返回 `UPDATE 1`。
   注意 `UPDATE ... FROM` 的写法：被更新的表在 `UPDATE` 后面（并起别名 `e`），提供条件的表在 `FROM` 里，两张表在 `WHERE` 里用关联条件连起来。

5. **答案**：

   | | `DELETE FROM 表;` | `TRUNCATE 表;` |
   |---|---|---|
   | 速度 | 逐行删除，大表慢 | 瞬间清空，速度快 |
   | WHERE | **支持**（可以只删一部分行） | **不支持**（只能整表全清） |
   | 自增序列 | 继续往后面发号 | 重置回 1 |
   | 本质 | DML（操作数据） | 更像 DDL（操作表的存储） |

   解析：两者都**不进回收站**，都保不住数据，动手前都要三思。不写 WHERE 的 DELETE 等于 TRUNCATE，但更慢。

</details>

## 第 7 章 查询基础：SELECT / WHERE / ORDER BY

1. **判断**：`BETWEEN 80 AND 90` 表示"80 < x < 90"，**不包含**端点。（　）
2. **读代码说结果**：
   ```sql
   SELECT * FROM school.enrollments WHERE score = NULL;
   ```
   这条语句返回几行？为什么？正确的写法是什么，用示例数据会返回几行？
3. **写 SQL**：查询"来自北京或上海、并且性别为女"的学生的姓名和城市，按姓名排序。
4. **判断**：不写 `ORDER BY` 时，`SELECT` 的返回顺序是稳定的、有保证的，可以直接依赖。（　）
5. **写 SQL**：查出 `enrollments` 表里成绩最高的 5 条记录（只考虑有成绩的），显示学生 id、课程 id、成绩。

<details><summary>查看答案解析</summary>

1. **答案：错**。
   解析：`BETWEEN a AND b` 是**闭区间**，包含两端，即 `a <= x <= b`。边界值经常出 bug，记住含两端这个细节。

2. **答案**：返回 **0 行**。
   解析：`NULL` 表示"未知"，它和任何值（包括另一个 NULL）做比较，结果都是"未知"（NULL），而不是 true。而 `WHERE` 只保留条件为 **true** 的行，所以 `score = NULL` 一行都选不出来。
   正确写法是 `IS NULL`（判断"是不是空"是可以做到的）：
   ```sql
   SELECT * FROM school.enrollments WHERE score IS NULL;
   -- 返回 3 行：陈静·微观经济学、郑浩·高等数学(下)、韩梅·微观经济学
   ```

3. **答案**：
   ```sql
   SELECT name, city
   FROM school.students
   WHERE city IN ('北京', '上海') AND gender = 'F'
   ORDER BY name;
   -- 返回 2 行：李华（上海）、孙丽（北京）
   ```
   解析：北京有 3 名学生（王小明/男、赵磊/男、孙丽/女），上海有 1 名（李华/女），所以两个条件都满足的只有 2 人。也可以写成 `(city = '北京' OR city = '上海') AND gender = 'F'`——**AND/OR 混用时要加括号**，因为优先级是 `NOT > AND > OR`。

4. **答案：错**。
   解析：SQL **不保证**没有 `ORDER BY` 时的返回顺序。它可能恰好看起来是按插入顺序返回，但只要数据被更新、索引变化、并发查询、或者优化器换个计划，顺序就会变。任何依赖"默认顺序"的程序都是 bug 温床——要顺序，就写 `ORDER BY`。

5. **答案**：
   ```sql
   SELECT student_id, course_id, score
   FROM school.enrollments
   WHERE score IS NOT NULL
   ORDER BY score DESC
   LIMIT 5;
   -- 5 行，成绩分别是 95、93、92、92、91
   ```
   解析：示例数据里最高分是 95（孙丽·Python 程序设计），其次是 93、92、92、91。注意 `WHERE score IS NOT NULL` 不是必须的（在 `ORDER BY score DESC` 下 NULL 默认排在最后，`LIMIT 5` 取不到它们），但显式写出来意图更清楚。

</details>

## 第 8 章 聚合与分组

1. **读代码说结果**：
   ```sql
   SELECT COUNT(*), COUNT(score) FROM school.enrollments;
   ```
   两个数字分别是多少？为什么不一样？
2. **判断**：下面这条语句能执行成功。（　）
   ```sql
   SELECT city, name, COUNT(*) FROM school.students GROUP BY city;
   ```
3. **写 SQL**：统计每个城市的学生人数，按人数从多到少排序。
4. **问答**：`WHERE` 和 `HAVING` 有什么区别？写出"找出平均分高于 75 分的课程"的 SQL。
5. **写 SQL**：用**一条** SQL 统计出 `enrollments` 表里的：总记录数、及格（>= 60）记录数、不及格（< 60）记录数、在读未考（score 为 NULL）记录数。

<details><summary>查看答案解析</summary>

1. **答案：42 和 39**。
   解析：`COUNT(*)` 数的是**行数**，42 条选课记录一条不落。`COUNT(列)` 数的是**该列非空值的个数**，会跳过 NULL——示例数据里有 3 条"在读未考"的记录 score 为 NULL，所以是 42 − 3 = 39。
   这是经典考点，记住一句话：**数"记录条数"用 `COUNT(*)`，数"这个字段实际填了的"用 `COUNT(列)`**。同理 `SUM` / `AVG` / `MAX` / `MIN` 也会自动跳过 NULL。

2. **答案：执行失败**。
   解析：会报 `column "students.name" must appear in the GROUP BY clause or be used in an aggregate function`。
   原因：`GROUP BY city` 之后，"北京"这一组里压缩成了**一行**输出，而组里有 3 个不同的 `name`（王小明、赵磊、孙丽），数据库不知道该显示哪一个，于是直接拒绝。**铁律：`SELECT` 里出现的非聚合列，必须出现在 `GROUP BY` 里。**

3. **答案**：
   ```sql
   SELECT city, COUNT(*) AS 学生人数
   FROM school.students
   GROUP BY city
   ORDER BY 学生人数 DESC;
   -- 13 行：北京 3 人；其余 11 个城市各 1 人；city 为 NULL 的一组 1 人
   ```
   解析：15 名学生分布在 12 个城市 + 1 个 NULL 值，所以是 13 个分组。`GROUP BY` 会把 NULL 单独归成一组（它不认为 NULL 等于 NULL，但在分组时会把所有 NULL 归到一起）。

4. **答案**：`WHERE` 在**分组之前**筛**行**，不能用聚合函数；`HAVING` 在**分组之后**筛**组**，可以用聚合函数。
   ```sql
   SELECT c.course_name, ROUND(AVG(e.score), 1) AS 平均分
   FROM school.courses c
   JOIN school.enrollments e ON e.course_id = c.course_id
   GROUP BY c.course_name
   HAVING AVG(e.score) > 75
   ORDER BY 平均分 DESC;
   -- 5 行：Python 程序设计 83.8、大学英语(四) 82.2、数据结构 80.0、
   --       微观经济学 79.7、数据库原理 77.5
   ```
   解析：如果写成 `WHERE AVG(e.score) > 75` 会直接报 `aggregate functions are not allowed in WHERE`——因为执行到 WHERE 时还没分组，聚合值根本不存在。
   执行顺序要背下来：`FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT`。能用 WHERE 解决的问题尽量放 WHERE（先筛掉行，参与分组的数据量小，效率更高）。

5. **答案**：
   ```sql
   SELECT COUNT(*)                              AS 总记录,
          COUNT(*) FILTER (WHERE score >= 60)   AS 及格,
          COUNT(*) FILTER (WHERE score < 60)    AS 不及格,
          COUNT(*) FILTER (WHERE score IS NULL) AS 在读未考
   FROM school.enrollments;
   -- 42 / 34 / 5 / 3
   ```
   解析：`COUNT(*) FILTER (WHERE 条件)` 是 PostgreSQL 的优雅扩展，比传统的 `SUM(CASE WHEN ... THEN 1 ELSE 0 END)` 好读得多，两者结果完全一致。

</details>

## 第 9 章 多表连接：JOIN

1. **选择**：`FROM a LEFT JOIN b ON ...` 的结果里，`a` 中**配不上**的行会（　）。
   A. 被丢掉　B. 保留，`b` 侧的列补 NULL　C. 报错　D. 只保留一行
2. **读代码说结果**：`tmp_a` 有 id 1、2、3，`tmp_b` 有 id 2、3、4。执行 `SELECT * FROM tmp_a a LEFT JOIN tmp_b b ON a.id = b.id;` 返回几行？每行分别是什么？
3. **写 SQL**：找出**没有选任何课**的学生，显示学号和姓名。（示例数据里应该刚好命中 1 人。）
4. **问答**：在 `LEFT JOIN` 里，把额外条件写在 `ON` 后面和写在 `WHERE` 后面，效果一样吗？
5. **读代码说结果**：
   ```sql
   SELECT COUNT(*) FROM school.students CROSS JOIN school.courses;
   ```
   结果是多少？为什么是这个数？

<details><summary>查看答案解析</summary>

1. **答案：B**。
   解析：`LEFT JOIN` 的含义是"左表全保留"。左表每一行都要出现在结果里；如果它在右表找不到匹配，右表那几列就填 NULL。所以 `LEFT JOIN + WHERE 右表主键 IS NULL` 正好可以找出"在右表没有对应记录"的行——这是最常用的反连接写法。

2. **答案：3 行**。
   ```text
    id | val | id  | val
   ----+-----+-----+-----
     1 | a1  |     |        ← b 侧没有匹配，补 NULL
     2 | a2  |   2 | b2
     3 | a3  |   3 | b3
   ```
   解析：a 只有 1、2、3 三行，所以最多 3 行。1 在 b 里没有匹配 → 补 NULL，但**行保留**；4 只在 b 里有，因为左表没有它，所以整个结果里不出现。对照记忆：`INNER JOIN` 只留 2、3 两行；`RIGHT JOIN` 留 2、3、4；`FULL JOIN` 留 1、2、3、4。

3. **答案**：
   ```sql
   SELECT s.student_no, s.name
   FROM school.students s
   LEFT JOIN school.enrollments e ON e.student_id = s.student_id
   WHERE e.student_id IS NULL;
   -- 1 行：S2023015 曹阳
   ```
   解析：`LEFT JOIN` 保住每一个学生；没选课的那个学生对应的 `e.*` 全是 NULL，再用 `WHERE e.student_id IS NULL` 把它挑出来。示例数据里只有曹阳（student_id = 15）没有选课记录。
   替换写法（[第 11 章](第11章_子查询_CTE与窗口函数.md)会讲）：
   ```sql
   SELECT s.student_no, s.name FROM school.students s
   WHERE NOT EXISTS (SELECT 1 FROM school.enrollments e WHERE e.student_id = s.student_id);
   ```

4. **答案：不一样**。
   解析：
   - 写在 `ON` 里的条件只影响"两张表**能不能配上**"——左表的行**依然全部保留**，只是配不上时右表列补 NULL；
   - 写在 `WHERE` 里的条件是过滤**最终结果行**——配不上（右表列是 NULL）的行会被直接删掉，效果等同于把 `LEFT JOIN` 变成了 `INNER JOIN`。

   所以"找没有的行"必须写成 `WHERE 右表列 IS NULL`，不能写成 `ON ... AND 右表列 IS NULL`。初学阶段严格遵守分工：**`ON` 放连接条件，`WHERE` 放业务过滤。**

5. **答案：120**。
   解析：`CROSS JOIN` 是**笛卡尔积**——左表每一行和右表每一行都配一遍。15 名学生 × 8 门课程 = 120 行。
   实际工作中 `CROSS JOIN` 偶有用途（比如生成"所有学生 × 所有课程"的组合清单），但 99% 的情况是**忘写 `ON` 的 bug**。两张千行表的笛卡尔积是一百万行——看到结果行数异常膨胀，先检查 `ON` 是不是漏了。

</details>

## 第 10 章 处理 NULL、日期、字符串与数值

1. **读结果**：`SELECT NULL = NULL;` 和 `SELECT NULL IS NULL;` 分别返回什么？为什么不一样？
2. **读代码说结果**：
   ```sql
   SELECT name FROM school.students WHERE city <> '北京';
   ```
   返回几行？为什么不是"除北京以外的人"（12 行）？怎么改才能拿到 12 行？
3. **写 SQL**：显示所有学生的姓名和城市，城市为空的显示成"未填写"。
4. **写 SQL**：从学号里取出 4 位年级——`S2023001` 要得到 `2023`（用 `substring`），并和姓名一起显示。
5. **写 SQL**：用 `CASE WHEN` 给每条选课记录的成绩分级：`>= 90` 优秀、`>= 80` 良好、`>= 60` 及格、`score` 为 NULL 显示"在读"、其余"不及格"。显示学生姓名、成绩、等级。

<details><summary>查看答案解析</summary>

1. **答案**：分别是 **NULL** 和 **true**。
   解析：`NULL` 的语义是"未知"。两个"未知"的东西相不相等？**不知道**——所以 `NULL = NULL` 的结果还是 NULL（unknown），不是 true。而 `IS NULL` 问的是"你是不是空的？"，这个问题可以明确回答，所以返回 true。
   记住：**判断空值只能用 `IS NULL` / `IS NOT NULL`，不能用 `=` / `<>`。**

2. **答案**：返回 **11 行**。
   解析：示例数据里 15 名学生——北京 3 名（王小明、赵磊、孙丽），city 为 NULL 的 1 名（郑浩），其余 11 名。`city <> '北京'` 对郑浩那行来说，`NULL <> '北京'` 的结果是 **NULL**（不是 true），而 `WHERE` 只保留 true 的行，所以郑浩被静默丢弃了。
   正确写法：
   ```sql
   SELECT name FROM school.students
   WHERE city <> '北京' OR city IS NULL;
   -- 12 行
   ```
   这是三值逻辑最经典的坑：**`<>` / `!=` 会漏掉 NULL 行**。写"不等于某值"的查询时，先想想"这一列有没有 NULL"。

3. **答案**：
   ```sql
   SELECT name, COALESCE(city, '未填写') AS 城市
   FROM school.students;
   -- 15 行；郑浩那行显示"未填写"
   ```
   解析：`COALESCE(a, b, c, ...)` 返回参数里**第一个非 NULL 的值**，是处理 NULL 的万金油。常用于显示兜底、以及给聚合结果兜底（`COALESCE(ROUND(AVG(score), 1), 0)`，让"没人选的课程"显示 0 而不是 NULL）。

4. **答案**：
   ```sql
   SELECT substring(student_no, 2, 4) AS 年级, name
   FROM school.students;
   -- 15 行；王小明那行年级为 2023
   ```
   解析：`substring(字符串, 起始位置, 长度)` 从 **1** 开始数（不是 0，这点和很多编程语言不同）。`S2023001` 的第 2 位开始取 4 个字符，得到 `2023`。
   同等效果的还有 `left(s, n)` / `right(s, n)` / `split_part(s, 分隔符, 第几段)`。

5. **答案**：
   ```sql
   SELECT s.name, e.score,
          CASE WHEN e.score >= 90 THEN '优秀'
               WHEN e.score >= 80 THEN '良好'
               WHEN e.score >= 60 THEN '及格'
               WHEN e.score IS NULL THEN '在读'
               ELSE '不及格'
          END AS 等级
   FROM school.enrollments e
   JOIN school.students s ON s.student_id = e.student_id;
   -- 42 行
   ```
   解析：搜索式 `CASE` 从上到下判断，**第一个满足的分支生效**。所以顺序很重要：必须先判 `>= 90`，再判 `>= 80`；不能把 `>= 60` 放前面，否则所有及格的人都会落到这一档。
   另外注意 `score IS NULL` 这一支的位置：`NULL >= 90` 的结果是 NULL（不是 true），所以 NULL 会一路往下落到 `IS NULL` 分支——如果漏写这一支，在读记录会掉进 `ELSE` 被错标成"不及格"。

</details>

## 第 11 章 子查询、CTE 与窗口函数

1. **问答**：为什么说 `NOT IN (子查询)` 有 NULL 陷阱？推荐用什么替代？
2. **写 SQL**：用标量子查询找出出生日期最早（年纪最大）的学生，显示姓名和生日。
3. **写 SQL**：用 `WITH`（CTE）先算出每个学生的平均分，再挑出平均分 >= 85 的学生，显示姓名和平均分（保留 1 位小数）。
4. **读结果**：假设某门课里有两人并列第 2 名（成绩为 95、90、90、85）。按成绩降序编排时，第 4 行上 `ROW_NUMBER()`、`RANK()`、`DENSE_RANK()` 的值分别是多少？
5. **写 SQL**：用窗口函数找出每门课成绩最高的 2 条记录。并说明为什么不能把 `WHERE rn <= 2` 和窗口函数写在**同一层**。

<details><summary>查看答案解析</summary>

1. **答案**：因为 `x NOT IN (子查询)` 会被展开成 `x <> 值1 AND x <> 值2 AND ...`。只要子查询结果里出现**一个 NULL**，就会产生一个 `x <> NULL`，它的结果是 NULL；`true AND NULL = NULL`，整个条件不再是 true，于是**所有行都被过滤掉，查询返回空结果**。
   替代方案：
   - 用 `NOT EXISTS`（推荐）：
     ```sql
     SELECT s.name FROM school.students s
     WHERE NOT EXISTS (SELECT 1 FROM school.enrollments e
                       WHERE e.student_id = s.student_id);
     ```
   - 或者先给子查询列加 `WHERE 列 IS NOT NULL`，把 NULL 排除干净。

   顺带记住 `EXISTS` 的特点：它是"半连接"，**找到第一行就短路返回**，不关心 `SELECT` 后面写什么（惯例写 `SELECT 1`），大表关联时通常比 `IN (大子查询)` 更高效。

2. **答案**：
   ```sql
   SELECT name, birth_date
   FROM school.students
   WHERE birth_date = (SELECT MIN(birth_date) FROM school.students);
   -- 1 行：郑浩 2003-10-27
   ```
   解析：括号里的子查询返回"单个值"（一行一列），可以直接当值用，这叫**标量子查询**。如果子查询返回多行会报 `more than one row returned by a subquery`。
   示例数据里最年长的是郑浩（2003-10-27），比赵磊（2003-12-21）还早两个月。

3. **答案**：
   ```sql
   WITH student_avg AS (
       SELECT s.student_id, s.name, AVG(e.score) AS avg_score
       FROM school.students s
       JOIN school.enrollments e ON e.student_id = s.student_id
       GROUP BY s.student_id, s.name
   )
   SELECT name, ROUND(avg_score, 1) AS 平均分
   FROM student_avg
   WHERE avg_score >= 85
   ORDER BY 平均分 DESC;
   -- 4 行：韩梅 89.5、王小明 88.3、孙丽 87.7、李华 86.0
   ```
   解析：`AVG(e.score)` 会跳过 NULL——韩梅有 3 条记录（92、NULL、87），只按 92 和 87 两条算，平均 89.5。曹阳没有任何选课记录，在 `JOIN` 时就被排除了，不会出现在结果里。
   CTE 的价值是**分而治之**：先把"每个学生的平均分"变成一个可以由名字引用的结果集，再接第二步筛选，读起来比嵌套子查询清楚得多。链式 CTE 可以一层层往下写。

4. **答案**：分别是 **4 / 4 / 3**。

   | 函数 | 第 4 行的值 | 特点 |
   |---|---|---|
   | `ROW_NUMBER()` | 4 | 无情递增，绝不并列：1, 2, 3, 4 |
   | `RANK()` | 4 | 并列同名次，**跳过**后续：1, 2, 2, 4 |
   | `DENSE_RANK()` | 3 | 并列同名次，**不跳**：1, 2, 2, 3 |

   解析：想"取前 3 名（并列也算）"用 `DENSE_RANK() <= 3`；想"严格取 3 行"用 `ROW_NUMBER() <= 3`。面试常问，记住差别。

5. **答案**：
   ```sql
   WITH ranked AS (
       SELECT c.course_name, s.name, e.score,
              ROW_NUMBER() OVER (PARTITION BY c.course_id ORDER BY e.score DESC) AS rn
       FROM school.enrollments e
       JOIN school.students s ON s.student_id = e.student_id
       JOIN school.courses  c ON c.course_id  = e.course_id
   )
   SELECT course_name, name, score
   FROM ranked
   WHERE rn <= 2;
   -- 16 行（8 门课 × 2 条；其中"数据结构"只有 2 人选，也刚好 2 条）
   ```
   解析：**窗口函数不能写在 `WHERE` / `GROUP BY` / `HAVING` 里**，只能出现在 `SELECT` 和 `ORDER BY` 中。原因是执行顺序：`WHERE` 在窗口函数之前执行，此时 `rn` 还不存在。要按窗口结果过滤，就必须像上面这样**套一层**（CTE 或派生表）——这是"组内 Top N"的标准模板，必背。

</details>

## 第 12 章 事务

1. **判断**：在 psql 里不写 `BEGIN`，直接执行一条 UPDATE，执行完发现改错了，还可以 `ROLLBACK` 撤销。（　）
2. **问答**：事务的 ACID 四个特性分别是什么？哪一个保证"COMMIT 之后即使断电数据也不丢"？
3. **读实验说结果**（PG 默认的 READ COMMITTED）：会话 A 执行 `BEGIN;` 后读到 `city = '上海'`；此时会话 B 把该行改成 `'魔都'` 并 `COMMIT`；会话 A 在**同一个事务里**再 `SELECT` 一次，会看到什么？
4. **写 SQL**：用 `SAVEPOINT` 实现——改 `student_id = 4` 的行成功保留，改 `student_id = 5` 的行撤销，最后一起提交。
5. **问答**：什么是死锁？PostgreSQL 如何处理它？另外，MVCC 说的"读不阻塞写、写不阻塞读"是什么意思？

<details><summary>查看答案解析</summary>

1. **答案：错**。
   解析：不写 `BEGIN` 时，每条语句**自成一个微型事务，执行完立即提交**（自动提交）。这就是为什么[第 6 章](第06章_数据的增删改.md)那条"不带 WHERE 的 UPDATE"没有后悔药。想要能撤销，就必须手动 `BEGIN;` 包起来。
   附带一个识别技巧：事务未提交时，psql 的提示符会从 `beginner_pg=>` 变成 `beginner_pg=*>`——`*` 就是"你手里有未提交的事务"的警报。

2. **答案**：
   | 特性 | 含义 | 通俗说法 |
   |---|---|---|
   | **A**tomicity 原子性 | 全部成功或全部回滚 | 一荣俱荣，一损俱损 |
   | **C**onsistency 一致性 | 事务前后数据都满足所有约束 | 账目永远平 |
   | **I**solation 隔离性 | 并发事务互不干扰 | 像独占数据库 |
   | **D**urability 持久性 | COMMIT 后的修改断电也不丢 | 落袋为安 |

   保证"断电不丢"的是 **D 持久性**。
   另外补一个 PG 特色：**DDL 也能进事务**——建表、删表同样可以 `ROLLBACK`（MySQL 大部分场景不行），这是 PostgreSQL 的一大优势。

3. **答案：看到 `'魔都'`**。
   解析：READ COMMITTED 的语义是"**每条语句开始时取一张最新快照**"。会话 A 的第一条 SELECT 时 B 还没提交，所以看到旧值 `'上海'`；等 B 提交后，A 在同一个事务里发出的新 SELECT 会取到新快照，于是看到 `'魔都'`。
   这正是"不可重复读"（同一事务里两次读结果不同）。它是 PG 的默认级别，简单高效，绝大多数应用够用。

4. **答案**：
   ```sql
   BEGIN;
   UPDATE school.students SET city = '测试A' WHERE student_id = 4;
   SAVEPOINT sp1;                                    -- 打个存档
   UPDATE school.students SET city = '测试B' WHERE student_id = 5;
   ROLLBACK TO sp1;                                  -- 只退回到存档点：5 的改动撤销，4 的保留
   COMMIT;                                           -- 最终只有 student_id = 4 的改动生效
   -- 练习完成后记得改回原值：student_id=4 是"深圳"，student_id=5 是"成都"
   ```
   解析：`SAVEPOINT` 是事务内部的"存档点"，适合"长事务做到一半出错"的场景（比如批量导入 1 万行，第 6000 行报错，从断点重跑而不用从零重来）。注意 `ROLLBACK TO sp1` 不会结束整个事务，事务还在，可以继续操作。

5. **答案**：
   - **死锁**：两个（或多个）事务互相等待对方持有的锁，谁也进行不下去。例如事务 A 锁住了第 1 行在等第 2 行，事务 B 锁住了第 2 行在等第 1 行。
   - **PG 的处理**：`deadlock_timeout`（默认约 1 秒）超时后主动做死锁检测，一旦确认就**牺牲其中一个事务**——报 `ERROR: deadlock detected` 并回滚它，另一个继续正常执行。应用程序应该捕获这个错误并**重试**。预防办法是让多个事务**按相同的顺序**访问数据行。
   - **MVCC**（多版本并发控制）：修改数据时**不原地覆盖**，而是生成这一行的**新版本**，旧版本继续保留；每个事务按照自己的快照去选择该看哪个版本。所以读操作永远不需要等写操作、写操作也不用等读操作——这是 PostgreSQL 高并发的根基。代价是旧版本需要清理，交给 `autovacuum`（后台自动）或手动 `VACUUM`。

   > 排障小工具：锁住了想知道谁在等谁，管理员会话里查 `pg_stat_activity`（看谁在跑什么、等什么）。

</details>

## 第 13 章 索引与 EXPLAIN

1. **判断**：主键和 UNIQUE 约束会自动创建索引，外键也会自动创建索引。（　）
2. **写 SQL**：为 `school.enrollments` 的 `student_id` 列、`course_id` 列各建一个索引，再建一个复合索引 `(student_id, course_id)`。
3. **读 EXPLAIN**：执行计划里出现 `Seq Scan on enrollments` 和 `Index Scan using idx_enrollments_student on enrollments`，分别说明什么？
4. **判断（多选）**：下面哪些 `WHERE` 条件能用上 B-tree 索引？
   ```sql
   WHERE user_no = 500                       -- a
   WHERE user_no + 1 = 501                   -- b
   WHERE lower(email) = 'a@b.c'              -- c
   WHERE user_no BETWEEN 100 AND 200         -- d
   WHERE name LIKE '%王'                     -- e
   ```
5. **问答**：为什么说"索引不是越多越好"？建索引时应该优先考虑哪些列？

<details><summary>查看答案解析</summary>

1. **答案：错**。
   解析：**主键和 UNIQUE 约束会自动带索引**（约束背后就是索引），但**外键不会自动建索引**。这是一个很容易踩的坑：`enrollments.student_id` 和 `course_id` 都是外键，但它们的索引必须自己建：
   ```sql
   CREATE INDEX idx_enrollments_student ON school.enrollments(student_id);
   CREATE INDEX idx_enrollments_course  ON school.enrollments(course_id);
   ```
   外键列没有索引的后果：一是按外键列查询会全表扫；二是删除父表行时，数据库要检查子表有没有引用，没有索引也会扫全表。

2. **答案**：
   ```sql
   CREATE INDEX idx_enrollments_student ON school.enrollments(student_id);
   CREATE INDEX idx_enrollments_course  ON school.enrollments(course_id);
   CREATE INDEX idx_enrollments_student_course ON school.enrollments(student_id, course_id);
   ```
   解析：复合索引的**列顺序很重要**：`(student_id, course_id)` 相当于"先按 student_id 排，同一个 student_id 内部再按 course_id 排"。查看索引用 `\di school.*`，删除用 `DROP INDEX school.索引名;`。

3. **答案**：
   - `Seq Scan` = **顺序扫描，也就是全表扫描**——从第一行扫到最后一行。小表上很正常（甚至比走索引更快），但**大表上出现 Seq Scan 通常是性能警报**。
   - `Index Scan using idx_... on ...` = **走了某个索引**，通常是好消息；下面的 `Index Cond: (student_id = 5)` 会告诉你索引里实际用了哪个条件。
   - 另外还要看 `Filter:`（索引之外还要逐行过滤的条件）和 `rows=`（预估 vs 实际行数）。要看**实际耗时**必须用 `EXPLAIN ANALYZE`，它会在计划后面附上 `Execution Time`。
   ```sql
   EXPLAIN ANALYZE SELECT * FROM school.enrollments WHERE student_id = 5;
   ```

4. **答案：a 和 d 能用；b、c、e 用不上**。
   解析：
   - **b**（`user_no + 1 = 501`）：对**列本身做了运算**，索引里存的是原始值，无法直接匹配 → 只能全表扫（改写为 `user_no = 500` 就能走索引）；
   - **c**（`lower(email) = ...`）：**函数包裹了列**，同理失效——除非专门建**表达式索引** `CREATE INDEX ... ON 表 (lower(email));`；
   - **e**（`LIKE '%王'`）：**前置通配符**，B-tree 靠"有序"工作，前面是未知字符就没法定位；`LIKE '王%'`（后置）可以用索引。频繁的模糊搜索考虑 `pg_trgm` 扩展（超出本教程范围，知道名字即可）。

   还有一类常见失效：**隐式类型转换**，例如 `WHERE user_no::text = '500'`，把列转成别的类型后索引就用不上了。

5. **答案**：索引让**读变快**，但代价是——每次 `INSERT` / `UPDATE` / `DELETE` 都要**同步维护索引**（写变慢），而且索引自己要占磁盘空间。所以建索引的原则是"**按实际查询需求建，而不是无脑给每列都加**"。
   优先考虑这几类列：
   1. `WHERE` 条件里高频出现的列；
   2. `JOIN ... ON` 的关联列（尤其**外键列**，它不会自动建索引）；
   3. `ORDER BY` 常用的排序列；
   4. 复合索引按"最左前缀"原则设计——`(a, b, c)` 能服务 `WHERE a = ?` 和 `WHERE a = ? AND b = ?`，但**不能单独服务 `WHERE b = ?`**。

</details>

## 第 14 章 备份与恢复

1. **选择**：`pg_dump -Fc -f backup.dump` 里的 `-Fc` 生成的是什么格式？相比默认的 SQL 文本格式有什么好处？
   A. 纯文本，`cat` 就能看
   B. 自定义（二进制）格式，自带压缩、支持并行恢复和选择性恢复
   C. 物理备份，可以直接替代数据目录
   D. CSV 格式，可以直接用 Excel 打开
2. **判断**：`pg_dump` 会把数据库里的角色（用户）和密码一起备份进去。（　）
3. **命令题**：把 `beginner_pg` 以自定义格式备份成 `backup.dump`，然后恢复到一个新建的库 `restore_test` 里。写出完整的三条命令。
4. **问答**：备份"三问"是哪三问？为什么备份文件不能和数据库放在同一台机器上？
5. **命令题**：① 只备份 `school.students` 这一张表；② 从一个自定义格式备份里**只恢复数据、不建结构**。分别怎么写？

<details><summary>查看答案解析</summary>

1. **答案：B**。
   解析：`-Fc` = custom（自定义）格式。它是二进制格式，**自带压缩**（体积约为文本格式的 1/3）、支持 `-j N` 并行恢复、支持 `-t 表名` 选择性恢复；代价是**只能用 `pg_restore` 恢复**，不能像 SQL 文本那样用 `cat` 看、也不能直接喂给 `psql`。
   选择建议：个人/教学项目用 SQL 文本（可读、可 diff、能进 git）；生产环境用自定义格式（压缩 + 并行 + 选择性）。

2. **答案：错**。
   解析：角色/用户属于**集群级对象**，不在 `pg_dump` 的备份范围内（`pg_dump` 只备单个数据库）。所以把备份恢复到一台新服务器后，经常出现"库恢复了但连不上"——因为用户没恢复。整集群迁移要用 `pg_dumpall --globals-only` 把角色补上。这是很容易忽略的坑。

3. **答案**：
   ```bash
   # ① 备份（自定义格式）
   $ pg_dump -h localhost -U student_pg -d beginner_pg -Fc -f backup.dump

   # ② 先建一个空库（SQL 备份里不含 CREATE DATABASE）
   $ psql -h localhost -U student_pg -d postgres -c "CREATE DATABASE restore_test OWNER student_pg;"

   # ③ 恢复
   $ pg_restore -h localhost -U student_pg -d restore_test backup.dump
   ```
   解析：**恢复之前目标库必须已经存在**——`pg_dump` 的备份内容只有表、数据、索引等对象，不包含 `CREATE DATABASE`。恢复完可以验证一下：
   ```bash
   $ psql -h localhost -U student_pg -d restore_test -c "SELECT COUNT(*) FROM school.students;"
   -- 15
   ```
   查看备份里到底有什么，用 `pg_restore --list backup.dump`。

4. **答案**：备份三问是——**① 能不能恢复？② 恢复要多快？③ 备份在另一台机器上吗？**
   解析：第三条最容易被忽略。如果备份文件和数据库在**同一块盘、同一台机器**上，机器一坏、磁盘一坏，数据和备份就一起没了——等于从来没备过份。所以必须**异地一份**（用 `rsync` 推到别处、传到对象存储、或者用第 2.6 节的 SFTP 面板把 `.dump` 拖回自己的笔记本）。
   另外两条铁律也记住：**没做过恢复演练的备份等于没备份**；备份必须定期做恢复演练。

5. **答案**：
   ```bash
   # ① 只备份一张表
   $ pg_dump -h localhost -U student_pg -d beginner_pg -t school.students -f students.sql

   # ② 只恢复数据，不建结构
   $ pg_restore --data-only -d 目标库 backup.dump
   ```
   解析：`-t` 可以写多次来指定多张表；`--data-only` 只要数据、`--schema-only` 只要结构（复制表结构的快捷方式）。定时备份的标配是"脚本 + cron + 日期文件名 + 保留策略 + 异地存放"，脚本模板见第 14.6 节。

</details>

## 第 15 章 用户权限与安全

1. **写 SQL**：以管理员身份新建一个**只读**账号 `ta_reader`（可登录，密码 `ta_reader_2024`），让它能读 `school` 模式里所有表、但不能改任何数据、不能在 `school` 里建表。写出关键的 4 句 SQL。
2. **判断**：执行 `GRANT SELECT ON ALL TABLES IN SCHEMA school TO ta_reader;` 之后，`student_pg` 明天在 `school` 里新建的表，`ta_reader` 也能读。（　）
3. **问答**：要成功执行 `SELECT * FROM school.students`，光有 `students` 表的 `SELECT` 权限够不够？还差什么？
4. **选择**：`pg_hba.conf` 里把认证方式写成 `trust` 意味着（　）。
   A. 需要密码，密码加密传输
   B. 需要客户端证书
   C. **免密**，任何能连到这个端口的人直接进
   D. 只允许本机连接
5. **安全意识题**：下面这段 Python 代码为什么危险？请指出攻击方式，并给出正确写法。
   ```python
   sql = f"SELECT * FROM school.students WHERE student_no = '{user_input}'"
   cur.execute(sql)
   ```

<details><summary>查看答案解析</summary>

1. **答案**：
   ```sql
   -- ① 创建可登录角色
   CREATE ROLE ta_reader LOGIN PASSWORD 'ta_reader_2024';
   -- ② 允许进入 beginner_pg 库
   GRANT CONNECT ON DATABASE beginner_pg TO ta_reader;
   -- ③ 允许使用 school 模式（缺这句，就算授权了表也访问不到！）
   GRANT USAGE ON SCHEMA school TO ta_reader;
   -- ④ 授权模式内全部现存表的 SELECT
   GRANT SELECT ON ALL TABLES IN SCHEMA school TO ta_reader;
   ```
   解析：验证一下（用 `ta_reader` 连进去）——`SELECT COUNT(*) FROM school.students;` 可以（返回 15），`UPDATE school.students SET city='X' WHERE student_id=1;` 会报 `permission denied for table students`，`CREATE TABLE school.hack (id int);` 会报 `permission denied for schema school`。三条都对，权限就配对了。
   还有**很容易遗漏的第 5 步**（针对"将来新建的表"）：
   ```sql
   ALTER DEFAULT PRIVILEGES FOR ROLE student_pg IN SCHEMA school
       GRANT SELECT ON TABLES TO ta_reader;
   ```

2. **答案：错**。
   解析：`ALL TABLES IN SCHEMA` 只对**执行这条 GRANT 时已存在**的表生效。将来 `student_pg` 新建的表，`ta_reader` 默认看不到——必须用 `ALTER DEFAULT PRIVILEGES` 给"未来的表"预设权限。这是新手 100% 会遗漏的一步。

3. **答案：不够**。还差**模式 `school` 的 `USAGE` 权限**。
   解析：PostgreSQL 的两级权限模型是"**先能路过，才能进门**"：
   - 模式级的 `USAGE` → 允许你"路过"这个模式去访问里面的对象；
   - 对象级的 `SELECT` → 允许你读这张表。

   两个缺一个都会 `permission denied`。所以授权时永远是"`GRANT USAGE ON SCHEMA` + `GRANT SELECT ON 表`"配对出现。

4. **答案：C**。
   解析：`trust` 是**免密认证**——只要网络能连到 5432 端口，报上任何用户名就直接进。生产环境绝不能出现。推荐用 `scram-sha-256`（PG 14+ 默认，密码加盐哈希）。`peer` 只用于本机（校验系统用户名 = 数据库用户名）；`cert` 是客户端证书认证，安全性最高。
   改完 `pg_hba.conf` 必须 `sudo pg_ctlcluster 16 main reload` 才生效。排错口诀：看到 `FATAL: no pg_hba.conf entry for host ...` 就是来源不在任何一条允许规则里。

5. **答案：这是典型的 SQL 注入漏洞**。
   解析：代码把用户输入**直接拼进 SQL 字符串**，输入里的 SQL 片段会被当成代码执行。比如用户输入：
   ```text
   ' OR '1'='1
   ```
   拼出来的语句变成 `WHERE student_no = '' OR '1'='1'`，条件恒真，能绕过任何条件查询整张表；更危险的输入形如 `'; DROP TABLE school.students; --`，如果连接用的账号权限足够，可能导致删表。
   正确写法是**参数化查询**（占位符的值永远只当数据，不会被当作 SQL 执行）：
   ```python
   cur.execute("SELECT * FROM school.students WHERE student_no = %s", (user_input,))
   ```
   配套的防御措施：
   1. **永远参数化查询**，绝不拼接字符串（psql 脚本用 `-v` 变量 + `:'target'`，也不要拼）；
   2. **应用连库用最小权限账号**——只授予它真正需要的那几张表的操作权限，绝不用 `postgres` 超级用户连应用。这样即使被注入，能造成的破坏也有限；
   3. 表名、列名这类无法参数化的部分，用**白名单校验**，不要直接拼用户输入。

</details>

## 第 16 章 自测：你真的完成这个项目了吗

> 本章没有新知识，只有一份"项目交付自检清单"。**全部能打勾，才算真的做完。**

- [ ] 我在 `school2` 模式（或独立数据库）里建好了五张表，外键与 `ON DELETE` 策略（CASCADE / SET NULL）都正确；
- [ ] 示例数据齐备：至少 15 名学生 / 6 名教师 / 8 门课程 / 40 条以上选课记录，且其中包含 NULL 成绩和挂科数据；
- [ ] 视图 `v_course_detail` 和 `v_transcript` 都能查询，且结果和手工核对一致；
- [ ] `fn_set_score` 对三种非法输入（学生不存在、课程不存在、该学生未选此课）都返回了友好提示，而不是报错或静默写入；
- [ ] 三个角色（教务 admin / 教师组 / 学生只读）的权限按 16.4 的表格逐个登录实测通过（能看到预期内的 `permission denied`）；
- [ ] 备份文件已生成，且 `pg_restore --list` 能正常列出内容；
- [ ] （选做）给 `enrollments.created_at` 建了索引，并写出了一条按月统计选课人数的查询；
- [ ] **把 `school2` 推倒，不看答案重做一遍**——能独立完成才算真正掌握。

<details><summary>查看答案解析</summary>

这是一份自查清单，没有标准答案。任何一条打不了勾，回到[第 16 章](第16章_综合项目_学生选课管理系统.md)对应小节补上：

- 表结构与设计决策 → 16.2 节；
- 视图与函数 → 16.3 节；
- 权限落地 → 16.4 节；
- 备份与交付文档 → 16.5 节。

> 最后一条（推倒重做）是这份清单里价值最高的一条。看懂和写出来是两件事，SQL 是练出来的，不是看出来的。

</details>

---

# 第二部分 面试与复习题

难度标记：🟢 基础（必须会） / 🟡 进阶（能区分水平） / 🔴 加分项（资深考点的边角）。

## 一、基础概念

### 1. 🟢 什么是数据库、DBMS、关系型数据库？PostgreSQL 属于哪一类？

<details><summary>参考答案</summary>

- **数据库（Database）**：长期存放在计算机内、**有组织、可共享**的数据集合。关键词是"有组织"——数据按预先设计好的结构（表、列、约束）存放，所以能被高效查询和严格控制。
- **DBMS（数据库管理系统）**：专门管理数据库的**软件**。类比图书馆：所有的书 = 数据库（数据本身）；管理制度 + 管理员 + 借阅系统 = DBMS。
- **关系型数据库**：用"**多张二维表 + 表之间的关联关系**"来组织数据。一张大表打天下的做法会带来数据冗余（课程信息重复存无数遍）和列数无法固定的问题；关系型的做法是拆成多张表、各自存各自的信息，用**主键/外键**互相引用。这套"分表 + 编号引用"的思想叫**规范化（Normalization）**。

**PostgreSQL 属于关系型数据库管理系统（RDBMS）**，而且是其中功能最全、对 SQL 标准支持最完整的一款。三个标签：开源免费（可免费商用）、功能齐全（事务、窗口函数、全文检索、JSON、地理信息都有）、标准严格。

同类：MySQL、Oracle、SQL Server、SQLite。学了 PostgreSQL 再学其他数据库会轻松很多。

</details>

### 2. 🟢 PostgreSQL 的四层结构是什么？为什么说它的 `schema` 和 MySQL 不一样？

<details><summary>参考答案</summary>

四层结构自上而下：

```text
PostgreSQL 服务器（一台装了 PG 的机器，默认监听 5432 端口）
└── 数据库 beginner_pg
    └── 模式 school
        ├── students 表
        ├── teachers 表
        └── ...
```

- 一台服务器可以有**多个数据库**；
- 一个数据库里可以有**多个模式**；
- 一个模式里可以有**多张表**。

访问一张表的完整写法是三层前缀 `库.模式.表`，例如 `beginner_pg.school.students`。实际写 SQL 时库名前缀通常省略，因为连接时已经用 `-d` 指定了当前库；再配合 `search_path`（默认 `"$user", public`），连模式前缀也可以省。

**和 MySQL 的区别**：MySQL 里 `database` 和 `schema` 是**同义词**（`CREATE DATABASE` 和 `CREATE SCHEMA` 一回事）；PostgreSQL 里它们是**两层不同的结构**——模式是数据库内部的"命名空间/文件夹"。所以一个库里可以同时存在 `school.students` 和 `library.students` 而互不冲突，权限也可以按模式整体授予。

三个默认自带对象也顺便记住：`postgres` 数据库、`public` 模式、`postgres` 超级管理员用户。

</details>

### 3. 🟡 主键、UNIQUE 约束、外键有什么区别？外键的作用是什么？

<details><summary>参考答案</summary>

| | 主键 PRIMARY KEY | 唯一约束 UNIQUE | 外键 FOREIGN KEY |
|---|---|---|---|
| 作用 | 唯一标识每一行 | 保证这一列的值不重复 | 保证本列的值在对方表里存在 |
| 是否允许 NULL | 不允许（自带 NOT NULL） | **允许** | 取决于是否加了 NOT NULL |
| 一个表能有几个 | 只能一个（可由多列组成复合主键） | 可以有多个 | 可以有多个 |
| 自动建索引 | 是 | 是 | **否**（要手动建） |

**主键的三条硬规矩**：唯一、非空、稳定（一旦确定尽量不变）。所以别用手机号当主键——学生会换号。示例里 `students` 用自增整数 `student_id` 当主键，业务上的学号 `student_no` 放 `UNIQUE` 约束，这是更稳妥的做法。

**外键的两大价值**：
1. **防止脏数据**：往 `enrollments` 插入 `student_id = 999`（不存在的学生），数据库直接报 `violates foreign key constraint` 拒绝写入——不许出现"选课记录指向幽灵学生"这种数据；
2. **表达关联**：写查询时顺着外键把多张表连起来（JOIN 的依据）。

外键还要配 `ON DELETE` 策略：`NO ACTION`/`RESTRICT`（默认，拒绝删除，最安全）、`CASCADE`（跟着一起删，如"删学生→选课记录一起删"）、`SET NULL`（置空，如"删教师→课程的 teacher_id 置空、课程保留"）、`SET DEFAULT`（置为默认值，少用）。

补充一句：网上有"性能流派"建议不用外键、只在应用层维护。初学阶段和大多数业务系统都应该坚定地用外键——它是数据一致性的保险丝。

</details>

## 二、SQL 查询

### 4. 🟢 SELECT 各子句的**书写顺序**和**执行顺序**分别是什么？这个区别有什么实际意义？

<details><summary>参考答案</summary>

```text
书写顺序：SELECT → FROM → WHERE → GROUP BY → HAVING → ORDER BY → LIMIT
执行顺序：FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT
```

执行顺序的含义是：**先把表拿来（FROM）→ 筛掉不要的行（WHERE）→ 把剩下的行分组（GROUP BY）→ 筛掉不要的组（HAVING）→ 最后才计算 SELECT 里要输出的列 → 再排序、截断。**

实际意义（面试常追问）：

1. **`WHERE` 里不能用聚合函数**，因为执行到 WHERE 时还没分组，聚合值不存在；要筛"组"必须用 `HAVING`。所以 `WHERE AVG(score) > 80` 会报 `aggregate functions are not allowed in WHERE`。
2. **`WHERE` 里不能用 SELECT 中定义的别名**（别名在 SELECT 阶段才产生），但 `ORDER BY` 和 `GROUP BY` 里可以用，因为它们在执行顺序上晚于 SELECT。
3. **窗口函数只能出现在 SELECT 和 ORDER BY 里**，不能进 WHERE / GROUP BY / HAVING——同样是因为它们计算得太晚。要按窗口结果过滤，得在外面套一层（CTE 或派生表）。
4. **能放 WHERE 的条件尽量别放 HAVING**：WHERE 先筛掉行，参与分组的数据量更小，效率更高。

</details>

### 5. 🟢 四种 JOIN 有什么区别？"找没有关联记录的行"怎么写？

<details><summary>参考答案</summary>

```sql
FROM a JOIN b ON a.键 = b.键          -- INNER JOIN，默认
```

| 类型 | 保留哪些行 | 集合直觉 |
|---|---|---|
| `INNER JOIN` | 只保留两表**都匹配上**的行 | 交集 A ∩ B |
| `LEFT JOIN` | 左表**全部保留**，右表配不上的补 NULL | 整个 A |
| `RIGHT JOIN` | 右表**全部保留**（与 LEFT 对称，实践中少用，习惯改写成 LEFT） | 整个 B |
| `FULL JOIN` | 两边**都全保留**，各自配不上的都补 NULL | 并集 A ∪ B |

**"找没有关联记录的行"的标准写法**（反连接）：

```sql
-- 没有选任何课的学生
SELECT s.student_no, s.name
FROM school.students s
LEFT JOIN school.enrollments e ON e.student_id = s.student_id
WHERE e.student_id IS NULL;
```

原理：`LEFT JOIN` 保住左表每一行；没选课的学生那行，右表所有列都是 NULL；再用 `IS NULL` 把这些行挑出来。

等价写法（通常更高效）：

```sql
SELECT s.student_no, s.name
FROM school.students s
WHERE NOT EXISTS (SELECT 1 FROM school.enrollments e
                  WHERE e.student_id = s.student_id);
```

**一个必须记住的坑**：`WHERE e.student_id IS NULL` 和 `ON ... AND e.student_id IS NULL` **不等价**。写在 `ON` 里的条件只影响"能不能配上"，不会过滤左表的行（左表行依然保留）；写在 `WHERE` 里才是过滤最终结果。分歧点记牢：**ON 放连接条件，WHERE 放业务过滤。**

顺带一个反例：`JOIN` 忘写 `ON` 会变成笛卡尔积。示例里 `students`（15 行）`CROSS JOIN courses`（8 行）= 120 行；两张千行表就是一千万行的爆炸——看到行数异常膨胀，先检查 `ON`。

</details>

### 6. 🟡 JOIN 和 GROUP BY 有什么区别？为什么 SELECT 里的非聚合列必须出现在 GROUP BY 里？

<details><summary>参考答案</summary>

两者做的是完全不同的两件事：

- **JOIN 是"横向拼列"**：把多张表的列拼到同一行上，让"王小明"这个名字和"数据库原理"这个课程名同时出现在一行里。行数取决于匹配情况，本质是"把拆开的表拼回来"。
- **GROUP BY 是"纵向压缩"**：把多行按某个键归堆，**每组压缩成一行**输出。行数等于分组的组数，本质是"降维汇总"。

两者经常配合：**先 JOIN 把关联数据拼齐，再 GROUP BY 按维度汇总**——这是分组分析的标准形态。

```sql
-- 每位学生的选课数与平均分（只统计有成绩的课）
SELECT s.name,
       COUNT(e.score)         AS 已考门数,
       ROUND(AVG(e.score), 1) AS 平均分
FROM school.students s
JOIN school.enrollments e ON e.student_id = s.student_id
GROUP BY s.name
ORDER BY 平均分 DESC;
```

**为什么非聚合列必须在 GROUP BY 里**：`GROUP BY city` 之后，"北京"这一组里有 3 个人，会被压缩成**一行**输出。此时如果 SELECT 里还写着 `name`，数据库面对"这一行该显示哪个 name"根本无法回答，所以直接报错：

```text
ERROR: column "students.name" must appear in the GROUP BY clause
       or be used in an aggregate function
```

**换句话说：`GROUP BY` 做不到"每组内取某一行"**。这个需求正是窗口函数的用武之地——窗口函数保留全部行，只是在每行旁边附加计算结果。

```sql
-- 每个学生每一行都显示他自己的平均分（不折叠行）
SELECT s.name, c.course_name, e.score,
       ROUND(AVG(e.score) OVER (PARTITION BY s.student_id), 1) AS 本人平均分
FROM school.enrollments e
JOIN school.students s ON s.student_id = e.student_id
JOIN school.courses  c ON c.course_id  = e.course_id;
```

</details>

### 7. 🟡 WHERE 和 HAVING 有什么区别？可以互相替代吗？

<details><summary>参考答案</summary>

| | WHERE | HAVING |
|---|---|---|
| 作用对象 | 筛**行** | 筛**组** |
| 执行时机 | 分组**之前** | 分组**之后** |
| 能否用聚合函数 | **不能** | **能** |

```sql
-- ✓ 组级条件
SELECT c.course_name, ROUND(AVG(e.score), 1) AS 平均分
FROM school.courses c
JOIN school.enrollments e ON e.course_id = c.course_id
GROUP BY c.course_name
HAVING AVG(e.score) > 75;

-- ✗ 报错：aggregate functions are not allowed in WHERE
SELECT ... WHERE AVG(e.score) > 75
```

两者**不能自由互相替代**：

- **必须用 WHERE 的场合**：过滤单个行，与聚合无关，比如 `WHERE score IS NOT NULL`、`WHERE city = '北京'`。写成 HAVING 虽然语法上可能通过（PG 允许 HAVING 里出现非聚合条件），但语义绕弯、还丢掉了"先筛行减少分组数据量"的性能优势。
- **必须用 HAVING 的场合**：条件里含聚合函数，比如 `HAVING COUNT(*) >= 5`、`HAVING AVG(score) > 75`。
- 两者可以**同时出现在一条查询里**，各筛各的：

```sql
-- 只看 2023 级学生（WHERE 筛行），再找平均分高于 75 的课程（HAVING 筛组）
SELECT c.course_name, COUNT(*) AS 人数, ROUND(AVG(e.score), 1) AS 平均分
FROM school.enrollments e
JOIN school.courses c ON c.course_id = e.course_id
JOIN school.students s ON s.student_id = e.student_id
WHERE s.enrolled_on >= DATE '2023-09-01'
GROUP BY c.course_name
HAVING AVG(e.score) > 75;
```

**性能原则**：能写在 WHERE 里过滤掉的行，不要留给 HAVING。

</details>

### 8. 🟡 IN、EXISTS、NOT IN、NOT EXISTS 有什么区别？什么时候必须用 NOT EXISTS？

<details><summary>参考答案</summary>

- **`IN (子查询)`**：判断值是否在子查询结果集合里。适合子查询结果**较小**的场景。
- **`EXISTS (子查询)`**：判断子查询**是否返回至少一行**，是"存在性检查"。它是**半连接**——找到第一行就短路返回，不关心 SELECT 后面写什么（惯例写 `SELECT 1`）。大表关联时通常比 `IN` 更高效。
- **`NOT IN`**：`x NOT IN (值1, 值2, ...)` 等价于 `x <> 值1 AND x <> 值2 AND ...`。
- **`NOT EXISTS`**：`NOT EXISTS` 比 `NOT IN` 安全得多。

**什么时候必须用 NOT EXISTS**：当子查询的返回列**可能包含 NULL** 时。

原因：只要子查询结果里出现**一个 NULL**，就会产生一个 `x <> NULL`；而 `x <> NULL` 的结果是 NULL（不是 true）；`true AND NULL = NULL`，整个条件不再为 true，于是**所有行都被过滤掉，查询返回空结果**。

```sql
-- ✗ 有隐患：如果子查询可能返回 NULL，结果可能一行都没有
SELECT name FROM school.students
WHERE student_id NOT IN (SELECT student_id FROM school.enrollments WHERE course_id = 1);

-- ✓ 推荐：语义是"不存在这样的行"，NULL 不会造成误判
SELECT s.name FROM school.students s
WHERE NOT EXISTS (SELECT 1 FROM school.enrollments e
                  WHERE e.student_id = s.student_id AND e.course_id = 1);
```

另外，`NOT IN` 遇到的结果集如果很大，数据库可能需要先把整个集合物化出来才能判断；`NOT EXISTS` 则是相关子查询，可以边找边判、提前结束。

**实践建议**：一律优先用 `EXISTS` / `NOT EXISTS`，除非明确知道子查询列是 NOT NULL 且结果很小。

</details>

## 三、NULL 与三值逻辑

### 9. 🟢 NULL 是什么？为什么 `WHERE 列 = NULL` 查不到任何数据？

<details><summary>参考答案</summary>

**NULL 的语义是"未知"（unknown）**——不是 0，不是空字符串 `''`，也不是"没有这个值"。

- `SELECT '' IS NULL;` → **false**（空字符串是"已知：内容为空"）
- `SELECT length('');` → **0**
- `SELECT length(NULL);` → **NULL**

**为什么 `= NULL` 查不到数据**：SQL 用的是**三值逻辑**——条件的结果可以是 `true` / `false` / `NULL`（unknown）。而 `WHERE` 的规则是：**只有条件为 true 的行被保留，false 和 NULL 都被丢弃。**

`NULL` 表示"未知"，那么"一个未知的东西是否等于某个值？"——答案是"**不知道**"，结果就是 NULL（不是 true，也不是 false）。所以：

```sql
SELECT NULL = NULL;      -- 结果：NULL
SELECT NULL <> 1;        -- 结果：NULL
SELECT NULL IS NULL;     -- 结果：true（判断"是不是未知"是可以回答的）
```

```sql
SELECT * FROM school.enrollments WHERE score = NULL;    -- ✗ 永远 0 行
SELECT * FROM school.enrollments WHERE score IS NULL;   -- ✓ 示例数据返回 3 行
```

**结论：判断空值只能用 `IS NULL` / `IS NOT NULL`**，绝不能用 `=` / `<>` / `!=`。

两个直接后果（都是新手必踩的坑）：
1. 聚合函数（`SUM`/`AVG`/`MAX`/`MIN`）**自动跳过 NULL**——`AVG(score)` 的分母是"有成绩的记录数"，所以"未考试算不算 0 分"这个统计口径必须先想清楚，两种口径结果完全不同；
2. `COUNT(*)` 数所有行（包括全 NULL 行），`COUNT(列)` 跳过该列的 NULL。示例数据里 42 条选课记录、`COUNT(score) = 39`（差 3 条在读未考）。

</details>

### 10. 🟡 为什么 `WHERE city <> '北京'` 会漏掉 city 为 NULL 的行？怎么正确处理？

<details><summary>参考答案</summary>

因为 `NULL <> '北京'` 的结果**不是 true，而是 NULL**（unknown）；而 `WHERE` 只保留条件为 true 的行，所以这些行被**静默丢弃**了——不报错、不提示，最难排查。

示例数据验证：15 名学生中北京 3 名、city 为 NULL 的 1 名（郑浩），其余 11 名。

```sql
-- 返回 11 行：郑浩（city 为 NULL）不出现
SELECT name FROM school.students WHERE city <> '北京';

-- 返回 12 行：正确写法
SELECT name FROM school.students WHERE city <> '北京' OR city IS NULL;

-- 另一种等价写法：把 NULL 当成一个普通取值来排除
SELECT name FROM school.students WHERE COALESCE(city, '') <> '北京';
```

**通用规则**：凡是写"不等于某值""不包含在某集合里"的条件，都要先问一句"**这一列有没有 NULL？**"针对 NULL 列做否定条件的查询，必须显式补上 `OR 列 IS NULL`，或者用 `NOT EXISTS` 这类不受 NULL 影响的形式。

同样的坑还有两种变体：
- `NOT IN (子查询含 NULL)` → 结果可能一行都不返回（见下一题）；
- `COUNT(列)` 和 `COUNT(*)` 的差异、`AVG` 分母不含 NULL——统计口径上的坑。

</details>

### 11. 🟡 `NOT IN` 遇上含 NULL 的子查询会发生什么？COUNT(*) 和 COUNT(列) 有什么区别？

<details><summary>参考答案</summary>

**第一问：NOT IN 遇 NULL 会"全军覆没"。**

`x NOT IN (值1, 值2, ..., NULL)` 等价于 `x <> 值1 AND x <> 值2 AND ... AND x <> NULL`。由于 `x <> NULL` 的结果是 NULL，而 `true AND NULL = NULL`（不是 true），整个条件永远不为 true——**查询返回空结果**。

```sql
-- 子查询结果里若混入一个 NULL，这条可能一行都返回不了
SELECT name FROM school.students
WHERE student_id NOT IN (SELECT student_id FROM school.enrollments WHERE course_id = 1);

-- 解法一：排除 NULL
... NOT IN (SELECT student_id FROM school.enrollments
            WHERE course_id = 1 AND student_id IS NOT NULL);

-- 解法二（推荐）：改用 NOT EXISTS，语义清晰且不受 NULL 影响
SELECT s.name FROM school.students s
WHERE NOT EXISTS (SELECT 1 FROM school.enrollments e
                  WHERE e.student_id = s.student_id AND e.course_id = 1);
```

> 注意：示例数据里 `enrollments.student_id` 是 `NOT NULL`，所以那条 `NOT IN` 侥幸能正常工作。但**依赖"侥幸"是危险的**——换个列、换个数据就可能全线失效，所以统一用 `NOT EXISTS` 更稳妥。

**第二问：COUNT(*) 与 COUNT(列) 的区别。**

| | 数什么 | 对 NULL |
|---|---|---|
| `COUNT(*)` | 数的**行数** | 全 NULL 的行也数 |
| `COUNT(列)` | 数该列**非空值**的个数 | **跳过** NULL |

示例数据：`enrollments` 共 42 行，其中 3 条 score 为 NULL（在读未考）。

```sql
SELECT COUNT(*)     AS 记录总数,   -- 42
       COUNT(score) AS 有成绩数   -- 39
FROM school.enrollments;
```

**实践含义**：数"记录条数"用 `COUNT(*)`；数"该字段实际填了的"用 `COUNT(列)`。写报表时要明确口径——分母到底该用 42 还是 39，结论差别很大。

</details>

## 四、事务与并发

### 12. 🟢 什么是事务？ACID 分别是什么？

<details><summary>参考答案</summary>

**事务（Transaction）把多条 SQL 捆成一个"要么全部成功、要么全部不做"的原子单元。**

经典例子是转账：A 给 B 转 100 元 = 两条 UPDATE（A 减 100、B 加 100）。如果没有事务，第一条成功后突然断电、第二条没执行，100 元就凭空消失了。

| 特性 | 含义 | 通俗说法 |
|---|---|---|
| **A**tomicity 原子性 | 全部成功或全部回滚 | 一荣俱荣，一损俱损 |
| **C**onsistency 一致性 | 事务前后数据都满足所有约束 | 账目永远平 |
| **I**solation 隔离性 | 并发事务互不干扰（程度可调） | 各干各的，像独占数据库 |
| **D**urability 持久性 | COMMIT 后的修改断电也不丢 | 落袋为安 |

基本操作：

```sql
BEGIN;                          -- 开启事务
UPDATE ...;                     -- 一系列操作
COMMIT;                         -- 定案，之后不可再撤销
-- 或者 ROLLBACK;               -- 反悔，回到 BEGIN 之前
```

**两个加分点**：

1. **PostgreSQL 里 DDL 也能进事务、也能回滚**——建表、删表、改表结构都可以 `ROLLBACK`（MySQL 大部分场景不行），这是 PG 的一大优势，做数据迁移时很有用；
2. **不写 `BEGIN` 时每条语句自动提交**（自动提交模式）——这就是为什么"不带 WHERE 的 UPDATE"没有后悔药，也是危险操作必须手动包事务的原因。

实用模板（背下来）：

```sql
BEGIN;
-- 危险的 UPDATE / DELETE
-- SELECT 检查影响范围
COMMIT;   -- 或 ROLLBACK;
```

psql 里事务未提交时提示符会变成 `beginner_pg=*>`，那个 `*` 就是警报。

</details>

### 13. 🟡 PostgreSQL 的默认隔离级别是什么？四种隔离级别分别解决什么问题？

<details><summary>参考答案</summary>

PostgreSQL **默认是 READ COMMITTED**（读已提交）。用 `SHOW transaction_isolation;` 查看，在 BEGIN 时指定：`BEGIN ISOLATION LEVEL REPEATABLE READ;`。

| 隔离级别 | 脏读 | 不可重复读 | 幻读 | 说明 |
|---|---|---|---|---|
| READ UNCOMMITTED | — | — | — | PG **不支持**，实际等同 READ COMMITTED |
| **READ COMMITTED**（默认） | 不可能 | **可能** | 可能 | 每条语句开始时取最新快照；90% 场景够用 |
| REPEATABLE READ | 不可能 | 不可能 | PG 下**也不可能** | 整个事务用同一个快照 |
| SERIALIZABLE | 不可能 | 不可能 | 不可能 | 最严格，冲突多，需要重试逻辑 |

两种级别的实际差别：

- **READ COMMITTED**：**每条语句**开始时取一张最新快照。所以同一个事务里两次读，可能读到不同结果——如果别人在这期间提交了新值，你会看到新值（这就是"不可重复读"）。它的优点是简单、冲突少、几乎不用重试。
- **REPEATABLE READ**：**事务开始时**取一张快照，之后整个事务里的读数保持一致。代价是——如果你要**修改**一个别人已经改过并提交的行，会报：
  ```text
  ERROR: could not serialize access due to concurrent update
  ```
  这时只能 `ROLLBACK` 整个事务重来（不能原地继续），应用需要重试逻辑。

**加分点**：PostgreSQL 的 REPEATABLE READ 实现基于**快照隔离**，比 SQL 标准的 REPEATABLE READ 更严格——标准允许的幻读在 PG 里也被阻止了。而 `SERIALIZABLE` 用的是 SSI（可串行化快照隔离）技术，能发现更隐蔽的"写偏斜"问题，但冲突时会报 `could not serialize access due to read/write dependencies`，必须重试。

**选型建议**：默认的 READ COMMITTED 能满足绝大多数 Web 应用；报表、对账、需要"整个事务内读数一致"的场景用 REPEATABLE READ。

</details>

### 14. 🟡 什么是 MVCC？为什么 PostgreSQL 能做到"读不阻塞写、写不阻塞读"？

<details><summary>参考答案</summary>

**MVCC = 多版本并发控制（Multi-Version Concurrency Control）。**

核心思路：**修改数据时不原地覆盖，而是生成这一行的新版本**（旧版本继续留在数据文件里）。每个事务按照自己的**快照**去选择"我该看哪个版本"。

举个例子：会话 A 在事务里读 `student_id = 2` 的 `city`，看到 `'上海'`；同时会话 B 把这一行改成 `'魔都'`（还没提交）。B 的修改其实是**写了这行的一个新版本**，A 的事务快照仍然指向旧版本，所以 A 继续读到 `'上海'`——**读和写互不干扰**。

这就带来了 PostgreSQL 高并发的根基：

- 读操作不需要等写操作释放锁 → **读不阻塞写**；
- 写操作不需要等读操作结束 → **写不阻塞读**。

对比一下：如果实现方式是在行上加锁、读写互斥，那么一个长查询就会把整张表的写入堵死，并发性能会差很多。

**代价**：旧版本不会立刻物理消失，需要定期清理，否则表会不断膨胀（bloat）。这个工作由 **`autovacuum`（后台自动运行）** 完成，也可以手动执行：

```sql
VACUUM 表名;             -- 回收空间供表内复用
VACUUM ANALYZE 表名;     -- 顺带刷新统计信息
VACUUM FULL 表名;        -- 物理重组并归还磁盘（会锁全表，只在维护窗口做）
```

**面试延伸**：看到监控里 `dead tuples` 增长异常、表膨胀，通常意味着 autovacuum 跟不上业务写入节奏（常见于长事务、大批量更新）。这时要查长事务（`pg_stat_activity`）、调 autovacuum 参数，而不是简单地跑 `VACUUM FULL`。

</details>

### 15. 🟡 什么是死锁？PostgreSQL 如何检测和处理？怎么预防？

<details><summary>参考答案</summary>

**死锁**：两个（或多个）事务互相等待对方持有的锁，形成环，谁也进行不下去。典型场景：

```text
事务 A：UPDATE 第 1 行（拿到行 1 的锁） → 想 UPDATE 第 2 行（等 B 释放）
事务 B：UPDATE 第 2 行（拿到行 2 的锁） → 想 UPDATE 第 1 行（等 A 释放）
                              ↑ 互相等，永久僵持
```

**PostgreSQL 的处理机制**：

- 有参数 `deadlock_timeout`（默认约 1 秒）。一个事务等锁超过这个时间，PG 才会启动死锁检测（平时不做检测是为了省开销）；
- 检测到死锁后，PG **主动牺牲其中一个事务**：报 `ERROR: deadlock detected` 并回滚它，另一个事务继续正常执行；
- 因此 PG 中死锁**不会永久卡死**，但会把相关的一个事务打断。

**应用侧的正确应对**：

1. **捕获死锁错误并重试**：把整个事务包在重试逻辑里（比如最多重试 3 次）。死锁是并发环境下的正常现象，不是 bug；
2. **让事务按相同顺序访问数据**：如果所有事务都按"先小 id 后大 id"的顺序更新行，就不会形成环。这是最有效的预防手段；
3. **给等锁加上限**：会话里 `SET lock_timeout = '5s';`，避免某条语句无限期等待；
4. **事务尽量短**：长事务持有锁的时间长，发生冲突的概率成倍上升；
5. **排障方法**：管理员会话里查 `pg_stat_activity` 视图看"谁在跑什么、谁在等什么"；必要时用 `SELECT pg_terminate_backend(pid);` 终结卡死的会话。

```sql
SELECT pid, state, wait_event_type, query
FROM pg_stat_activity
WHERE datname = 'beginner_pg';
```

</details>

## 五、索引与优化

### 16. 🟢 索引是什么？为什么能加速查询？默认的 B-tree 索引适合什么样的查询？

<details><summary>参考答案</summary>

**索引是数据库提前建好的"查找目录"**，作用类似书的目录或字典的部首索引——不用把整本书翻一遍，就能直接定位到目标内容。

没有索引时，数据库只能**顺序扫描**（`Seq Scan`）：从第一行读到最后一行，逐行判断是否符合条件。这叫 O(n) 复杂度。48 行的示例表毫无压力，但 4800 万行的表平均要翻 2400 万行，就是灾难。

**B-tree（平衡多路搜索树）** 把索引列的值**有序组织**成树形结构，查找从树根往下走，只需 O(log n) 步就能定位——4800 万行也只要约 26 步。

**B-tree 索引适合**：

| 查询类型 | 例子 | 说明 |
|---|---|---|
| 等值查询 | `WHERE user_no = 500` | 最典型 |
| 范围查询 | `WHERE user_no BETWEEN 100 AND 200`、`>`、`<` | 靠"有序"直接定位区间 |
| 排序 | `ORDER BY created` | 索引本身有序，可省去排序步骤 |
| 前缀匹配 | `LIKE '王%'` | 靠左边的确定字符定位 |

**B-tree 不适合**：前置通配符（`LIKE '%王'`）、包含类查询（数组、JSONB、全文检索——那些用 GIN 索引）。

**另一个必须记住的事实**：**主键和 UNIQUE 约束会自动创建索引，而外键不会。** 所以外键列要手动建：

```sql
CREATE INDEX idx_enrollments_student ON school.enrollments(student_id);
```

外键列没索引的后果有两层：按这个列查询会全表扫；删除父表行时数据库要检查子表引用，同样会全表扫。

</details>

### 17. 🟡 什么情况下索引**不生效**？复合索引的列顺序为什么重要？

<details><summary>参考答案</summary>

**最核心的一句话：索引喜欢"干净的列"，讨厌"被加工过的列"。**

**（1）在列上做运算**

```sql
WHERE user_no + 1 = 501        -- ✗ 索引里存的是原始值，算过了就对不上
WHERE user_no = 500            -- ✓ 改写后就能走索引
```

**（2）用函数包裹列**

```sql
WHERE lower(email) = 'a@b.c'   -- ✗
WHERE email = 'a@b.c'          -- ✓
```
确实需要按 `lower(email)` 查的话，要建**表达式索引**：
```sql
CREATE INDEX idx_students_name_lower ON school.students (lower(name));
```

**（3）隐式类型转换**

```sql
WHERE user_no::text = '500'    -- ✗ 手工转换把列"加工"了
```
更隐蔽的是列类型和比较值类型不一致时数据库自动做的转换（比如字符串列和数字比较），同样可能毁掉索引。

**（4）`LIKE` 前置通配符**

```sql
WHERE name LIKE '%王'          -- ✗ B-tree 靠"有序"工作，前面未知就没法定位
WHERE name LIKE '王%'          -- ✓ 后置通配符可以
```
频繁的模糊搜索要考虑 `pg_trgm` 扩展。

**（5）复合索引的"最左前缀"原则（重点）**

复合索引 `(a, b, c)` 相当于"先按 a 排，a 相同再按 b 排，b 相同再按 c 排"。所以：

```sql
-- 索引 (student_id, course_id)
WHERE student_id = 5                              -- ✓ 用上最左列
WHERE student_id = 5 AND course_id = 3            -- ✓ 两列都用上
WHERE course_id = 3                               -- ✗ 跳过了最左列，用不上
WHERE course_id = 3 AND student_id = 5            -- ✓ 优化器会重排，依然能用（顺序写反没关系）
WHERE student_id = 5 AND score > 80               -- 只能用上 student_id 部分
```
所以建复合索引时，**把最常用作单条件查询的列放在最左边**。

**（6）优化器主动放弃索引（不是 bug）**

当查询要返回的行占全表比例很大时（经验值大致是 20%~30% 以上），走索引反而要"索引 + 回表"来回跳，不如顺序扫描快。此时 `Seq Scan` 是**合理决策**。

**（7）统计信息过期**

`EXPLAIN` 输出里的 `rows=` 是**预估**行数，基于统计信息。如果预估和实际差得很远（用了 `EXPLAIN ANALYZE` 就能对比出来），优化器可能选错计划。大批量导入后手动跑一次：

```sql
ANALYZE 表名;
```

</details>

### 18. 🟡 怎么排查一条慢查询？`EXPLAIN` 里重点看什么？

<details><summary>参考答案</summary>

**第一步：先看执行计划，别凭感觉改。**

```sql
EXPLAIN ANALYZE SELECT ...;
```

- `EXPLAIN` 只显示"打算怎么执行"（不真跑）；
- `EXPLAIN ANALYZE` **真正执行**并把实际耗时附在计划里。**注意：对 UPDATE/DELETE 用 ANALYZE 会真的改数据**——调试慢的 UPDATE 时，要把它改写成同条件的 `SELECT` 再分析。

**第二步：在计划里找这几样东西。**

| 关键词 | 含义 | 怎么判断 |
|---|---|---|
| `Seq Scan on 表名` | 全表顺序扫描 | 小表正常，**大表出现就是警报** |
| `Index Scan using idx_xxx on 表名` | 走了某个索引 | 通常是好消息 |
| `Index Cond: (...)` | 索引里实际使用的条件 | 看它有没有用上你期望的列 |
| `Filter: (...)` | 索引之外还要**逐行过滤**的条件 | 出现在这里说明这部分没走索引 |
| `Nested Loop` / `Hash Join` / `Merge Join` | 两表怎么连接 | 小表适合嵌套循环，大表适合哈希 |
| `rows=`（预估） vs `actual rows=`（实际） | 行数估计 | **两者差得远 = 统计信息过期**，跑 `ANALYZE` |
| `Execution Time: xx ms` | 真实耗时 | 优化前后对比的标尺 |

计划是**树形**的，每层有缩进。**找耗时最长的那一层**（分析时看 `actual time` 的第二个数值，即到该节点为止的累计耗时），它就是优化目标。

**第三步：按性价比从高到低动手优化。**

1. 给 `WHERE` / `JOIN ... ON` / `ORDER BY` 的热列加索引（**外键列别忘了**）；
2. 统计信息过期 → `ANALYZE 表名;`；
3. **只取需要的列**，`SELECT *` 会多读数据、还可能让"覆盖索引"失效；
4. **深分页改 keyset**：`OFFSET 100000` 要先扫过前 10 万行，改成 `WHERE id > 上页末尾的 id LIMIT 20`；
5. **批量写入**：一万条单行 INSERT 合成一个多值 INSERT，或用 `COPY`，快一个数量级；
6. 优化完**再跑一次 `EXPLAIN ANALYZE` 对比**——没变快就说明方向错了，回退。

**第四步：系统层（进阶）**：`shared_buffers`、`work_mem` 等参数，以及用 `pg_stat_statements` 扩展找出"总体最耗时"的语句（单次快但一天跑一百万次的语句才是真正的问题）。

</details>

### 19. 🟡 索引是越多越好吗？写多读少的表怎么权衡？

<details><summary>参考答案</summary>

**不是越多越好。索引是"用写换读"的交易。**

索引的收益和成本：

| | 收益 | 成本 |
|---|---|---|
| 读（SELECT） | 查询从 O(n) 变 O(log n) | — |
| 写（INSERT/UPDATE/DELETE） | — | 每次写都要**同步维护所有相关索引**（B-tree 可能还要分裂页） |
| 存储 | — | 每个索引都占磁盘，大表上索引体积可能赶得上表本身 |

所以对**写多读少**的表（日志表、事件表、消息表），索引过多会显著拖慢写入吞吐。权衡原则：

1. **按实际查询建索引，而不是按列建索引。** 先收集真实的慢查询（`pg_stat_statements`），看它们的 `WHERE` / `JOIN ON` / `ORDER BY` 用到哪些列，再针对性建；
2. **优先建复合索引而不是堆多个单列索引。** `(a, b)` 一个索引能服务 `WHERE a = ?` 和 `WHERE a = ? AND b = ?`；如果分别建 `(a)` 和 `(b)`，写时要维护两个索引，读时 `WHERE a = ? AND b = ?` 也未必两个都用得上；
3. **删掉从未被使用的索引。** PostgreSQL 有 `pg_stat_user_indexes` 视图（`idx_scan` 列）可以看每个索引被用过多少次，长期为 0 的索引就是纯成本，可以考虑 `DROP INDEX`；
4. **清理冗余索引**：已经有了 `(a, b, c)`，再建一个 `(a)` 通常是多余的（最左前缀已经覆盖）；
5. **唯一索引、外键索引**别轻易删——前者保证约束，后者影响父表删除的性能。

**面试常用的一句话总结**：索引让"读"变快、让"写"变慢、占磁盘；先有慢查询、再有索引，而不是反过来。

</details>

## 六、备份与权限

### 20. 🟢 `pg_dump` 和 `pg_dumpall` 有什么区别？`-Fc` 自定义格式有什么好处？为什么说"没做过恢复演练的备份等于没备份"？

<details><summary>参考答案</summary>

**（1）工具的区别**

| 工具 | 备份范围 | 格式 | 场景 |
|---|---|---|---|
| `pg_dump` | **单个数据库**（表结构、数据、索引、约束、函数等） | SQL 文本 / 自定义 / 目录 | 日常备份、单库迁移 |
| `pg_dumpall` | **整个集群**（所有数据库 + 全局对象：角色、表空间） | SQL 文本 | 服务器整体搬迁 |
| `pg_basebackup` | 物理全量 + WAL | 二进制 | 建从库、PITR（进阶） |

**一个高频踩坑点**：`pg_dump` **不包含角色和密码**（角色是集群级对象，不属于某个数据库）。所以新服务器上恢复完库，经常"数据都在但连不上"——因为用户没恢复。集群迁移要用 `pg_dumpall --globals-only` 把角色补上。

**（2）`-Fc` 自定义格式的好处**

| | SQL 文本（`-f backup.sql`） | 自定义（`-Fc -f backup.dump`） |
|---|---|---|
| 可读性 | 可以 `cat` 看、可以 diff、能进 git | 二进制，看不了 |
| 恢复工具 | 任何 `psql` 都行 | 只能 `pg_restore` |
| 压缩 | 要外挂 gzip | **内置**（体积约为文本的 1/3） |
| 并行恢复 | 不支持 | 支持 `-j N` |
| 选择性恢复 | 不支持 | 支持 `-t 表名`、`--data-only` |

选型：**个人/教学项目用 SQL 文本**（可读可查，适合进版本库）；**生产用自定义格式**（压缩 + 并行 + 选择性）。

**（3）为什么必须做恢复演练**

因为备份的价值**只在恢复的那一刻才被验证**。常见的"备份其实是废的"：

- 备份文件生成了，但从未有人试过恢复——恢复时才发现文件截断、权限不对、版本不匹配；
- 恢复时才发现目标库没建（SQL 备份不含 `CREATE DATABASE`）；
- `pg_dump` 的版本比服务器的版本**低**，恢复时报 `server version mismatch`（规则是：客户端的 pg_dump 版本 ≥ 服务器版本）；
- 备份和数据库在同一台机器/同一块盘上，机器一挂全没了。

所以两条铁律：**① 没做过恢复演练的备份等于没备份；② 备份必须异地存一份。** 每季度自检"备份三问"：能不能恢复？恢复要多快？备份在另一台机器上吗？

</details>

### 21. 🟡 怎么给一个只读账号做最小权限授权？为什么 `ALL TABLES IN SCHEMA` 还不够？

<details><summary>参考答案</summary>

**（1）PostgreSQL 的两层权限模型**

```text
第一层：能不能连？  ── pg_hba.conf + 角色的 LOGIN 属性 + 数据库的 CONNECT 权限
第二层：进来能干什么？── 模式的 USAGE + 表/函数的 SELECT/INSERT/UPDATE/...
```

**必须两层都过**：只给表的 `SELECT` 但没给模式的 `USAGE`，一样访问不到（报 `permission denied for schema`）。

**（2）只读账号的完整授权（四句 + 一句补漏）**

```sql
-- ① 创建可登录角色
CREATE ROLE ta_reader LOGIN PASSWORD 'ta_reader_2024';

-- ② 允许连接这个库
GRANT CONNECT ON DATABASE beginner_pg TO ta_reader;

-- ③ 允许"路过"school 模式（极易遗漏，漏了就全盘失败）
GRANT USAGE ON SCHEMA school TO ta_reader;

-- ④ 授予已存在表的只读权限
GRANT SELECT ON ALL TABLES IN SCHEMA school TO ta_reader;

-- ⑤ 关键补漏：对"将来新建的表"预设权限
ALTER DEFAULT PRIVILEGES FOR ROLE student_pg IN SCHEMA school
    GRANT SELECT ON TABLES TO ta_reader;
```

**（3）为什么第 ⑤ 句不能省**

`GRANT ... ON ALL TABLES IN SCHEMA` 只对**执行这条 GRANT 那一刻已存在**的表生效。第二天 `student_pg` 在 `school` 里新建一张表，`ta_reader` 默认看不到。这是一个非常隐蔽的运维事故来源——上线时测得好好的，加了一张新表就读不了。**这是新手 100% 会遗漏的一步。**

**（4）团队管理的正解：组角色 + 成员继承**

```sql
CREATE ROLE readonly_group NOLOGIN;     -- 组：不能登录，只是权限容器
GRANT USAGE ON SCHEMA school TO readonly_group;
GRANT SELECT ON ALL TABLES IN SCHEMA school TO readonly_group;
ALTER DEFAULT PRIVILEGES FOR ROLE student_pg IN SCHEMA school
    GRANT SELECT ON TABLES TO readonly_group;

CREATE ROLE alice LOGIN PASSWORD '...';
CREATE ROLE bob   LOGIN PASSWORD '...';
GRANT readonly_group TO alice, bob;     -- 建号 + 入组，权限一处生效
```
以后调权限只改组角色，所有成员自动跟随；新同事入职只需一条 `GRANT 组 TO 新账号`。

**（5）其他最小权限要点**

- **应用账号绝不使用 `postgres` 超级用户**：应用需要什么就给什么（读多写少的接口只给 SELECT，需要写入的只给特定表的 INSERT/UPDATE）；
- **敏感操作收回直接写权限，只开放函数**：[第 16 章](第16章_综合项目_学生选课管理系统.md)的做法是教师组只有 `SELECT ON ALL TABLES` + `EXECUTE ON FUNCTION fn_set_score(...)`，没有 `enrollments` 的 UPDATE 权限——改成绩只能走带校验的函数；
- **回收与查看**：`REVOKE ... FROM 角色` 回收；`\dp 模式.*`、`information_schema.role_table_grants`、`has_table_privilege('角色','表','SELECT')` 三种方式核对；
- **私库收紧连接**：`REVOKE CONNECT ON DATABASE xxx FROM PUBLIC;` 禁止陌生角色连接。

**验证方式**：一定要用被授权的角色**实际登录一次**，把"能做的"和"不能做的"都试一遍（后者要能看到预期的 `permission denied`），而不是只看 `\dp` 的输出。

</details>

## 七、安全意识

### 22. 🟢 什么是 SQL 注入？怎么防？

<details><summary>参考答案</summary>

**原理一句话：把用户输入直接拼进 SQL 字符串，输入里夹带的 SQL 就会被当成代码执行。**

```python
# ✗✗✗ 危险写法
sql = f"SELECT * FROM school.students WHERE student_no = '{user_input}'"
cur.execute(sql)
```

用户在输入框里填：

```text
' OR '1'='1
```

拼出来的语句变成：

```sql
SELECT * FROM school.students WHERE student_no = '' OR '1'='1'
```

条件恒真，绕过了原本的查询条件，能拉走整张表的数据。更危险的输入形如 `'; DROP TABLE school.students; --`——如果连接的账号权限足够，可能导致删表。这就是 SQL 注入：**用户输入"逃逸"出了数据的位置，变成了代码。**

**防御措施（按重要性排序）**：

**① 永远用参数化查询**（根本解法）

```python
# ✓✓✓ 正确写法：占位符的值永远只当数据，不会被当作 SQL 语法解析
cur.execute("SELECT * FROM school.students WHERE student_no = %s", (user_input,))
```

不同驱动的占位符写法不同（psycopg 用 `%s`，有些驱动用 `?` 或 `:name`），但原理一致：**SQL 语句的结构在编译期就固定了，参数值只是数据**。

psql 脚本里同理，用变量而不是拼接：

```bash
$ psql -v target='S2023001' -f query.sql
```
```sql
-- query.sql 里：
SELECT * FROM school.students WHERE student_no = :'target';
```

**② 应用连库用最小权限账号**（最后一道保险）

即使某处漏了参数化被注入，如果应用账号只有"读 `school` 模式"的权限，攻击者也没法 `DROP TABLE`、没法读别的库。**绝不要用 `postgres` 超级用户连应用**——这是最常见的、也是最致命的一个坏习惯。

**③ 表名、列名这类无法参数化的部分，用白名单校验**

```python
# ✗ 拼接标识符
sql = f"SELECT * FROM students ORDER BY {sort_column}"
# ✓ 白名单
ALLOWED = {'name', 'student_no', 'birth_date'}
if sort_column not in ALLOWED:
    raise ValueError('非法的排序字段')
```

**④ 其他配套**

- 不把数据库错误原文直接返回给前端（错误信息会泄漏表名、列名）；
- 数据库密码不写进代码库，用环境变量或权限 600 的 `.pgpass`；
- 定期用工具做代码审计 / 静态扫描。

**面试答法**：先一句话说清原理（拼接导致输入被当代码），再给出"参数化查询是根本解法"，最后补"最小权限是纵深防御"——三层说完，比只答"用参数化查询"完整得多。

</details>

---

## 附：复习建议

**自测题怎么用**

- 第 1~15 章：学完一章立刻做本章 5 题，**不看答案先做**，卡住超过 10 分钟再看解析；
- [第 0 章](第00章_学习准备.md)和[第 16 章](第16章_综合项目_学生选课管理系统.md)的清单：分别是"开工前"和"交付前"的自检，逐条打勾；
- 做错的题，把章节正文对应小节重读一遍，然后在 psql 里把 SQL 亲手敲一遍——**看懂和写出来是两件事**。

**面试题怎么用**

- 按主题过，每个主题先自问自答，再对照参考答案补漏；
- 🟢 的题必须能脱口而出；🟡 的题要能"说清楚原理 + 举出例子"；🔴 的题能说到"知道有这回事、大致原理是什么"即可；
- 涉及数字的地方（比如 `COUNT(*)` 是 42、`COUNT(score)` 是 39）如果记不准，答题时**说机制不要说数字**——面试官更在意你知不知道 `COUNT(*)` 和 `COUNT(列)` 对 NULL 的处理不同。

**最后一句**

这份附录里的所有 SQL 都能在示例库上跑。**别只读，去跑。** 如果结果和解析对不上，那正是你该停下来想清楚的地方。
