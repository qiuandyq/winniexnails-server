import { PrismaClient } from '@prisma/client';
import { Request, Response, Router } from 'express';
import dayjs from 'dayjs';

const router = Router();
const prisma = new PrismaClient();

router.get('/', async (req: Request, res: Response) => {
  try {
    res.json(await prisma.slot.findMany({
      where: {
        bookingDate: {
          gte: dayjs().toDate(),
        },
        booked: false,
      },
      orderBy: {
        bookingDate: 'asc',
      },
    }));
  } catch (e) {
    res.status(500).json({ error: e });
  }
});

export default router;
