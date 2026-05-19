
INITIAL：
mysql -u root -p
CREATE DATABASE climbing_app;

建立帳號：
CREATE USER 'climbapp'@'localhost'
IDENTIFIED BY 'climbapp';
GRANT ALL PRIVILEGES
ON climbing_app.*
TO 'climbapp'@'localhost';
FLUSH PRIVILEGES;

指令：
mysql -u username -p databasename < filename.sql
mysqldump -u username -p databasename > filename.sql

導出：
mysqldump -u climbapp -p climbing_app > climbing_app.sql
導入：
mysql -u climbapp -p climbing_app < climbing_app.sql


SHOW DATABASES;
USE climbing_app;
SHOW TABLES;