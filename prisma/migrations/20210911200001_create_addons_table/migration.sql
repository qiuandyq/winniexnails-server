-- CreateTable
CREATE TABLE "SlotAddon" (
    "id" SERIAL NOT NULL,
    "addon" TEXT NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,
    "slotId" INTEGER NOT NULL,

    PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SlotAddon" ADD FOREIGN KEY ("slotId") REFERENCES "Slot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
