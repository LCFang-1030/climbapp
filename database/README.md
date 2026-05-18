指令：
mysql -u username -p databasename < filename.sql
mysqldump -u username -p databasename > filename.sql

導出：
mysqldump -u climbapp -p climbing_app > climbing_app.sql
導入：
mysql -u climbapp -p climbing_app < climbing_app.sql
