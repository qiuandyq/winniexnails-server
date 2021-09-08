/*
  Warnings:

  - You are about to drop the column `addOn` on the `SlotAddOn` table. All the data in the column will be lost.
  - Added the required column `addon` to the `SlotAddOn` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "SlotAddOn" DROP COLUMN "addOn",
ADD COLUMN     "addon" TEXT NOT NULL;
