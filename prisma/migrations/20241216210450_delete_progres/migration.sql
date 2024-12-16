/*
  Warnings:

  - You are about to drop the `progress` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "progress" DROP CONSTRAINT "progress_course_id_fkey";

-- DropForeignKey
ALTER TABLE "progress" DROP CONSTRAINT "progress_user_id_fkey";

-- DropTable
DROP TABLE "progress";
