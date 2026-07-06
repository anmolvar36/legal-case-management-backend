-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Jul 02, 2026 at 03:50 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `hcm_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `ailog`
--

CREATE TABLE `ailog` (
  `id` varchar(191) NOT NULL,
  `label` varchar(191) NOT NULL,
  `type` varchar(191) NOT NULL,
  `timestamp` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `aimodule`
--

CREATE TABLE `aimodule` (
  `id` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `desc` text NOT NULL,
  `status` varchar(191) NOT NULL DEFAULT 'Active',
  `confidence` int(11) NOT NULL DEFAULT 90,
  `settings` text NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `announcement`
--

CREATE TABLE `announcement` (
  `id` varchar(191) NOT NULL,
  `title` varchar(191) NOT NULL,
  `date` varchar(191) NOT NULL,
  `category` varchar(191) NOT NULL,
  `priority` varchar(191) NOT NULL,
  `content` text NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `announcement`
--

INSERT INTO `announcement` (`id`, `title`, `date`, `category`, `priority`, `content`, `createdAt`, `updatedAt`) VALUES
('157c2949-64af-456a-9288-a2fff67d9eb6', 'WFH Policy Update', 'Oct 15', 'HR', 'low', 'Starting next month, our flexible work policy will allow for up to 3 days of remote work per week. Please coordinate with your manager for scheduling.', '2026-06-30 05:30:33.525', '2026-06-30 05:30:33.525'),
('403b433a-4f86-4d36-a1c5-2e5246ccfc31', 'New Health Insurance Policy', 'Oct 22', 'Updates', 'medium', 'Our health insurance provider has been updated to Blue Cross Premium. Please review the new policy documents in the Benefits section for details on coverage and benefits.', '2026-06-30 05:30:33.525', '2026-06-30 05:30:33.525'),
('64322f22-ffa7-47da-8f64-947d9aca79d0', 'Annual Team Building Retreat', 'Oct 28', 'Events', 'high', 'We are excited to announce our annual team building retreat! Join us for a weekend of fun, collaboration, and networking at the Mountain Resort. Transportation and accommodation will be provided.', '2026-06-30 05:30:33.525', '2026-06-30 05:30:33.525');

-- --------------------------------------------------------

--
-- Table structure for table `attendancelog`
--

CREATE TABLE `attendancelog` (
  `id` varchar(191) NOT NULL,
  `userId` varchar(191) NOT NULL,
  `date` date NOT NULL,
  `clockIn` datetime(3) NOT NULL,
  `clockOut` datetime(3) DEFAULT NULL,
  `totalWorkedMin` int(11) NOT NULL DEFAULT 0,
  `status` varchar(191) NOT NULL DEFAULT 'Present',
  `mode` varchar(191) NOT NULL DEFAULT 'Office',
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `attendancelog`
--

INSERT INTO `attendancelog` (`id`, `userId`, `date`, `clockIn`, `clockOut`, `totalWorkedMin`, `status`, `mode`, `createdAt`) VALUES
('14223cde-5597-49e9-9b2e-91b3ed9610f6', '78c3ecee-e562-430b-b157-80afeacf198b', '2026-06-30', '2026-07-01 08:52:29.834', '2026-07-01 08:52:32.727', 0, 'Present', 'Office', '2026-07-01 08:52:29.837'),
('56e189bc-2dbd-453a-a11b-c606a421d58f', '78c3ecee-e562-430b-b157-80afeacf198b', '2026-06-29', '2026-06-30 05:48:53.658', '2026-06-30 06:11:56.798', 23, 'Present', 'Office', '2026-06-30 05:48:53.659'),
('b3d66abe-b74b-4e8a-b8fd-80b508bf2f53', '78c3ecee-e562-430b-b157-80afeacf198b', '2026-06-30', '2026-06-30 01:30:33.472', '2026-06-30 05:30:33.472', 0, 'Present', 'Office', '2026-06-30 05:30:33.474'),
('e3c8333e-935d-404c-bbc4-e8f17f27b9ae', '19a1bef8-e5ab-4e83-ac04-d96ada4ed619', '2026-06-29', '2026-06-29 04:30:00.000', '2026-06-29 01:30:00.000', 0, 'Present', 'Office', '2026-06-30 12:00:39.384'),
('f6ab250f-a312-43a3-bb3c-4fdd8e7cc0be', '19a1bef8-e5ab-4e83-ac04-d96ada4ed619', '2026-07-02', '2026-07-02 07:28:00.000', '2026-07-02 12:34:00.000', 306, 'Late', 'Office', '2026-07-02 07:28:38.696');

-- --------------------------------------------------------

--
-- Table structure for table `auditlog`
--

CREATE TABLE `auditlog` (
  `id` varchar(191) NOT NULL,
  `userId` varchar(191) DEFAULT NULL,
  `action` varchar(191) NOT NULL,
  `details` text NOT NULL,
  `ipAddress` varchar(191) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `benefitclaim`
--

CREATE TABLE `benefitclaim` (
  `id` varchar(191) NOT NULL,
  `employeeId` varchar(191) NOT NULL,
  `title` varchar(191) NOT NULL,
  `provider` varchar(191) NOT NULL,
  `amount` double NOT NULL,
  `status` varchar(191) NOT NULL DEFAULT 'Pending',
  `claimedAt` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `benefitclaim`
--

INSERT INTO `benefitclaim` (`id`, `employeeId`, `title`, `provider`, `amount`, `status`, `claimedAt`) VALUES
('6b8ddaa3-d859-41d7-a28b-6343dae3130c', 'c7c1b600-bb28-4dc8-bc03-dec800ae87b4', 'Medical Expense', 'Mediacl', 60, 'Pending', '2026-06-19 00:00:00.000');

-- --------------------------------------------------------

--
-- Table structure for table `benefitplan`
--

CREATE TABLE `benefitplan` (
  `id` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `category` varchar(191) NOT NULL,
  `provider` varchar(191) NOT NULL,
  `contribution` varchar(191) NOT NULL,
  `eligibility` varchar(191) NOT NULL,
  `status` varchar(191) NOT NULL DEFAULT 'Active',
  `empContribution` varchar(191) NOT NULL DEFAULT '0.00',
  `description` text DEFAULT NULL,
  `autoEnroll` tinyint(1) NOT NULL DEFAULT 0,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `benefitplan`
--

INSERT INTO `benefitplan` (`id`, `name`, `category`, `provider`, `contribution`, `eligibility`, `status`, `empContribution`, `description`, `autoEnroll`, `createdAt`, `updatedAt`) VALUES
('fd423892-4bae-4f13-bdb2-11db8b88460f', 'Health', 'Health Insurance', 'metlife', '50', 'Full-time Only', 'Active', 'Individual', '', 0, '2026-07-01 13:38:26.292', '2026-07-02 04:52:01.772');

-- --------------------------------------------------------

--
-- Table structure for table `billingplan`
--

CREATE TABLE `billingplan` (
  `id` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `price` int(11) NOT NULL,
  `cycle` varchar(191) NOT NULL,
  `users` int(11) NOT NULL,
  `addons` varchar(191) NOT NULL DEFAULT '[]',
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `billingplan`
--

INSERT INTO `billingplan` (`id`, `name`, `price`, `cycle`, `users`, `addons`, `createdAt`, `updatedAt`) VALUES
('24cafc1b-e412-4f43-a245-c7ccc191c85a', 'Growth Plan', 299, 'Monthly', 50, '[\"Premium Support\"]', '2026-06-29 07:39:57.498', '2026-06-29 07:45:06.053');

-- --------------------------------------------------------

--
-- Table structure for table `candidateprofile`
--

CREATE TABLE `candidateprofile` (
  `id` varchar(191) NOT NULL,
  `userId` varchar(191) NOT NULL,
  `phone` varchar(191) DEFAULT NULL,
  `dob` datetime(3) DEFAULT NULL,
  `resumeUrl` varchar(191) DEFAULT NULL,
  `expectedSalary` varchar(191) DEFAULT NULL,
  `experience` varchar(191) DEFAULT NULL,
  `fullName` varchar(191) DEFAULT NULL,
  `linkedin` varchar(191) DEFAULT NULL,
  `portfolio` varchar(191) DEFAULT NULL,
  `skills` varchar(191) DEFAULT NULL,
  `location` varchar(191) DEFAULT NULL,
  `avatarUrl` varchar(191) DEFAULT NULL,
  `educationProofUrl` varchar(191) DEFAULT NULL,
  `identityProofUrl` varchar(191) DEFAULT NULL,
  `resumeData` longtext DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `candidateprofile`
--

INSERT INTO `candidateprofile` (`id`, `userId`, `phone`, `dob`, `resumeUrl`, `expectedSalary`, `experience`, `fullName`, `linkedin`, `portfolio`, `skills`, `location`, `avatarUrl`, `educationProofUrl`, `identityProofUrl`, `resumeData`) VALUES
('44cb3d19-8f38-4850-ae98-a282ad372e35', 'cf4e8c46-1ea3-4195-8bc9-1c3e2af7ba22', '+1 555-0105', NULL, 'https://meet.hcm.ai/resumes/alex_rivera.pdf', NULL, NULL, 'candidate', NULL, NULL, 'UI Rendering, UX Research, Figma, React.js, System Design', NULL, NULL, NULL, NULL, 'null'),
('df756f10-c2f2-4085-a705-820aa340ce1c', '49be6b1b-c334-4c34-b967-9a7367f263b4', NULL, NULL, NULL, NULL, '1', 'Test', NULL, NULL, 'Match:90', NULL, NULL, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `customrole`
--

CREATE TABLE `customrole` (
  `id` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `description` varchar(191) DEFAULT NULL,
  `isCustom` tinyint(1) NOT NULL DEFAULT 1,
  `permissions` text NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `customrole`
--

INSERT INTO `customrole` (`id`, `name`, `description`, `isCustom`, `permissions`, `createdAt`, `updatedAt`) VALUES
('40022bad-5929-4497-9eba-932c0dc7804d', 'HR Manager', 'People management access', 0, '{\"dashboard\":[\"view\",\"create\",\"edit\",\"delete\",\"approve\",\"manage\"],\"job_posts\":[\"view\",\"create\",\"edit\",\"delete\",\"approve\",\"manage\"],\"candidates\":[\"view\",\"create\",\"edit\",\"delete\",\"approve\",\"manage\"],\"interviews\":[\"view\",\"create\",\"edit\",\"delete\",\"approve\",\"manage\"],\"hiring_pipeline\":[\"view\",\"create\",\"edit\",\"delete\",\"approve\",\"manage\"],\"offer_management\":[\"view\",\"create\",\"edit\",\"delete\",\"approve\",\"manage\"],\"onboarding\":[\"view\",\"create\",\"edit\",\"delete\",\"approve\",\"manage\"],\"reports\":[\"view\",\"create\",\"edit\",\"delete\",\"approve\",\"manage\"],\"messages\":[\"view\",\"create\",\"edit\",\"delete\",\"approve\",\"manage\"]}', '2026-07-01 12:22:58.219', '2026-07-01 12:25:51.512'),
('51e361f5-d84a-494f-896e-ff3175450ec2', 'Super Admin', 'Ultimate system access', 0, '{\"dashboard\":[\"view\",\"create\",\"edit\",\"delete\",\"approve\",\"manage\"],\"org_setup\":[\"view\",\"create\",\"edit\",\"delete\",\"approve\",\"manage\"],\"departments\":[\"view\",\"create\",\"edit\",\"delete\",\"approve\",\"manage\"],\"users\":[\"view\",\"create\",\"edit\",\"delete\",\"approve\",\"manage\"],\"roles_permissions\":[\"view\",\"create\",\"edit\",\"delete\",\"approve\",\"manage\"],\"payroll_center\":[\"view\",\"create\",\"edit\",\"delete\",\"approve\",\"manage\"],\"holidays\":[\"view\",\"create\",\"edit\",\"delete\",\"approve\",\"manage\"],\"benefits_config\":[\"view\",\"create\",\"edit\",\"delete\",\"approve\",\"manage\"],\"ai_center\":[\"view\",\"create\",\"edit\",\"delete\",\"approve\",\"manage\"],\"compliance\":[\"view\",\"create\",\"edit\",\"delete\",\"approve\",\"manage\"],\"integrations\":[\"view\",\"create\",\"edit\",\"delete\",\"approve\",\"manage\"],\"billing\":[\"view\",\"create\",\"edit\",\"delete\",\"approve\",\"manage\"],\"audit_logs\":[\"view\",\"create\",\"edit\",\"delete\",\"approve\",\"manage\"],\"reports\":[\"view\",\"create\",\"edit\",\"delete\",\"approve\",\"manage\"],\"settings\":[\"view\",\"create\",\"edit\",\"delete\",\"approve\",\"manage\"]}', '2026-07-01 12:22:58.199', '2026-07-01 12:22:58.199'),
('723fc5fb-69db-4da8-9716-1bf95c0fc598', 'Admin', 'Full system access', 0, '{\"dashboard\":[\"view\",\"create\",\"edit\",\"delete\",\"approve\",\"manage\"],\"org_setup\":[\"view\",\"create\",\"edit\",\"delete\",\"approve\",\"manage\"],\"departments\":[\"view\",\"create\",\"edit\",\"delete\",\"approve\",\"manage\"],\"users\":[\"view\",\"create\",\"edit\",\"delete\",\"approve\",\"manage\"],\"roles_permissions\":[\"view\",\"create\",\"edit\",\"delete\",\"approve\",\"manage\"],\"payroll_center\":[\"view\",\"create\",\"edit\",\"delete\",\"approve\",\"manage\"],\"holidays\":[\"view\",\"create\",\"edit\",\"delete\",\"approve\",\"manage\"],\"benefits_config\":[\"view\",\"create\",\"edit\",\"delete\",\"approve\",\"manage\"],\"ai_center\":[\"view\",\"create\",\"edit\",\"delete\",\"approve\",\"manage\"],\"compliance\":[\"view\",\"create\",\"edit\",\"delete\",\"approve\",\"manage\"],\"integrations\":[\"view\",\"create\",\"edit\",\"delete\",\"approve\",\"manage\"],\"billing\":[\"view\",\"create\",\"edit\",\"delete\",\"approve\",\"manage\"],\"audit_logs\":[\"view\",\"create\",\"edit\",\"delete\",\"approve\",\"manage\"],\"reports\":[\"view\",\"create\",\"edit\",\"delete\",\"approve\",\"manage\"],\"settings\":[\"view\",\"create\",\"edit\",\"delete\",\"approve\",\"manage\"]}', '2026-07-01 12:22:58.210', '2026-07-01 12:22:58.210'),
('7684e39b-e6da-4026-85c2-b35d3396e35e', 'Manager', 'Team management access', 0, '{\"dashboard\":[\"view\",\"create\",\"edit\",\"delete\",\"approve\",\"manage\"],\"team_members\":[\"view\",\"create\",\"edit\",\"delete\",\"approve\",\"manage\"],\"attendance_review\":[\"view\",\"create\",\"edit\",\"delete\",\"approve\",\"manage\"],\"leave_approval\":[\"view\",\"create\",\"edit\",\"delete\",\"approve\",\"manage\"],\"kpi_tracking\":[\"view\",\"create\",\"edit\",\"delete\",\"approve\",\"manage\"],\"tasks\":[\"view\",\"create\",\"edit\",\"delete\",\"approve\",\"manage\"],\"reviews\":[\"view\",\"create\",\"edit\",\"delete\",\"approve\",\"manage\"],\"reports\":[\"view\",\"create\",\"edit\",\"delete\",\"approve\",\"manage\"]}', '2026-07-01 12:22:58.225', '2026-07-01 12:22:58.225'),
('c9a67fbb-b5ba-489a-afd7-8180742eae36', 'Employee', 'Standard user access', 0, '{\"dashboard\":[\"view\"],\"profile\":[\"view\",\"edit\"],\"attendance\":[\"view\",\"create\"],\"leave\":[\"view\",\"create\"],\"payroll\":[\"view\"],\"benefits\":[\"view\"],\"documents\":[\"view\",\"create\"],\"performance\":[\"view\"],\"help_desk\":[\"view\",\"create\"]}', '2026-07-01 12:22:58.229', '2026-07-01 12:22:58.229'),
('e7b41fab-8f34-44fb-b5b0-e5671cdf7887', 'Candidate', 'Limited portal access', 0, '{\"dashboard\":[\"view\"],\"browse_jobs\":[\"view\"],\"my_applications\":[\"view\",\"create\"],\"resume_builder\":[\"view\",\"create\",\"edit\"],\"ai_resume_score\":[\"view\",\"create\"],\"interview_schedule\":[\"view\"],\"notifications\":[\"view\"]}', '2026-07-01 12:22:58.233', '2026-07-01 12:22:58.233');

-- --------------------------------------------------------

--
-- Table structure for table `demobooking`
--

CREATE TABLE `demobooking` (
  `id` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `email` varchar(191) NOT NULL,
  `companySize` varchar(191) NOT NULL,
  `requirement` varchar(191) NOT NULL,
  `selectedDate` varchar(191) NOT NULL,
  `selectedSlot` varchar(191) NOT NULL,
  `status` varchar(191) NOT NULL DEFAULT 'Pending',
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  `companyName` varchar(191) DEFAULT NULL,
  `country` varchar(191) DEFAULT NULL,
  `industry` varchar(191) DEFAULT NULL,
  `message` varchar(191) DEFAULT NULL,
  `modules` varchar(191) DEFAULT NULL,
  `phone` varchar(191) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `demobooking`
--

INSERT INTO `demobooking` (`id`, `name`, `email`, `companySize`, `requirement`, `selectedDate`, `selectedSlot`, `status`, `createdAt`, `updatedAt`, `companyName`, `country`, `industry`, `message`, `modules`, `phone`) VALUES
('81782508-60ff-481f-a91f-cdf176ed9a39', 'Alex', 'alex@gmail.com', '11-50', 'AI Recruitment', 'Friday, Jul 3', '11:00 AM', 'Pending', '2026-07-02 11:03:33.724', '2026-07-02 11:03:33.724', NULL, NULL, NULL, NULL, NULL, NULL),
('d98740a4-cb25-4c9d-9f2c-93c824435a83', 'John', 'global@gmail.com', '50-250', 'Payroll HCM, Recruitment, Workflow Automation, Analytics, Performance Tracking', '2026-07-06', '11:30', 'Pending', '2026-07-02 11:15:03.128', '2026-07-02 11:15:03.128', 'global', 'United States', 'Technology', '', '[\"Payroll HCM\",\"Recruitment\",\"Workflow Automation\",\"Analytics\",\"Performance Tracking\"]', '5465855555');

-- --------------------------------------------------------

--
-- Table structure for table `department`
--

CREATE TABLE `department` (
  `id` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `organizationId` varchar(191) NOT NULL,
  `code` varchar(191) DEFAULT NULL,
  `head` varchar(191) DEFAULT NULL,
  `parent` varchar(191) DEFAULT 'Corporate',
  `description` text DEFAULT NULL,
  `color` varchar(191) DEFAULT '#4f46e5',
  `status` varchar(191) DEFAULT 'Active'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `department`
--

INSERT INTO `department` (`id`, `name`, `organizationId`, `code`, `head`, `parent`, `description`, `color`, `status`) VALUES
('ac188efd-8b18-40e7-9ce9-4498ec43a3df', 'Product & Design', 'a64605c8-3b47-4c57-9e5c-243d87af5090', NULL, NULL, 'Corporate', NULL, '#4f46e5', 'Active'),
('b9a8af9b-b14a-4330-aaee-4695b33d294e', 'It support', 'a64605c8-3b47-4c57-9e5c-243d87af5090', NULL, 'Alice Cooper', 'Corporate', NULL, '#4f46e5', 'Active'),
('d0001253-880c-4fc1-b8f9-9e9ebae1d442', 'Test Department', 'a64605c8-3b47-4c57-9e5c-243d87af5090', 'TEST', 'Test Head', 'Corporate', 'Test Description', '#4f46e5', 'Active'),
('f231b285-d408-4ff4-a3d2-9c108fd43d55', 'Human Resources', 'a64605c8-3b47-4c57-9e5c-243d87af5090', NULL, NULL, 'Corporate', NULL, '#4f46e5', 'Active'),
('f4ff9660-c142-45bc-86d9-ad29c3199cc6', 'Engineering', 'a64605c8-3b47-4c57-9e5c-243d87af5090', NULL, NULL, 'Corporate', NULL, '#4f46e5', 'Active');

-- --------------------------------------------------------

--
-- Table structure for table `document`
--

CREATE TABLE `document` (
  `id` varchar(191) NOT NULL,
  `userId` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `category` varchar(191) NOT NULL,
  `size` varchar(191) NOT NULL,
  `url` text NOT NULL,
  `date` varchar(191) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `employeeprofile`
--

CREATE TABLE `employeeprofile` (
  `id` varchar(191) NOT NULL,
  `userId` varchar(191) NOT NULL,
  `employeeId` varchar(191) NOT NULL,
  `fullName` varchar(191) NOT NULL,
  `phone` varchar(191) DEFAULT NULL,
  `dob` datetime(3) DEFAULT NULL,
  `gender` varchar(191) DEFAULT NULL,
  `bloodGroup` varchar(191) DEFAULT NULL,
  `address` varchar(191) DEFAULT NULL,
  `joiningDate` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `avatarUrl` text DEFAULT NULL,
  `emergencyName` varchar(191) DEFAULT NULL,
  `emergencyPhone` varchar(191) DEFAULT NULL,
  `emergencyRelation` varchar(191) DEFAULT NULL,
  `departmentId` varchar(191) DEFAULT NULL,
  `managerId` varchar(191) DEFAULT NULL,
  `employmentType` varchar(191) NOT NULL DEFAULT 'Full-time',
  `bio` text DEFAULT NULL,
  `dateFormat` varchar(191) DEFAULT 'MM/DD/YYYY',
  `emailNotif` tinyint(1) NOT NULL DEFAULT 1,
  `language` varchar(191) DEFAULT 'English (US)',
  `pushNotif` tinyint(1) NOT NULL DEFAULT 1,
  `timezone` varchar(191) DEFAULT 'UTC+00:00 (London)',
  `weeklySummary` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `employeeprofile`
--

INSERT INTO `employeeprofile` (`id`, `userId`, `employeeId`, `fullName`, `phone`, `dob`, `gender`, `bloodGroup`, `address`, `joiningDate`, `avatarUrl`, `emergencyName`, `emergencyPhone`, `emergencyRelation`, `departmentId`, `managerId`, `employmentType`, `bio`, `dateFormat`, `emailNotif`, `language`, `pushNotif`, `timezone`, `weeklySummary`) VALUES
('283b7929-5a3a-4dc7-8a36-ee9ac11c4e20', '49be6b1b-c334-4c34-b967-9a7367f263b4', 'EMP-30383', 'test1', NULL, NULL, NULL, NULL, NULL, '2026-07-01 12:35:26.522', NULL, NULL, NULL, NULL, NULL, NULL, 'Full-time', NULL, 'MM/DD/YYYY', 1, 'English (US)', 1, 'UTC+00:00 (London)', 1),
('2efdcbce-da64-44bf-8310-5ba3791ea48f', '19a1bef8-e5ab-4e83-ac04-d96ada4ed619', 'EMP-007', 'Test Emp', '4596658584', NULL, NULL, NULL, 'test address', '2026-06-30 00:00:00.000', NULL, NULL, NULL, NULL, 'f4ff9660-c142-45bc-86d9-ad29c3199cc6', '69acf23e-f74c-4734-9d27-b7a7fa60d06e', 'Full-time', NULL, 'MM/DD/YYYY', 1, 'English (US)', 1, 'UTC+00:00 (London)', 1),
('39269856-047f-46b8-8b88-fd254d355ec1', 'd36ab2a6-2fa2-4647-a9ca-ab14123727ae', 'EMP-002', 'Sarah Connor', '+1 555-0102', NULL, 'Female', NULL, '88 Cyberdyne Road, LA', '2026-06-30 05:30:33.410', '', '', '', '', 'f231b285-d408-4ff4-a3d2-9c108fd43d55', NULL, 'Full-time', NULL, 'MM/DD/YYYY', 1, 'English (US)', 1, 'UTC+00:00 (London)', 1),
('54ea914d-53f7-4937-a58a-1df6993dac1e', '829d786b-a18b-4219-a7b6-7e2bdf0b7f30', 'EMP-008', 'New Emp', '5856458555', NULL, NULL, NULL, 'New address', '2026-06-30 00:00:00.000', NULL, NULL, NULL, NULL, 'f4ff9660-c142-45bc-86d9-ad29c3199cc6', '69acf23e-f74c-4734-9d27-b7a7fa60d06e', 'Full-time', NULL, 'MM/DD/YYYY', 1, 'English (US)', 1, 'UTC+00:00 (London)', 1),
('69acf23e-f74c-4734-9d27-b7a7fa60d06e', '3195a749-733d-4ad2-bb74-0b3dcc411037', 'EMP-003', 'Alice Cooper', '+1 555-0103', NULL, 'Male', NULL, '456 Rock Ave, Phoenix', '2026-06-30 05:30:33.417', NULL, '', '', '', 'ac188efd-8b18-40e7-9ce9-4498ec43a3df', NULL, 'Full-time', NULL, 'MM/DD/YYYY', 1, 'English (US)', 1, 'UTC+00:00 (London)', 1),
('74fee463-e0e7-4099-ada4-6d71d4692bc1', '7d852c3a-2d68-48ff-98a1-7feaec3a5f0d', 'EMP-001', 'John Wick', '+1 555-0101', NULL, NULL, NULL, '742 Continental Lane, NY', '2026-06-30 05:30:33.400', 'https://i.pravatar.cc/150?u=john', NULL, NULL, NULL, NULL, NULL, 'Full-time', NULL, 'MM/DD/YYYY', 1, 'English (US)', 1, 'UTC+00:00 (London)', 1),
('c7c1b600-bb28-4dc8-bc03-dec800ae87b4', '78c3ecee-e562-430b-b157-80afeacf198b', 'EMP-004', 'Bob Marley', '+1 555-0104', NULL, 'Male', 'A+', '1 Love Lane, Kingston', '2026-06-30 05:30:33.431', NULL, 'jonny', '', 'father', 'f4ff9660-c142-45bc-86d9-ad29c3199cc6', '69acf23e-f74c-4734-9d27-b7a7fa60d06e', 'Full-time', NULL, 'MM/DD/YYYY', 1, 'English (US)', 1, 'UTC+00:00 (London)', 1),
('ecc6e97d-57b9-452d-9507-4f26d16bcfa8', '2d511606-dc75-408a-a3ae-4f61cd2ad27b', 'EMP-7691', 'superadmin', '', '1988-11-23 00:00:00.000', 'Male', NULL, '742 Evergreen Terrace', '2026-07-01 12:44:41.351', 'https://ui-avatars.com/api/?name=Super%20Admin&background=4f46e5&color=fff&bold=true', NULL, '9876543210', NULL, NULL, NULL, 'Full-time', 'Global HCM Suite Super Administrator. Managing multi-tenant environments, security infrastructure, global billing configurations, and system access controls.', 'MM/DD/YYYY', 1, 'English (US)', 1, 'UTC+05:30 (India)', 1);

-- --------------------------------------------------------

--
-- Table structure for table `employeeskill`
--

CREATE TABLE `employeeskill` (
  `id` varchar(191) NOT NULL,
  `employeeId` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `level` int(11) NOT NULL DEFAULT 0,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `employeeskill`
--

INSERT INTO `employeeskill` (`id`, `employeeId`, `name`, `level`, `createdAt`, `updatedAt`) VALUES
('067ab6f7-e6e5-4361-b204-4a8bfc549602', 'c7c1b600-bb28-4dc8-bc03-dec800ae87b4', 'TypeScript', 80, '2026-06-30 07:25:28.593', '2026-06-30 07:25:28.593'),
('09d9d3e3-573a-4fb3-bf22-3f21803c1ba5', 'ecc6e97d-57b9-452d-9507-4f26d16bcfa8', 'Node.js', 85, '2026-07-01 12:44:41.501', '2026-07-01 12:44:41.501'),
('1a982ef7-932c-4090-b211-b199a7ba5e9d', 'c7c1b600-bb28-4dc8-bc03-dec800ae87b4', 'Node', 9, '2026-06-30 07:35:23.293', '2026-06-30 07:35:23.293'),
('26030052-8f9c-4ba0-9155-fd664f5fd215', 'ecc6e97d-57b9-452d-9507-4f26d16bcfa8', 'React', 90, '2026-07-01 12:44:41.501', '2026-07-01 12:44:41.501'),
('45ba0278-4977-44a8-8550-ea8d79cf823d', 'ecc6e97d-57b9-452d-9507-4f26d16bcfa8', 'TypeScript', 80, '2026-07-01 12:44:41.501', '2026-07-01 12:44:41.501'),
('8ee84d02-509d-42a3-81f3-f417d42809c3', 'c7c1b600-bb28-4dc8-bc03-dec800ae87b4', 'React', 100, '2026-06-30 07:25:28.593', '2026-06-30 07:34:51.045');

-- --------------------------------------------------------

--
-- Table structure for table `globalsettings`
--

CREATE TABLE `globalsettings` (
  `id` varchar(191) NOT NULL DEFAULT 'global-settings',
  `defaultCurrency` varchar(191) NOT NULL DEFAULT 'USD',
  `defaultPhoneCountry` varchar(191) NOT NULL DEFAULT '+1',
  `updatedAt` datetime(3) NOT NULL,
  `apiRateLimit` int(11) NOT NULL DEFAULT 1200,
  `auditLogRetention` varchar(191) NOT NULL DEFAULT '90 Days',
  `basePricePerUser` double NOT NULL DEFAULT 8,
  `defaultTimezone` varchar(191) NOT NULL DEFAULT 'UTC+00:00 (London)',
  `failedLoginAttempts` int(11) NOT NULL DEFAULT 5,
  `freeTrialDays` int(11) NOT NULL DEFAULT 14,
  `globalMFA` tinyint(1) NOT NULL DEFAULT 1,
  `gracePeriodDays` int(11) NOT NULL DEFAULT 7,
  `invoiceInterval` varchar(191) NOT NULL DEFAULT 'Monthly',
  `ipWhitelisting` tinyint(1) NOT NULL DEFAULT 0,
  `masterCurrency` varchar(191) NOT NULL DEFAULT 'USD ($) - US Dollar',
  `matchingThreshold` int(11) NOT NULL DEFAULT 75,
  `maxOrgs` varchar(191) NOT NULL DEFAULT 'Unlimited',
  `platformMode` varchar(191) NOT NULL DEFAULT 'Production',
  `primaryModel` varchar(191) NOT NULL DEFAULT 'Google Gemini 1.5 Pro',
  `resumeScanAutoRank` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `globalsettings`
--

INSERT INTO `globalsettings` (`id`, `defaultCurrency`, `defaultPhoneCountry`, `updatedAt`, `apiRateLimit`, `auditLogRetention`, `basePricePerUser`, `defaultTimezone`, `failedLoginAttempts`, `freeTrialDays`, `globalMFA`, `gracePeriodDays`, `invoiceInterval`, `ipWhitelisting`, `masterCurrency`, `matchingThreshold`, `maxOrgs`, `platformMode`, `primaryModel`, `resumeScanAutoRank`) VALUES
('global-settings', 'INR (₹)', '+1', '2026-07-02 06:27:23.417', 1000, '90 Days', 8, 'UTC+00:00 (London)', 5, 14, 1, 7, 'Monthly', 0, 'INR (₹) - Indian Rupee', 75, 'Unlimited', 'Production', 'Google Gemini 1.5 Pro', 1);

-- --------------------------------------------------------

--
-- Table structure for table `holiday`
--

CREATE TABLE `holiday` (
  `id` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `date` varchar(191) NOT NULL,
  `type` varchar(191) NOT NULL,
  `region` varchar(191) NOT NULL,
  `status` varchar(191) NOT NULL DEFAULT 'Upcoming',
  `repeat` tinyint(1) NOT NULL DEFAULT 0,
  `description` text DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `integration`
--

CREATE TABLE `integration` (
  `id` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `category` varchar(191) NOT NULL,
  `status` varchar(191) NOT NULL DEFAULT 'Disconnected',
  `health` varchar(191) NOT NULL DEFAULT '-',
  `sync` varchar(191) NOT NULL DEFAULT 'Manual',
  `icon` varchar(191) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `interview`
--

CREATE TABLE `interview` (
  `id` varchar(191) NOT NULL,
  `applicationId` varchar(191) NOT NULL,
  `interviewerId` varchar(191) NOT NULL,
  `dateTime` datetime(3) NOT NULL,
  `meetingLink` varchar(191) DEFAULT NULL,
  `feedback` text DEFAULT NULL,
  `rating` int(11) DEFAULT NULL,
  `status` varchar(191) NOT NULL DEFAULT 'Scheduled',
  `round` varchar(191) DEFAULT NULL,
  `type` varchar(191) DEFAULT 'Video Call',
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `interview`
--

INSERT INTO `interview` (`id`, `applicationId`, `interviewerId`, `dateTime`, `meetingLink`, `feedback`, `rating`, `status`, `round`, `type`, `createdAt`, `updatedAt`) VALUES
('5f6e599b-d1df-4faf-abe2-e54fd144dcca', '31abcd3f-1f97-494c-870f-fc01809660c3', '2efdcbce-da64-44bf-8310-5ba3791ea48f', '2026-06-30 23:53:00.000', 'https://meet.google.com/abc-xyz-123', NULL, NULL, 'Scheduled', 'Technical Round', 'Video Call', '2026-07-01 10:53:37.989', '2026-07-01 10:54:04.101');

-- --------------------------------------------------------

--
-- Table structure for table `invoice`
--

CREATE TABLE `invoice` (
  `id` varchar(191) NOT NULL,
  `date` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `amount` varchar(191) NOT NULL,
  `method` varchar(191) NOT NULL,
  `status` varchar(191) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `invoice`
--

INSERT INTO `invoice` (`id`, `date`, `amount`, `method`, `status`, `createdAt`, `updatedAt`) VALUES
('2d274bc7-926a-448b-8138-7eb75930a851', '2026-09-01 00:00:00.000', '$4,280.00', 'Visa •••• 4242', 'Paid', '2026-06-29 07:42:32.351', '2026-06-29 07:42:32.351'),
('6dd706e1-2481-455d-a6e0-c39f939875f8', '2026-08-01 00:00:00.000', '$4,200.00', 'Visa •••• 4242', 'Paid', '2026-06-29 07:42:32.351', '2026-06-29 07:42:32.351'),
('9de4406a-b2c5-499a-bf63-f70f5ec0845f', '2026-07-01 00:00:00.000', '$4,200.00', 'Visa •••• 4242', 'Refunded', '2026-06-29 07:42:32.351', '2026-06-29 07:42:32.351'),
('ecfa04af-aed9-44a9-a2f6-b4db98c6bb45', '2026-10-01 00:00:00.000', '$4,280.00', 'Visa •••• 4242', 'Paid', '2026-06-29 07:42:32.351', '2026-06-29 07:42:32.351');

-- --------------------------------------------------------

--
-- Table structure for table `jobapplication`
--

CREATE TABLE `jobapplication` (
  `id` varchar(191) NOT NULL,
  `jobId` varchar(191) NOT NULL,
  `candidateId` varchar(191) NOT NULL,
  `status` enum('APPLIED','SCREENING','INTERVIEWING','OFFERED','HIRED','REJECTED') NOT NULL DEFAULT 'APPLIED',
  `resumeUrl` varchar(191) DEFAULT NULL,
  `coverLetter` text DEFAULT NULL,
  `submittedAt` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `jobapplication`
--

INSERT INTO `jobapplication` (`id`, `jobId`, `candidateId`, `status`, `resumeUrl`, `coverLetter`, `submittedAt`) VALUES
('31abcd3f-1f97-494c-870f-fc01809660c3', 'cb13996d-5a23-4c0c-8e56-a9a5e6c1571f', '44cb3d19-8f38-4850-ae98-a282ad372e35', 'HIRED', NULL, 'I would love to join your amazing team and build highly interactive SaaS products.', '2026-06-30 05:30:33.463');

-- --------------------------------------------------------

--
-- Table structure for table `jobpost`
--

CREATE TABLE `jobpost` (
  `id` varchar(191) NOT NULL,
  `title` varchar(191) NOT NULL,
  `description` text NOT NULL,
  `requirements` text NOT NULL,
  `salaryRange` varchar(191) DEFAULT NULL,
  `location` varchar(191) DEFAULT NULL,
  `jobType` varchar(191) DEFAULT NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT 1,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  `department` varchar(191) DEFAULT NULL,
  `experience` varchar(191) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `jobpost`
--

INSERT INTO `jobpost` (`id`, `title`, `description`, `requirements`, `salaryRange`, `location`, `jobType`, `isActive`, `createdAt`, `updatedAt`, `department`, `experience`) VALUES
('1aa57422-1ac0-42cc-87ab-54d53e3ecec9', 'Field sales', 'Position description not specified.', '', '', 'Remote', 'Full Time', 1, '2026-07-01 07:54:00.303', '2026-07-01 09:05:02.937', 'Design', ''),
('c9aa736c-6781-41d8-9411-db541eccc1c7', 'Dev', 'Auto-generated job post for manual candidate addition.', '', NULL, NULL, NULL, 1, '2026-07-01 09:22:57.674', '2026-07-01 09:22:57.674', 'General', NULL),
('cb13996d-5a23-4c0c-8e56-a9a5e6c1571f', 'Senior Frontend Developer', 'Join our team to build state-of-the-art UI layouts using React and Vite.', 'React, TypeScript, Tailwind CSS, 5+ years experience', '$120k - $150k', 'Remote', 'Full-Time', 1, '2026-06-30 05:30:33.449', '2026-06-30 05:30:33.449', NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `leaverequest`
--

CREATE TABLE `leaverequest` (
  `id` varchar(191) NOT NULL,
  `userId` varchar(191) NOT NULL,
  `leaveType` varchar(191) NOT NULL,
  `startDate` date NOT NULL,
  `endDate` date NOT NULL,
  `totalDays` int(11) NOT NULL,
  `reason` varchar(191) DEFAULT NULL,
  `status` enum('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
  `managerComment` varchar(191) DEFAULT NULL,
  `emergencyContact` varchar(191) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `leaverequest`
--

INSERT INTO `leaverequest` (`id`, `userId`, `leaveType`, `startDate`, `endDate`, `totalDays`, `reason`, `status`, `managerComment`, `emergencyContact`, `createdAt`) VALUES
('90e2a63f-9adc-47c2-b56d-ac550bcdfefc', '829d786b-a18b-4219-a7b6-7e2bdf0b7f30', 'Annual Leave', '2026-07-02', '2026-07-04', 3, 'Annual leave\n', 'APPROVED', NULL, NULL, '2026-07-02 07:04:43.740'),
('a3181202-d6e4-4974-a5ee-dae4b4a13785', '78c3ecee-e562-430b-b157-80afeacf198b', 'Annual Leave', '2026-07-01', '2026-07-04', 4, 'Personal work', 'APPROVED', 'Approved', '578545454545', '2026-06-30 06:21:11.171'),
('cec5b867-7b1f-4240-90b3-6e177bef3d9d', '19a1bef8-e5ab-4e83-ac04-d96ada4ed619', 'Annual Leave', '2026-07-01', '2026-07-07', 7, 'Trip', 'APPROVED', 'Approved', NULL, '2026-06-30 12:11:59.944');

-- --------------------------------------------------------

--
-- Table structure for table `notification`
--

CREATE TABLE `notification` (
  `id` varchar(191) NOT NULL,
  `userId` varchar(191) NOT NULL,
  `title` varchar(191) NOT NULL,
  `message` text NOT NULL,
  `type` enum('INFO','SUCCESS','WARNING','ALERT') NOT NULL DEFAULT 'INFO',
  `isRead` tinyint(1) NOT NULL DEFAULT 0,
  `link` text DEFAULT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `notification`
--

INSERT INTO `notification` (`id`, `userId`, `title`, `message`, `type`, `isRead`, `link`, `metadata`, `createdAt`, `updatedAt`) VALUES
('56ed0483-7778-4653-81c8-ca515b236d1f', '19a1bef8-e5ab-4e83-ac04-d96ada4ed619', 'Test Dynamic Notification', 'This is a dynamically generated notification for testing.', 'SUCCESS', 0, '/employee/dashboard', NULL, '2026-07-02 06:48:31.401', '2026-07-02 06:48:31.401');

-- --------------------------------------------------------

--
-- Table structure for table `offer`
--

CREATE TABLE `offer` (
  `id` varchar(191) NOT NULL,
  `candidate` varchar(191) NOT NULL,
  `role` varchar(191) NOT NULL,
  `salary` varchar(191) NOT NULL,
  `joiningDate` varchar(191) NOT NULL,
  `status` varchar(191) NOT NULL DEFAULT 'Sent',
  `sentDate` varchar(191) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `offer`
--

INSERT INTO `offer` (`id`, `candidate`, `role`, `salary`, `joiningDate`, `status`, `sentDate`, `createdAt`, `updatedAt`) VALUES
('2b27f000-0146-4419-abe4-207ae3019089', 'Candidate', 'Senior Frontend Developer', '300000', '2026-07-02', 'Sent', 'Jul 1, 2026', '2026-07-01 10:55:14.190', '2026-07-01 10:55:26.515');

-- --------------------------------------------------------

--
-- Table structure for table `onboarding`
--

CREATE TABLE `onboarding` (
  `id` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `email` varchar(191) DEFAULT NULL,
  `phone` varchar(191) DEFAULT NULL,
  `role` varchar(191) NOT NULL,
  `department` varchar(191) DEFAULT NULL,
  `manager` varchar(191) DEFAULT NULL,
  `joiningDate` varchar(191) DEFAULT NULL,
  `progress` int(11) NOT NULL DEFAULT 0,
  `status` varchar(191) NOT NULL DEFAULT 'Not Started',
  `avatar` text DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `onboarding`
--

INSERT INTO `onboarding` (`id`, `name`, `email`, `phone`, `role`, `department`, `manager`, `joiningDate`, `progress`, `status`, `avatar`, `createdAt`, `updatedAt`) VALUES
('8a4ca65a-5a67-4bad-8b9b-7e8d18c2ec0b', 'Candidate', 'candidate@hcm.ai', '+1 555-0105', 'Senior Frontend Developer', 'Engineering', '', '2026-07-02', 100, 'Ready', NULL, '2026-07-01 11:10:35.820', '2026-07-01 11:10:55.190');

-- --------------------------------------------------------

--
-- Table structure for table `organization`
--

CREATE TABLE `organization` (
  `id` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `logoUrl` varchar(191) DEFAULT NULL,
  `address` varchar(191) DEFAULT NULL,
  `taxId` varchar(191) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  `legalName` varchar(191) DEFAULT NULL,
  `websiteUrl` varchar(191) DEFAULT NULL,
  `industry` varchar(191) DEFAULT NULL,
  `companySize` varchar(191) DEFAULT NULL,
  `primaryEmail` varchar(191) DEFAULT NULL,
  `supportPhone` varchar(191) DEFAULT NULL,
  `timezone` varchar(191) DEFAULT NULL,
  `currency` varchar(191) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `organization`
--

INSERT INTO `organization` (`id`, `name`, `logoUrl`, `address`, `taxId`, `createdAt`, `updatedAt`, `legalName`, `websiteUrl`, `industry`, `companySize`, `primaryEmail`, `supportPhone`, `timezone`, `currency`) VALUES
('a64605c8-3b47-4c57-9e5c-243d87af5090', 'GlobalTech Solutions', 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=150', '100 Innovation Way, Silicon Valley, CA', 'TX-99887766', '2026-06-30 05:30:33.219', '2026-06-30 05:30:33.219', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `payslip`
--

CREATE TABLE `payslip` (
  `id` varchar(191) NOT NULL,
  `employeeId` varchar(191) NOT NULL,
  `month` varchar(191) NOT NULL,
  `basic` double NOT NULL,
  `hra` double NOT NULL,
  `allowance` double NOT NULL,
  `bonus` double NOT NULL DEFAULT 0,
  `pf` double NOT NULL,
  `tax` double NOT NULL,
  `netPay` double NOT NULL,
  `status` varchar(191) NOT NULL DEFAULT 'Unpaid',
  `paymentDate` datetime(3) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `payslip`
--

INSERT INTO `payslip` (`id`, `employeeId`, `month`, `basic`, `hra`, `allowance`, `bonus`, `pf`, `tax`, `netPay`, `status`, `paymentDate`, `createdAt`) VALUES
('6c4e7df5-5f8f-4a6b-b0a4-d28d990ad5fb', 'c7c1b600-bb28-4dc8-bc03-dec800ae87b4', 'June', 6000, 1200, 500, 300, 400, 300, 7300, 'Paid', '2026-06-30 05:30:33.484', '2026-06-30 05:30:33.485');

-- --------------------------------------------------------

--
-- Table structure for table `performancegoal`
--

CREATE TABLE `performancegoal` (
  `id` varchar(191) NOT NULL,
  `employeeId` varchar(191) NOT NULL,
  `title` varchar(191) NOT NULL,
  `progress` int(11) NOT NULL DEFAULT 0,
  `priority` varchar(191) NOT NULL DEFAULT 'Medium',
  `deadline` datetime(3) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `performancegoal`
--

INSERT INTO `performancegoal` (`id`, `employeeId`, `title`, `progress`, `priority`, `deadline`, `createdAt`, `updatedAt`) VALUES
('257dd3e9-2107-4c67-92ab-f6db6d50ca57', 'c7c1b600-bb28-4dc8-bc03-dec800ae87b4', 'Complete React 19 Upgrade', 60, 'High', '2026-09-30 00:00:00.000', '2026-06-30 05:30:33.507', '2026-06-30 05:30:33.507');

-- --------------------------------------------------------

--
-- Table structure for table `performancereview`
--

CREATE TABLE `performancereview` (
  `id` varchar(191) NOT NULL,
  `employeeId` varchar(191) NOT NULL,
  `period` varchar(191) NOT NULL,
  `reviewer` varchar(191) NOT NULL,
  `rating` varchar(191) NOT NULL,
  `text` text NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `performancereview`
--

INSERT INTO `performancereview` (`id`, `employeeId`, `period`, `reviewer`, `rating`, `text`, `createdAt`) VALUES
('4ba890dc-75a4-4d21-823e-ff416795451e', 'ecc6e97d-57b9-452d-9507-4f26d16bcfa8', 'Q3 2026', 'Sarah Johnson', '4.9/5.0', 'Exceptional ownership on the design system rollout. A true culture catalyst.', '2026-07-01 12:44:41.467'),
('5dec7937-1147-4d8a-8da7-4ae97798a960', 'c7c1b600-bb28-4dc8-bc03-dec800ae87b4', 'Q2 2026', 'Sarah Johnson', '2', '{\"strengths\":\"Exceptional problem-solving skills.\\nStrong team collaboration.\\nConsistent delivery on critical path items.\",\"improvement\":\"Could improve cross-departmental communication.\\nDelegate more tasks to junior members.\",\"summary\":\"Outstanding performance this cycle. The employee has consistently exceeded expectations in technical delivery and team leadership. Highly recommend for the fast-track growth program.\",\"status\":\"Submitted\"}', '2026-06-30 07:25:28.485'),
('7f24de7b-1bc9-4b7a-ada8-bd3a4a4e1c13', 'ecc6e97d-57b9-452d-9507-4f26d16bcfa8', 'Q2 2026', 'Sarah Johnson', '4.8/5.0', 'Quality output is industry-leading. Great focus on performance KPIs.', '2026-07-01 12:44:41.481'),
('9726a6eb-52ed-4e30-80cd-30d7f2a4c2f7', 'c7c1b600-bb28-4dc8-bc03-dec800ae87b4', 'Q3 2026', 'Sarah Johnson', '3', '{\"strengths\":\"Exceptional problem-solving skills.\\nStrong team collaboration.\\nConsistent delivery on critical path items.\",\"improvement\":\"Could improve cross-departmental communication.\\nDelegate more tasks to junior members.\",\"summary\":\"Outstanding performance this cycle. The employee has consistently exceeded expectations in technical delivery and team leadership. Highly recommend for the fast-track growth program.\",\"status\":\"Submitted\"}', '2026-06-30 07:25:28.417');

-- --------------------------------------------------------

--
-- Table structure for table `policy`
--

CREATE TABLE `policy` (
  `id` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `category` varchar(191) NOT NULL,
  `department` varchar(191) DEFAULT 'All',
  `owner` varchar(191) NOT NULL,
  `effectiveDate` varchar(191) DEFAULT NULL,
  `expiryDate` varchar(191) DEFAULT NULL,
  `version` varchar(191) DEFAULT '1.0',
  `requiresSignature` tinyint(1) NOT NULL DEFAULT 1,
  `status` enum('Active','Expiring Soon','Renewing','Archived') NOT NULL DEFAULT 'Active',
  `description` text DEFAULT NULL,
  `pdfName` varchar(191) DEFAULT NULL,
  `acknowledgments` varchar(191) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `pricingfeature`
--

CREATE TABLE `pricingfeature` (
  `id` varchar(191) NOT NULL,
  `pricingPlanId` varchar(191) NOT NULL,
  `feature` varchar(191) NOT NULL,
  `displayOrder` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `pricingfeature`
--

INSERT INTO `pricingfeature` (`id`, `pricingPlanId`, `feature`, `displayOrder`) VALUES
('0ec4f687-5a3d-434e-9df1-ab5ee89afc89', '332c9428-58e3-46f9-bd89-e68272874da7', 'Automated Payroll processing', 1),
('1743b2b1-fb24-4b21-9130-353ee36002a7', '332c9428-58e3-46f9-bd89-e68272874da7', 'KPI & Performance Tracking', 2),
('193102d8-0e7a-4071-a6e9-f4929be5e35f', 'deed0ae6-be40-4d7c-ba1a-89b8117db335', 'Custom Workflow Automation', 0),
('29272eca-9bf6-4479-9414-c49fb3a739d7', 'deed0ae6-be40-4d7c-ba1a-89b8117db335', 'Biometric/Clock-in Synced Logs', 1),
('53ce3d5b-6a9d-4948-9353-93e9ae7238bc', '332c9428-58e3-46f9-bd89-e68272874da7', 'Priority 24/7 Support', 3),
('58037cb1-57ee-4029-86d9-4f5111580d20', '332c9428-58e3-46f9-bd89-e68272874da7', 'API & Webhook Integrations', 4),
('659e2e69-27d3-45fa-8716-26ed21a0c256', 'deed0ae6-be40-4d7c-ba1a-89b8117db335', 'Dedicated Account Manager', 2),
('6d94b1f8-585b-4671-93b2-9b506b5ee2ef', 'deed0ae6-be40-4d7c-ba1a-89b8117db335', 'Unlimited AI Screen credits', 3),
('a6018a9b-067a-4232-8329-1a16f587bbe2', 'deed0ae6-be40-4d7c-ba1a-89b8117db335', 'HIPAA/SOC2 Security Suite', 4),
('b5ca3b9b-1389-466c-bd82-56df16bd27aa', '07a10b89-c0d3-4bac-ad3f-8e9df1ca2647', 'Core Directory access', 0),
('f15f9323-eed5-4452-ac16-bb65ff0b70b4', '332c9428-58e3-46f9-bd89-e68272874da7', 'AI Recruitment assistant', 0);

-- --------------------------------------------------------

--
-- Table structure for table `pricingplan`
--

CREATE TABLE `pricingplan` (
  `id` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `description` varchar(191) NOT NULL,
  `monthlyPrice` double NOT NULL,
  `yearlyPrice` double NOT NULL,
  `currency` varchar(191) NOT NULL DEFAULT 'USD',
  `billingCycle` varchar(191) NOT NULL DEFAULT 'Monthly',
  `trialDays` int(11) NOT NULL DEFAULT 14,
  `maxEmployees` int(11) NOT NULL DEFAULT 100,
  `maxAdmins` int(11) NOT NULL DEFAULT 3,
  `storageLimit` int(11) NOT NULL DEFAULT 10,
  `aiCredits` int(11) DEFAULT 0,
  `supportLevel` varchar(191) NOT NULL DEFAULT 'Standard',
  `buttonText` varchar(191) NOT NULL DEFAULT 'Start Trial',
  `buttonLink` varchar(191) NOT NULL DEFAULT '/login',
  `isPopular` tinyint(1) NOT NULL DEFAULT 0,
  `isActive` tinyint(1) NOT NULL DEFAULT 1,
  `displayOrder` int(11) NOT NULL DEFAULT 0,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `pricingplan`
--

INSERT INTO `pricingplan` (`id`, `name`, `description`, `monthlyPrice`, `yearlyPrice`, `currency`, `billingCycle`, `trialDays`, `maxEmployees`, `maxAdmins`, `storageLimit`, `aiCredits`, `supportLevel`, `buttonText`, `buttonLink`, `isPopular`, `isActive`, `displayOrder`, `createdAt`, `updatedAt`) VALUES
('07a10b89-c0d3-4bac-ad3f-8e9df1ca2647', 'Starter', '', 10, 120, 'INR (₹)', 'Both', 14, 50, 3, 5, 100, 'Priority Email', 'Start Free Trial', '/login', 0, 1, 0, '2026-07-02 13:40:46.104', '2026-07-02 13:40:46.104'),
('332c9428-58e3-46f9-bd89-e68272874da7', 'Professional', 'Advanced automation & analytics for scaling firms.', 39, 372, 'USD', 'Both', 14, 100, 5, 25, 500, 'Priority 24/7 Support', 'Get Professional', '/login', 1, 1, 2, '2026-07-02 13:08:47.593', '2026-07-02 13:08:47.593'),
('deed0ae6-be40-4d7c-ba1a-89b8117db335', 'Enterprise', 'Tailored security, unlimited scaling, and full features.', 99, 948, 'USD', 'Both', 30, 9999, 99, 500, 5000, 'Dedicated Account Manager', 'Contact Enterprise', '/book-demo', 0, 1, 3, '2026-07-02 13:08:47.608', '2026-07-02 13:08:47.608');

-- --------------------------------------------------------

--
-- Table structure for table `supportticket`
--

CREATE TABLE `supportticket` (
  `id` varchar(191) NOT NULL,
  `userId` varchar(191) NOT NULL,
  `subject` varchar(191) NOT NULL,
  `category` varchar(191) NOT NULL,
  `priority` varchar(191) NOT NULL,
  `status` enum('OPEN','IN_PROGRESS','RESOLVED') NOT NULL DEFAULT 'OPEN',
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `supportticket`
--

INSERT INTO `supportticket` (`id`, `userId`, `subject`, `category`, `priority`, `status`, `createdAt`) VALUES
('ab5632b8-e6d1-4f92-8033-91782827d600', '78c3ecee-e562-430b-b157-80afeacf198b', 'VPN Connection Issues', 'IT Support', 'High', 'OPEN', '2026-06-30 05:30:33.499'),
('bb80d774-4862-429e-8560-5982b73b52e8', '78c3ecee-e562-430b-b157-80afeacf198b', 'General HR Inquiry from Benefits Page', 'HR', 'Medium', 'OPEN', '2026-06-30 06:45:05.340');

-- --------------------------------------------------------

--
-- Table structure for table `task`
--

CREATE TABLE `task` (
  `id` varchar(191) NOT NULL,
  `employeeId` varchar(191) NOT NULL,
  `title` varchar(191) NOT NULL,
  `description` varchar(191) DEFAULT NULL,
  `status` varchar(191) NOT NULL DEFAULT 'Pending',
  `priority` varchar(191) NOT NULL DEFAULT 'Medium',
  `dueDate` datetime(3) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `task`
--

INSERT INTO `task` (`id`, `employeeId`, `title`, `description`, `status`, `priority`, `dueDate`, `createdAt`, `updatedAt`) VALUES
('5b9627b4-7a5b-4b99-a9cb-34e687e88578', 'c7c1b600-bb28-4dc8-bc03-dec800ae87b4', 'Debug Login Session Redirects', 'Analyze axios 401 response handling and verify fallback modes.', 'Completed', 'High', '2026-07-02 05:30:33.510', '2026-06-30 05:30:33.512', '2026-06-30 12:58:16.568'),
('bb3e3761-b30d-4a42-9c5a-11c22a1bc440', '2efdcbce-da64-44bf-8310-5ba3791ea48f', 'Test', '', 'Completed', 'Low', '2026-07-10 00:00:00.000', '2026-06-30 12:59:36.623', '2026-06-30 13:00:18.691');

-- --------------------------------------------------------

--
-- Table structure for table `ticketmessage`
--

CREATE TABLE `ticketmessage` (
  `id` varchar(191) NOT NULL,
  `ticketId` varchar(191) NOT NULL,
  `senderId` varchar(191) NOT NULL,
  `text` text NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `attachmentUrl` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `ticketmessage`
--

INSERT INTO `ticketmessage` (`id`, `ticketId`, `senderId`, `text`, `createdAt`, `attachmentUrl`) VALUES
('809a8d62-92a4-4763-b14a-3d962f1ed6f7', 'ab5632b8-e6d1-4f92-8033-91782827d600', '78c3ecee-e562-430b-b157-80afeacf198b', 'Unable to connect to the corporate VPN from home network.', '2026-06-30 05:30:33.499', NULL),
('bf476202-1fa6-4a95-8b21-86128f4e700d', 'ab5632b8-e6d1-4f92-8033-91782827d600', '78c3ecee-e562-430b-b157-80afeacf198b', 'Unable to connect', '2026-06-30 07:54:30.356', NULL),
('f0ad64f2-994d-412d-88cd-d04ea7518aa4', 'bb80d774-4862-429e-8560-5982b73b52e8', '78c3ecee-e562-430b-b157-80afeacf198b', 'Hello, I have a question regarding my benefits.', '2026-06-30 06:45:05.340', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `user`
--

CREATE TABLE `user` (
  `id` varchar(191) NOT NULL,
  `email` varchar(191) NOT NULL,
  `passwordHash` varchar(191) NOT NULL,
  `role` enum('SUPERADMIN','ADMIN','HR','MANAGER','EMPLOYEE','CANDIDATE') NOT NULL DEFAULT 'EMPLOYEE',
  `isActive` tinyint(1) NOT NULL DEFAULT 1,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  `organizationId` varchar(191) DEFAULT NULL,
  `status` varchar(191) NOT NULL DEFAULT 'Active'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `user`
--

INSERT INTO `user` (`id`, `email`, `passwordHash`, `role`, `isActive`, `createdAt`, `updatedAt`, `organizationId`, `status`) VALUES
('19a1bef8-e5ab-4e83-ac04-d96ada4ed619', 'testemp@gmail.com', '$2b$10$kdlUu2VprFBKcpkGX.2FLe360jnDV9idPaxdtDHzKVgm1WqOKcfBe', 'EMPLOYEE', 1, '2026-06-30 10:25:43.304', '2026-06-30 10:25:43.304', 'a64605c8-3b47-4c57-9e5c-243d87af5090', 'Active'),
('2d511606-dc75-408a-a3ae-4f61cd2ad27b', 'superadmin@hcm.ai', '$2b$10$4f0ncuwAoXP.ZejdMz39LuBAJ0vdCgjEkXHbNs1PU3A1IHli5ZBPK', 'SUPERADMIN', 1, '2026-06-30 05:30:33.394', '2026-06-30 05:30:33.394', NULL, 'Active'),
('3195a749-733d-4ad2-bb74-0b3dcc411037', 'manager@hcm.ai', '$2b$10$flx5sX/wOoGOisS7tL83muhAyoidTPyABH8VzDDou7JfPTPQVwvIy', 'MANAGER', 1, '2026-06-30 05:30:33.417', '2026-06-30 09:46:50.639', 'a64605c8-3b47-4c57-9e5c-243d87af5090', 'Active'),
('49be6b1b-c334-4c34-b967-9a7367f263b4', 'test1@example.com', '$2b$10$yA.7.pA05hsIeCLRbsyuCOLTBHPkAlF0f8XPxBv55YnFO.Ubc6cf2', 'CANDIDATE', 1, '2026-07-01 09:22:57.654', '2026-07-01 12:35:26.522', 'a64605c8-3b47-4c57-9e5c-243d87af5090', 'Active'),
('78c3ecee-e562-430b-b157-80afeacf198b', 'employee@hcm.ai', '$2b$10$4f0ncuwAoXP.ZejdMz39LuBAJ0vdCgjEkXHbNs1PU3A1IHli5ZBPK', 'EMPLOYEE', 1, '2026-06-30 05:30:33.431', '2026-06-30 05:30:33.431', 'a64605c8-3b47-4c57-9e5c-243d87af5090', 'Active'),
('7d852c3a-2d68-48ff-98a1-7feaec3a5f0d', 'admin@hcm.ai', '$2b$10$4f0ncuwAoXP.ZejdMz39LuBAJ0vdCgjEkXHbNs1PU3A1IHli5ZBPK', 'ADMIN', 1, '2026-06-30 05:30:33.400', '2026-06-30 05:30:33.400', 'a64605c8-3b47-4c57-9e5c-243d87af5090', 'Active'),
('829d786b-a18b-4219-a7b6-7e2bdf0b7f30', 'newemp@gmail.com', '$2b$10$x0pqqe2cQ5mMR4t6S0bjoOk6YF4in2x/s2Fll0fBhNDVAYjTUmH2i', 'EMPLOYEE', 1, '2026-06-30 10:48:49.094', '2026-06-30 10:48:49.094', 'a64605c8-3b47-4c57-9e5c-243d87af5090', 'Active'),
('cf4e8c46-1ea3-4195-8bc9-1c3e2af7ba22', 'candidate@hcm.ai', '$2b$10$4f0ncuwAoXP.ZejdMz39LuBAJ0vdCgjEkXHbNs1PU3A1IHli5ZBPK', 'CANDIDATE', 1, '2026-06-30 05:30:33.441', '2026-06-30 10:45:30.279', NULL, 'Active'),
('d36ab2a6-2fa2-4647-a9ca-ab14123727ae', 'hr@hcm.ai', '$2b$10$4f0ncuwAoXP.ZejdMz39LuBAJ0vdCgjEkXHbNs1PU3A1IHli5ZBPK', 'HR', 1, '2026-06-30 05:30:33.410', '2026-06-30 05:30:33.410', 'a64605c8-3b47-4c57-9e5c-243d87af5090', 'Active');

-- --------------------------------------------------------

--
-- Table structure for table `_prisma_migrations`
--

CREATE TABLE `_prisma_migrations` (
  `id` varchar(36) NOT NULL,
  `checksum` varchar(64) NOT NULL,
  `finished_at` datetime(3) DEFAULT NULL,
  `migration_name` varchar(255) NOT NULL,
  `logs` text DEFAULT NULL,
  `rolled_back_at` datetime(3) DEFAULT NULL,
  `started_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `applied_steps_count` int(10) UNSIGNED NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `_prisma_migrations`
--

INSERT INTO `_prisma_migrations` (`id`, `checksum`, `finished_at`, `migration_name`, `logs`, `rolled_back_at`, `started_at`, `applied_steps_count`) VALUES
('2108d592-d46a-49c7-aa14-ee5bb92be705', '004cd4d2999c923945d556f2a11d9397dee14de3abb185a8c024b11181eec9c1', '2026-06-26 11:09:18.443', '20260626154500_add_user_status', NULL, NULL, '2026-06-26 11:09:17.242', 1),
('53de918d-8137-4271-85a4-56fd105c3304', 'd099bfc28bb486b50e30c1cf66536cfafe0f64af9a1f34b1a20ac7d607482503', '2026-06-22 07:05:40.087', '20260622070538_init', NULL, NULL, '2026-06-22 07:05:38.374', 1),
('78ca8a62-d077-4631-a97f-5e94789cfab3', '017b9109c36b3ee57f9b942923e4ce5a781e9257e594308879afccea2fcd3c9e', '2026-06-26 11:27:31.042', '20260626162000_make_avatar_url_text', NULL, NULL, '2026-06-26 11:27:30.670', 1),
('a531b3cc-ee69-4a65-bd9e-0157d611eb40', '0af8faf34ba5a68834d802fdb9fed07e10ee39b3632da92a375ec9bcf6487563', '2026-06-27 06:31:48.046', '20260627120000_extend_department_profile', NULL, NULL, '2026-06-27 06:31:48.025', 1),
('b512a13a-8874-4175-b4bc-b6b93d893b8a', '5201cbc58ea7101bdc4ce6f4664b635909d82a653bd3de58e9f59b6e39df7503', '2026-06-26 13:28:21.603', '20260626170000_extend_organization_profile', NULL, NULL, '2026-06-26 13:28:21.466', 1),
('bd1999fa-6209-4e46-9fe0-fea42bd71e85', '547f54bc9c46150589306ac1328ad6d5b09cd88900d040d805c36835191aa8c3', '2026-06-26 11:04:25.109', '20260626153000_add_employee_employment_type', NULL, NULL, '2026-06-26 11:04:25.076', 1);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `ailog`
--
ALTER TABLE `ailog`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `aimodule`
--
ALTER TABLE `aimodule`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `AiModule_name_key` (`name`);

--
-- Indexes for table `announcement`
--
ALTER TABLE `announcement`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `attendancelog`
--
ALTER TABLE `attendancelog`
  ADD PRIMARY KEY (`id`),
  ADD KEY `AttendanceLog_userId_fkey` (`userId`);

--
-- Indexes for table `auditlog`
--
ALTER TABLE `auditlog`
  ADD PRIMARY KEY (`id`),
  ADD KEY `AuditLog_userId_fkey` (`userId`);

--
-- Indexes for table `benefitclaim`
--
ALTER TABLE `benefitclaim`
  ADD PRIMARY KEY (`id`),
  ADD KEY `BenefitClaim_employeeId_fkey` (`employeeId`);

--
-- Indexes for table `benefitplan`
--
ALTER TABLE `benefitplan`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `billingplan`
--
ALTER TABLE `billingplan`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `BillingPlan_name_key` (`name`);

--
-- Indexes for table `candidateprofile`
--
ALTER TABLE `candidateprofile`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `CandidateProfile_userId_key` (`userId`);

--
-- Indexes for table `customrole`
--
ALTER TABLE `customrole`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `CustomRole_name_key` (`name`);

--
-- Indexes for table `demobooking`
--
ALTER TABLE `demobooking`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `department`
--
ALTER TABLE `department`
  ADD PRIMARY KEY (`id`),
  ADD KEY `Department_organizationId_fkey` (`organizationId`);

--
-- Indexes for table `document`
--
ALTER TABLE `document`
  ADD PRIMARY KEY (`id`),
  ADD KEY `Document_userId_fkey` (`userId`);

--
-- Indexes for table `employeeprofile`
--
ALTER TABLE `employeeprofile`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `EmployeeProfile_userId_key` (`userId`),
  ADD UNIQUE KEY `EmployeeProfile_employeeId_key` (`employeeId`),
  ADD KEY `EmployeeProfile_departmentId_fkey` (`departmentId`),
  ADD KEY `EmployeeProfile_managerId_fkey` (`managerId`);

--
-- Indexes for table `employeeskill`
--
ALTER TABLE `employeeskill`
  ADD PRIMARY KEY (`id`),
  ADD KEY `EmployeeSkill_employeeId_fkey` (`employeeId`);

--
-- Indexes for table `globalsettings`
--
ALTER TABLE `globalsettings`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `holiday`
--
ALTER TABLE `holiday`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `integration`
--
ALTER TABLE `integration`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `Integration_name_key` (`name`);

--
-- Indexes for table `interview`
--
ALTER TABLE `interview`
  ADD PRIMARY KEY (`id`),
  ADD KEY `Interview_applicationId_fkey` (`applicationId`),
  ADD KEY `Interview_interviewerId_fkey` (`interviewerId`);

--
-- Indexes for table `invoice`
--
ALTER TABLE `invoice`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `jobapplication`
--
ALTER TABLE `jobapplication`
  ADD PRIMARY KEY (`id`),
  ADD KEY `JobApplication_jobId_fkey` (`jobId`),
  ADD KEY `JobApplication_candidateId_fkey` (`candidateId`);

--
-- Indexes for table `jobpost`
--
ALTER TABLE `jobpost`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `leaverequest`
--
ALTER TABLE `leaverequest`
  ADD PRIMARY KEY (`id`),
  ADD KEY `LeaveRequest_userId_fkey` (`userId`);

--
-- Indexes for table `notification`
--
ALTER TABLE `notification`
  ADD PRIMARY KEY (`id`),
  ADD KEY `Notification_userId_fkey` (`userId`);

--
-- Indexes for table `offer`
--
ALTER TABLE `offer`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `onboarding`
--
ALTER TABLE `onboarding`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `organization`
--
ALTER TABLE `organization`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `payslip`
--
ALTER TABLE `payslip`
  ADD PRIMARY KEY (`id`),
  ADD KEY `Payslip_employeeId_fkey` (`employeeId`);

--
-- Indexes for table `performancegoal`
--
ALTER TABLE `performancegoal`
  ADD PRIMARY KEY (`id`),
  ADD KEY `PerformanceGoal_employeeId_fkey` (`employeeId`);

--
-- Indexes for table `performancereview`
--
ALTER TABLE `performancereview`
  ADD PRIMARY KEY (`id`),
  ADD KEY `PerformanceReview_employeeId_fkey` (`employeeId`);

--
-- Indexes for table `policy`
--
ALTER TABLE `policy`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `pricingfeature`
--
ALTER TABLE `pricingfeature`
  ADD PRIMARY KEY (`id`),
  ADD KEY `PricingFeature_pricingPlanId_fkey` (`pricingPlanId`);

--
-- Indexes for table `pricingplan`
--
ALTER TABLE `pricingplan`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `PricingPlan_name_key` (`name`);

--
-- Indexes for table `supportticket`
--
ALTER TABLE `supportticket`
  ADD PRIMARY KEY (`id`),
  ADD KEY `SupportTicket_userId_fkey` (`userId`);

--
-- Indexes for table `task`
--
ALTER TABLE `task`
  ADD PRIMARY KEY (`id`),
  ADD KEY `Task_employeeId_fkey` (`employeeId`);

--
-- Indexes for table `ticketmessage`
--
ALTER TABLE `ticketmessage`
  ADD PRIMARY KEY (`id`),
  ADD KEY `TicketMessage_ticketId_fkey` (`ticketId`),
  ADD KEY `TicketMessage_senderId_fkey` (`senderId`);

--
-- Indexes for table `user`
--
ALTER TABLE `user`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `User_email_key` (`email`),
  ADD KEY `User_organizationId_fkey` (`organizationId`);

--
-- Indexes for table `_prisma_migrations`
--
ALTER TABLE `_prisma_migrations`
  ADD PRIMARY KEY (`id`);

--
-- Constraints for dumped tables
--

--
-- Constraints for table `attendancelog`
--
ALTER TABLE `attendancelog`
  ADD CONSTRAINT `AttendanceLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `auditlog`
--
ALTER TABLE `auditlog`
  ADD CONSTRAINT `AuditLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `benefitclaim`
--
ALTER TABLE `benefitclaim`
  ADD CONSTRAINT `BenefitClaim_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `employeeprofile` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `candidateprofile`
--
ALTER TABLE `candidateprofile`
  ADD CONSTRAINT `CandidateProfile_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `department`
--
ALTER TABLE `department`
  ADD CONSTRAINT `Department_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organization` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `document`
--
ALTER TABLE `document`
  ADD CONSTRAINT `Document_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `employeeprofile`
--
ALTER TABLE `employeeprofile`
  ADD CONSTRAINT `EmployeeProfile_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `department` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `EmployeeProfile_managerId_fkey` FOREIGN KEY (`managerId`) REFERENCES `employeeprofile` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `EmployeeProfile_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `employeeskill`
--
ALTER TABLE `employeeskill`
  ADD CONSTRAINT `EmployeeSkill_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `employeeprofile` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `interview`
--
ALTER TABLE `interview`
  ADD CONSTRAINT `Interview_applicationId_fkey` FOREIGN KEY (`applicationId`) REFERENCES `jobapplication` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `Interview_interviewerId_fkey` FOREIGN KEY (`interviewerId`) REFERENCES `employeeprofile` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `jobapplication`
--
ALTER TABLE `jobapplication`
  ADD CONSTRAINT `JobApplication_candidateId_fkey` FOREIGN KEY (`candidateId`) REFERENCES `candidateprofile` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `JobApplication_jobId_fkey` FOREIGN KEY (`jobId`) REFERENCES `jobpost` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `leaverequest`
--
ALTER TABLE `leaverequest`
  ADD CONSTRAINT `LeaveRequest_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `notification`
--
ALTER TABLE `notification`
  ADD CONSTRAINT `Notification_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `payslip`
--
ALTER TABLE `payslip`
  ADD CONSTRAINT `Payslip_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `employeeprofile` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `performancegoal`
--
ALTER TABLE `performancegoal`
  ADD CONSTRAINT `PerformanceGoal_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `employeeprofile` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `performancereview`
--
ALTER TABLE `performancereview`
  ADD CONSTRAINT `PerformanceReview_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `employeeprofile` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `pricingfeature`
--
ALTER TABLE `pricingfeature`
  ADD CONSTRAINT `PricingFeature_pricingPlanId_fkey` FOREIGN KEY (`pricingPlanId`) REFERENCES `pricingplan` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `supportticket`
--
ALTER TABLE `supportticket`
  ADD CONSTRAINT `SupportTicket_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `task`
--
ALTER TABLE `task`
  ADD CONSTRAINT `Task_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `employeeprofile` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `ticketmessage`
--
ALTER TABLE `ticketmessage`
  ADD CONSTRAINT `TicketMessage_senderId_fkey` FOREIGN KEY (`senderId`) REFERENCES `user` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `TicketMessage_ticketId_fkey` FOREIGN KEY (`ticketId`) REFERENCES `supportticket` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `user`
--
ALTER TABLE `user`
  ADD CONSTRAINT `User_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organization` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
