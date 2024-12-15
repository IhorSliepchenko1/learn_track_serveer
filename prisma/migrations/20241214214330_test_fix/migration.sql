/*
  Warnings:

  - You are about to drop the column `user_id` on the `test` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "test" DROP CONSTRAINT "test_user_id_fkey";

-- AlterTable
ALTER TABLE "test" DROP COLUMN "user_id";
