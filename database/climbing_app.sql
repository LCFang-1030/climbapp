/*M!999999\- enable the sandbox mode */ 
-- MariaDB dump 10.19-12.1.2-MariaDB, for Win64 (AMD64)
--
-- Host: localhost    Database: climbing_app
-- ------------------------------------------------------
-- Server version	12.1.2-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*M!100616 SET @OLD_NOTE_VERBOSITY=@@NOTE_VERBOSITY, NOTE_VERBOSITY=0 */;

--
-- Table structure for table `bulletin_board`
--

DROP TABLE IF EXISTS `bulletin_board`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `bulletin_board` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT COMMENT '留言板ID',
  `content` text NOT NULL COMMENT '留言內容',
  `status` tinyint(3) unsigned NOT NULL DEFAULT 1 COMMENT '留言狀態：1=已發布 2=已完成 3=已取消 4=置頂',
  `created_by` int(6) unsigned zerofill NOT NULL COMMENT '建立員工 ID',
  `updated_by` int(6) unsigned DEFAULT NULL COMMENT '最後修改員工 ID',
  `is_active` tinyint(1) NOT NULL DEFAULT 1 COMMENT '是否顯示：1=顯示 0=隱藏',
  `created_at` datetime NOT NULL DEFAULT current_timestamp() COMMENT '建立時間',
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() COMMENT '最後更新時間',
  PRIMARY KEY (`id`),
  KEY `fk_bulletin_created_staff` (`created_by`),
  KEY `fk_bulletin_updated_staff` (`updated_by`),
  CONSTRAINT `fk_bulletin_created_staff` FOREIGN KEY (`created_by`) REFERENCES `staff` (`eid`),
  CONSTRAINT `fk_bulletin_updated_staff` FOREIGN KEY (`updated_by`) REFERENCES `staff` (`eid`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci COMMENT='留言板資料表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bulletin_board`
--

LOCK TABLES `bulletin_board` WRITE;
/*!40000 ALTER TABLE `bulletin_board` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `bulletin_board` VALUES
(1,'這是一個留言板',1,000001,NULL,1,'2026-05-29 15:19:01','2026-05-29 15:19:01'),
(3,'測試資料',2,000003,1,0,'2026-05-29 15:20:14','2026-05-29 15:36:25');
/*!40000 ALTER TABLE `bulletin_board` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `business_hours`
--

DROP TABLE IF EXISTS `business_hours`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `business_hours` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `weekday` tinyint(3) unsigned NOT NULL COMMENT '1=Monday ~ 7=Sunday',
  `weekday_name` varchar(10) NOT NULL COMMENT '星期名稱',
  `is_active` tinyint(1) NOT NULL DEFAULT 1 COMMENT '1=營業 0=公休',
  `open_time` time DEFAULT NULL COMMENT '開始營業時間',
  `close_time` time DEFAULT NULL COMMENT '結束營業時間',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_weekday` (`weekday`),
  CONSTRAINT `chk_weekday` CHECK (`weekday` between 1 and 7)
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `business_hours`
--

LOCK TABLES `business_hours` WRITE;
/*!40000 ALTER TABLE `business_hours` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `business_hours` VALUES
(1,1,'星期一',1,'10:00:00','22:00:00','2026-05-25 14:56:23','2026-05-25 15:25:33'),
(2,2,'星期二',1,'13:10:00','18:10:00','2026-05-25 14:56:23','2026-05-25 15:25:33'),
(3,3,'星期三',1,'10:00:00','22:00:00','2026-05-25 14:56:23','2026-05-25 15:25:33'),
(4,4,'星期四',1,'10:00:00','22:00:00','2026-05-25 14:56:23','2026-05-25 15:25:33'),
(5,5,'星期五',1,'10:00:00','22:00:00','2026-05-25 14:56:23','2026-05-25 15:25:33'),
(6,6,'星期六',1,'09:00:00','23:00:00','2026-05-25 14:56:23','2026-05-25 15:25:33'),
(7,7,'星期日',1,'09:00:00','18:00:00','2026-05-25 14:56:23','2026-05-25 15:25:33');
/*!40000 ALTER TABLE `business_hours` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `member_passes`
--

DROP TABLE IF EXISTS `member_passes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `member_passes` (
  `pass_id` bigint(20) NOT NULL AUTO_INCREMENT,
  `member_id` bigint(20) NOT NULL,
  `pass_type` varchar(50) NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`pass_id`),
  KEY `member_id` (`member_id`),
  CONSTRAINT `1` FOREIGN KEY (`member_id`) REFERENCES `members` (`member_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `member_passes`
--

LOCK TABLES `member_passes` WRITE;
/*!40000 ALTER TABLE `member_passes` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `member_passes` VALUES
(1,1,'月票','2026-05-01','2026-05-31',1,'2026-05-14 21:57:02'),
(3,3,'季票','2026-05-01','2026-05-31',1,'2026-05-29 12:11:39');
/*!40000 ALTER TABLE `member_passes` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `member_visits`
--

DROP TABLE IF EXISTS `member_visits`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `member_visits` (
  `visit_id` bigint(20) NOT NULL AUTO_INCREMENT,
  `member_id` bigint(20) NOT NULL,
  `checkin_time` datetime NOT NULL,
  `checkout_time` datetime DEFAULT NULL,
  `visit_type` varchar(50) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`visit_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `member_visits`
--

LOCK TABLES `member_visits` WRITE;
/*!40000 ALTER TABLE `member_visits` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `member_visits` VALUES
(1,1,'2026-05-14 21:57:37',NULL,'TK0005','2026-05-14 21:57:37'),
(2,1,'2026-05-26 12:14:13',NULL,'TK0001','2026-05-26 12:14:13');
/*!40000 ALTER TABLE `member_visits` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `members`
--

DROP TABLE IF EXISTS `members`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `members` (
  `member_id` bigint(20) NOT NULL AUTO_INCREMENT,
  `member_code` varchar(30) NOT NULL,
  `name` varchar(100) NOT NULL,
  `nationality` varchar(50) NOT NULL COMMENT '國籍',
  `idcard` varchar(20) NOT NULL,
  `phone` varchar(20) NOT NULL,
  `birthday` date NOT NULL,
  `gender` tinyint(4) NOT NULL,
  `contact_address` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `emergency_name` varchar(100) NOT NULL,
  `emergency_phone` varchar(20) NOT NULL,
  `emergency_address` varchar(255) NOT NULL COMMENT '緊急聯絡人地址',
  `emergency_relation` varchar(50) NOT NULL,
  `line_user_id` varchar(100) NOT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `note` text DEFAULT NULL,
  `signature_data` longtext DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`member_id`),
  UNIQUE KEY `uk_member_code` (`member_code`),
  UNIQUE KEY `uk_phone` (`phone`),
  UNIQUE KEY `idcard` (`idcard`),
  UNIQUE KEY `uk_line_user_id` (`line_user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `members`
--

LOCK TABLES `members` WRITE;
/*!40000 ALTER TABLE `members` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `members` VALUES
(1,'M000001','王小明','TW','D111111111','0912345678','1995-08-12',1,'桃園市中壢區XX路100號','ming@example.com','王大明','0988777666','台南市安南區xxx','父親','U4af4980629xxxxxxx',1,'第一次攀岩，怕高',NULL,'2026-05-14 21:56:45','2026-05-21 16:29:01'),
(3,'W000001','王小美','TW','D211111111','0923456789','1995-08-12',2,'桃園市中壢區XX路100號','mei@example.com','王大美','0966677788','台南市安南區xxx','母親','U4hf64897654xxxxxxx',1,'好玩',NULL,'2026-05-15 15:09:59','2026-05-21 16:29:07'),
(5,'M000002','asd','asd','D123456789','0911111111','2026-05-12',1,'wesfg','123ergdr@gmail.com','24134wewer','0911111111','dfgdfg','sdfsdf','sdfsdf',1,'',NULL,'2026-05-21 16:44:48','2026-05-21 16:44:48');
/*!40000 ALTER TABLE `members` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `product`
--

DROP TABLE IF EXISTS `product`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `product` (
  `product_id` int(11) NOT NULL AUTO_INCREMENT COMMENT '商品ID',
  `category_id` int(11) NOT NULL,
  `product_code` varchar(50) NOT NULL COMMENT '商品代碼',
  `product_name` varchar(100) NOT NULL COMMENT '商品名稱',
  `product_price` decimal(10,2) NOT NULL DEFAULT 0.00 COMMENT '商品價格',
  `stock_qty` int(11) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1 COMMENT '是否啟用',
  `note` varchar(255) DEFAULT NULL COMMENT '備註',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp() COMMENT '建立時間',
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() COMMENT '更新時間',
  PRIMARY KEY (`product_id`),
  UNIQUE KEY `product_code` (`product_code`),
  KEY `fk_product_category` (`category_id`),
  CONSTRAINT `fk_product_category` FOREIGN KEY (`category_id`) REFERENCES `product_category` (`category_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci COMMENT='商品價格表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product`
--

LOCK TABLES `product` WRITE;
/*!40000 ALTER TABLE `product` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `product` VALUES
(1,1,'PROD001','白貼',0.00,0,1,NULL,'2026-05-25 03:48:54','2026-06-01 02:57:41');
/*!40000 ALTER TABLE `product` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `product_category`
--

DROP TABLE IF EXISTS `product_category`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_category` (
  `category_id` int(11) NOT NULL AUTO_INCREMENT COMMENT '商品分類ID',
  `category_code` varchar(50) NOT NULL COMMENT '商品分類代碼',
  `category_name` varchar(100) NOT NULL COMMENT '商品分類名稱',
  PRIMARY KEY (`category_id`),
  UNIQUE KEY `category_code` (`category_code`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product_category`
--

LOCK TABLES `product_category` WRITE;
/*!40000 ALTER TABLE `product_category` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `product_category` VALUES
(1,'CATE0001','攀岩商品'),
(2,'CATE0002','長期票券'),
(3,'CATE0003','飲品');
/*!40000 ALTER TABLE `product_category` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `rental_equipment`
--

DROP TABLE IF EXISTS `rental_equipment`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `rental_equipment` (
  `rental_id` int(11) NOT NULL AUTO_INCREMENT COMMENT '租借商品ID',
  `rental_code` varchar(50) NOT NULL COMMENT '租借商品代碼',
  `rental_name` varchar(100) NOT NULL COMMENT '租借商品名稱',
  `rental_price` decimal(10,2) NOT NULL DEFAULT 0.00 COMMENT '租借價格',
  `is_active` tinyint(1) NOT NULL DEFAULT 1 COMMENT '是否啟用',
  `note` varchar(255) DEFAULT NULL COMMENT '備註',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp() COMMENT '建立時間',
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() COMMENT '更新時間',
  PRIMARY KEY (`rental_id`),
  UNIQUE KEY `rental_code` (`rental_code`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci COMMENT='裝備租借價格表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `rental_equipment`
--

LOCK TABLES `rental_equipment` WRITE;
/*!40000 ALTER TABLE `rental_equipment` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `rental_equipment` VALUES
(1,'REN0001','岩鞋',20.00,1,NULL,'2026-05-21 10:57:27','2026-05-25 03:52:48'),
(2,'REN0002','繩索',0.00,1,NULL,'2026-05-21 10:57:27','2026-05-25 03:52:49'),
(3,'REN0003','吊帶',0.00,0,NULL,'2026-05-21 10:57:27','2026-05-22 10:02:04'),
(4,'REN0004','粉塊',0.00,0,NULL,'2026-05-21 10:57:27','2026-05-22 10:02:02'),
(5,'REN0005','粉袋',0.00,0,NULL,'2026-05-21 10:57:27','2026-05-22 10:02:02'),
(6,'REN0006','岩盔',50.00,0,'','2026-05-22 03:03:22','2026-05-22 10:02:03');
/*!40000 ALTER TABLE `rental_equipment` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `role_def`
--

DROP TABLE IF EXISTS `role_def`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `role_def` (
  `role_id` tinyint(4) NOT NULL,
  `role_name` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`role_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `role_def`
--

LOCK TABLES `role_def` WRITE;
/*!40000 ALTER TABLE `role_def` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `role_def` VALUES
(1,'staff'),
(2,'admin'),
(3,'owner');
/*!40000 ALTER TABLE `role_def` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `staff`
--

DROP TABLE IF EXISTS `staff`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `staff` (
  `eid` int(6) unsigned zerofill NOT NULL AUTO_INCREMENT COMMENT '員工流水號',
  `name` varchar(50) NOT NULL COMMENT '姓名',
  `alias` varchar(50) NOT NULL COMMENT '暱稱',
  `nationality` varchar(50) NOT NULL COMMENT '國籍',
  `idcard` varchar(10) NOT NULL COMMENT '身分證字號',
  `gender` tinyint(4) NOT NULL COMMENT '性別 1男 2女',
  `birthday` date NOT NULL COMMENT '生日',
  `phone` char(10) NOT NULL COMMENT '手機號碼',
  `household_address` varchar(255) NOT NULL COMMENT '戶籍地址',
  `contact_address` varchar(255) NOT NULL COMMENT '通訊地址',
  `email` varchar(255) NOT NULL COMMENT '電子郵件',
  `emergency_name` varchar(100) NOT NULL COMMENT '緊急聯絡人姓名',
  `emergency_phone` varchar(20) NOT NULL COMMENT '緊急聯絡人手機',
  `emergency_telphone` varchar(20) NOT NULL COMMENT '緊急聯絡人電話',
  `emergency_address` varchar(255) NOT NULL COMMENT '緊急聯絡人地址',
  `emergency_relation` varchar(20) NOT NULL COMMENT '緊急聯絡人關係',
  `employee_id` varchar(20) NOT NULL COMMENT '公司員工編號',
  `employee_status` tinyint(3) NOT NULL DEFAULT 1 COMMENT '1在職 2離職 3留職停薪',
  `employee_title` varchar(20) NOT NULL COMMENT '職稱',
  `is_active` tinyint(1) DEFAULT 1 COMMENT '帳號是否啟用',
  `password` varchar(255) NOT NULL COMMENT '登入密碼',
  `note` text DEFAULT NULL COMMENT '備註',
  `created_at` datetime DEFAULT current_timestamp() COMMENT '建立時間',
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp() COMMENT '更新時間',
  PRIMARY KEY (`eid`),
  UNIQUE KEY `uk_userid` (`idcard`),
  UNIQUE KEY `uk_employee_id` (`employee_id`),
  KEY `idx_name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `staff`
--

LOCK TABLES `staff` WRITE;
/*!40000 ALTER TABLE `staff` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `staff` VALUES
(000001,'方1','fang1','TW','D123456789',1,'2000-01-01','0911111111','台南市安南區xxx','台南市安南區xxx','andy@example.com','媽媽','0911222333','06-2223333','台南市安南區xxx','母子','S10001',1,'管理人員',1,'S10001','補齊資料','2026-05-21 12:08:52','2026-05-22 16:58:13'),
(000002,'方2','fang2','TW','D111111234',1,'2000-01-01','0912345789','台南市安南區xxx','台南市安南區xxx','andy@example.com','媽媽','0911222333','06-2223333','台南市安南區xxx','母子','O10002',1,'行政人員',1,'O10002','補齊資料','2026-05-21 12:08:52','2026-05-22 16:58:13'),
(000003,'方3','fang3','TW','D111234567',1,'2000-02-01','0912345678','台南市安南區xxx','台南市安南區xxx','abdasdf@gamil.com','andy2-1','06-2223334','0913334567','台南市安南區xxx','朋友','L10003',1,'定線員',1,'L10003','哈哈哈','2026-05-21 14:45:51','2026-05-22 16:58:15');
/*!40000 ALTER TABLE `staff` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `staff_schedule`
--

DROP TABLE IF EXISTS `staff_schedule`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `staff_schedule` (
  `schedule_id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '班表ID',
  `staff_id` int(6) unsigned NOT NULL COMMENT '員工ID',
  `work_date` date NOT NULL COMMENT '上班日期',
  `start_time` time NOT NULL COMMENT '上班時間',
  `end_time` time NOT NULL COMMENT '下班時間',
  `schedule_type` tinyint(4) NOT NULL DEFAULT 1 COMMENT '班別',
  `is_active` tinyint(1) NOT NULL DEFAULT 1 COMMENT '是否啟用',
  `note` varchar(255) DEFAULT NULL COMMENT '備註',
  `created_by` bigint(20) DEFAULT NULL COMMENT '建立人員',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`schedule_id`),
  KEY `idx_work_date` (`work_date`),
  KEY `idx_staff_date` (`staff_id`,`work_date`),
  CONSTRAINT `fk_schedule_staff` FOREIGN KEY (`staff_id`) REFERENCES `staff` (`eid`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `staff_schedule`
--

LOCK TABLES `staff_schedule` WRITE;
/*!40000 ALTER TABLE `staff_schedule` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `staff_schedule` VALUES
(1,1,'2026-05-30','09:00:00','18:00:00',1,1,NULL,NULL,'2026-05-27 10:11:02','2026-05-27 10:11:02'),
(2,1,'2026-05-05','14:00:00','18:00:00',1,1,NULL,1,'2026-05-28 11:39:28','2026-05-28 11:39:28'),
(3,2,'2026-05-04','09:00:00','14:00:00',1,1,NULL,1,'2026-05-28 11:40:07','2026-05-28 11:40:07'),
(4,3,'2026-05-04','09:00:00','14:00:00',1,1,NULL,1,'2026-05-28 11:46:39','2026-05-28 11:46:39'),
(5,1,'2026-05-07','09:00:00','18:00:00',1,1,NULL,1,'2026-05-28 15:09:23','2026-05-28 15:09:23'),
(6,2,'2026-05-07','09:00:00','18:00:00',1,1,NULL,1,'2026-05-28 15:09:33','2026-05-28 15:09:33'),
(7,1,'2026-05-12','09:00:00','18:00:00',1,1,NULL,1,'2026-05-28 15:14:43','2026-05-28 15:14:43'),
(8,2,'2026-05-12','09:00:00','12:00:00',1,1,NULL,1,'2026-05-28 15:14:54','2026-05-28 15:14:54'),
(9,3,'2026-05-12','12:00:00','18:00:00',1,1,NULL,1,'2026-05-28 15:15:02','2026-05-28 15:15:02');
/*!40000 ALTER TABLE `staff_schedule` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `ticket`
--

DROP TABLE IF EXISTS `ticket`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ticket` (
  `ticket_id` int(11) NOT NULL AUTO_INCREMENT COMMENT '票種ID',
  `ticket_code` varchar(50) NOT NULL COMMENT '票種代碼',
  `ticket_name` varchar(100) NOT NULL COMMENT '票種名稱',
  `ticket_price` decimal(10,2) NOT NULL DEFAULT 0.00 COMMENT '票價',
  `is_active` tinyint(1) NOT NULL DEFAULT 1 COMMENT '是否啟用',
  `note` varchar(255) DEFAULT NULL COMMENT '備註',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp() COMMENT '建立時間',
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() COMMENT '更新時間',
  PRIMARY KEY (`ticket_id`),
  UNIQUE KEY `ticket_code` (`ticket_code`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci COMMENT='票種與票價表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ticket`
--

LOCK TABLES `ticket` WRITE;
/*!40000 ALTER TABLE `ticket` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `ticket` VALUES
(1,'TK0001','平日單次',300.00,1,NULL,'2026-05-21 10:06:13','2026-05-25 03:52:46'),
(2,'TK0002','平日早鳥',0.00,1,NULL,'2026-05-21 10:06:13','2026-05-25 03:52:47'),
(3,'TK0003','假日單次',0.00,1,NULL,'2026-05-21 10:06:13','2026-05-27 07:30:19'),
(4,'TK0004','星光票',0.00,1,NULL,'2026-05-21 10:06:13','2026-05-27 07:30:20'),
(5,'TK0005','長期票',0.00,1,NULL,'2026-05-21 10:06:13','2026-05-27 07:30:21'),
(6,'TK0006','學生票',0.00,1,NULL,'2026-05-21 10:06:13','2026-05-27 07:30:21'),
(7,'TK0007','兒童票',0.00,1,NULL,'2026-05-21 10:06:13','2026-05-27 07:30:22'),
(8,'TK0008','體驗票',0.00,1,NULL,'2026-05-21 10:06:13','2026-05-27 07:30:23'),
(9,'TK0009','公司票',200.00,1,'','2026-05-22 02:59:39','2026-05-27 07:30:23');
/*!40000 ALTER TABLE `ticket` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `visit_rental_equipment`
--

DROP TABLE IF EXISTS `visit_rental_equipment`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `visit_rental_equipment` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `visit_id` bigint(20) NOT NULL,
  `rental_id` int(11) NOT NULL,
  `rental_price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_visit` (`visit_id`),
  KEY `fk_equipment` (`rental_id`),
  CONSTRAINT `fk_equipment` FOREIGN KEY (`rental_id`) REFERENCES `rental_equipment` (`rental_id`),
  CONSTRAINT `fk_visit` FOREIGN KEY (`visit_id`) REFERENCES `member_visits` (`visit_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `visit_rental_equipment`
--

LOCK TABLES `visit_rental_equipment` WRITE;
/*!40000 ALTER TABLE `visit_rental_equipment` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `visit_rental_equipment` VALUES
(1,1,1,50.00,'2026-05-22 13:58:14'),
(2,2,1,20.00,'2026-05-26 12:14:13');
/*!40000 ALTER TABLE `visit_rental_equipment` ENABLE KEYS */;
UNLOCK TABLES;
commit;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*M!100616 SET NOTE_VERBOSITY=@OLD_NOTE_VERBOSITY */;

-- Dump completed on 2026-06-01 11:21:07
