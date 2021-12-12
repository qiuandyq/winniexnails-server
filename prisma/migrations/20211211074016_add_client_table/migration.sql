-- AlterTable
ALTER TABLE "Slot" ADD COLUMN     "clientId" INTEGER;

-- CreateTable
CREATE TABLE "Client" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "instagramHandle" TEXT NOT NULL,

    PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Client.email_unique" ON "Client"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Client.phoneNumber_unique" ON "Client"("phoneNumber");

-- AddForeignKey
ALTER TABLE "Slot" ADD FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
