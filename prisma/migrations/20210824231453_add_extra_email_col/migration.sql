-- AlterTable
ALTER TABLE "Slot" ADD COLUMN     "confirmEmail" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paidEmail" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "updateEmail" BOOLEAN NOT NULL DEFAULT false;
