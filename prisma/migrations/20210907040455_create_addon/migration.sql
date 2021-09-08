-- CreateTable
CREATE TABLE "SlotAddOn" (
    "id" SERIAL NOT NULL,
    "addOn" TEXT NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,
    "slotId" INTEGER NOT NULL,

    PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SlotAddOn" ADD FOREIGN KEY ("slotId") REFERENCES "Slot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
