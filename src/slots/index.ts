import { PrismaClient, Prisma } from '@prisma/client';
import { Request, Response, Router } from 'express';
import dayjs from 'dayjs';

const router = Router();
const prisma = new PrismaClient();

router.get('/', async (req: Request, res: Response) => {
  try {
    const findQuery: Prisma.SlotFindManyArgs = {
      orderBy: {
        bookingDate: 'asc'
      }
    };

    if (req.query.from) {
      const fromDate: dayjs.Dayjs = dayjs(req.query.from as string);
      if (!fromDate.isValid()) {
        return res.status(400).json({ error: 'from query is invalid date format' });
      }
      findQuery.where = {
        bookingDate: {
          gte: fromDate.toISOString()
        }
      };
    }

    res.json(await prisma.slot.findMany(findQuery));
  } catch (e) {
    res.status(500).json({error: e});
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    if (!req.body) {
      return res.status(400).json({ error: 'invalid body' });
    }
    
    const { date, multiDates }: {date: string, multiDates: Array<string>} = req.body;
    
    if (date && typeof date === 'string') {
      const slotId = await createSingleSlot(date);
      return res.json({success: true, id: slotId});
    }
    if (multiDates && multiDates.length > 0) {
      createMultipleSlots(multiDates);
      return res.json({success: true});
    }
    
    return res.status(400).json({ error: 'invalid date' });
  } catch (e) {
    console.log(e);
    return res.status(500).json({error: e});
  }
});
  
const createSingleSlot = async (date: string): Promise<number> => {
  const slot = await prisma.slot.create({
    data: { bookingDate: dayjs(date).toDate() }
  });
  return slot.id;
};
  
const createMultipleSlots = async (multiDates: Array<string>): Promise<void> => {
  await prisma.slot.createMany({
    data: multiDates.map(d => ({bookingDate: dayjs(d).toDate()}))
  });
};

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({error: 'invalid id'});

    const slot = await prisma.slot.findUnique({
      where: {id}
    });

    if (!slot) return res.status(404).json({error: 'no slot found'});

    return res.json(slot);
  } catch (e) {
    res.status(500).json({error: e});
  }
});

router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { 
      booked, 
      paid, 
      name, 
      email, 
      phoneNumber, 
      service, 
      instagramHandle, 
    } = req.body;

    if (!id) return res.status(400).json({error: 'invalid id'});

    const slot = await prisma.slot.findUnique({
      where: {id}
    });
    if (!slot) return res.status(404).json({error: 'no slot found'});
    
    const data: Prisma.SlotUpdateInput = {};

    if (booked !== undefined) data.booked = booked;
    if (paid !== undefined) data.paid = paid;
    if (name !== undefined) data.name = name;
    if (email !== undefined) data.email = email;
    if (phoneNumber !== undefined) data.phoneNumber = phoneNumber;
    if (service !== undefined) data.service = service;
    if (instagramHandle !== undefined) data.instagramHandle = instagramHandle;

    const updatedSlot = await prisma.slot.update({
      where: {id},
      data
    });

    return res.json(updatedSlot);
  } catch (e) {
    res.status(500).json({error: e});
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    await prisma.slot.delete({
      where: {id}
    });
    return res.json({});
  } catch (e) {
    // Catch failed deletes as outcome is the same
    return res.json({});
  }
});

export default router;