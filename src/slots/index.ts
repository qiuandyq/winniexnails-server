/* eslint-disable linebreak-style */
import { PrismaClient, Prisma } from '@prisma/client';
import { Request, Response, Router } from 'express';
import dayjs from 'dayjs';
import LocalizedFormat from 'dayjs/plugin/localizedFormat';
import sgMail from '@sendgrid/mail';
import currency from 'currency.js';

// App setup
const router = Router();
const prisma = new PrismaClient();

sgMail.setApiKey(String(process.env.SENDGRID_API_KEY));

dayjs.extend(LocalizedFormat);

router.get('/', async (req: Request, res: Response) => {
  try {
    const findQuery: Prisma.SlotFindManyArgs = {
      orderBy: {
        bookingDate: 'asc',
      },
    };

    if (req.query.from) {
      const fromDate: dayjs.Dayjs = dayjs(req.query.from as string);
      if (!fromDate.isValid()) {
        return res.status(400).json({ error: 'from query is invalid date format' });
      }
      findQuery.where = {
        bookingDate: {
          gte: fromDate.toISOString(),
        },
      };
    }

    return res.json(await prisma.slot.findMany(findQuery));
  } catch (e) {
    return res.status(500).json({ error: e });
  }
});

const createSingleSlot = async (date: string): Promise<number> => {
  const slot = await prisma.slot.create({
    data: { bookingDate: dayjs(date).toDate() },
  });
  return slot.id;
};

const createMultipleSlots = async (multiDates: Array<string>): Promise<void> => {
  await prisma.slot.createMany({
    data: multiDates.map((d) => ({ bookingDate: dayjs(d).toDate() })),
  });
};

router.post('/', async (req: Request, res: Response) => {
  try {
    if (!req.body) {
      return res.status(400).json({ error: 'invalid body' });
    }

    const { date, multiDates }: { date: string, multiDates: Array<string> } = req.body;

    if (date && typeof date === 'string') {
      const slotId = await createSingleSlot(date);
      return res.json({ success: true, id: slotId });
    }
    if (multiDates && multiDates.length > 0) {
      createMultipleSlots(multiDates);
      return res.json({ success: true });
    }

    return res.status(400).json({ error: 'invalid date' });
  } catch (e) {
    return res.status(500).json({ error: e });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'invalid id' });

    const slot = await prisma.slot.findUnique({
      where: { id },
    });

    if (!slot) return res.status(404).json({ error: 'no slot found' });

    return res.json(slot);
  } catch (e) {
    return res.status(500).json({ error: e });
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
      price,
    } = req.body;

    if (!id) return res.status(400).json({ error: 'invalid id' });

    const slot = await prisma.slot.findUnique({
      where: { id },
    });
    if (!slot) return res.status(404).json({ error: 'no slot found' });

    const data: Prisma.SlotUpdateInput = {};

    if (booked !== undefined) data.booked = booked;
    if (paid !== undefined) data.paid = paid;
    if (name !== undefined) data.name = name;
    if (email !== undefined) data.email = email;
    if (phoneNumber !== undefined) data.phoneNumber = phoneNumber;
    if (service !== undefined) data.service = service;
    if (instagramHandle !== undefined) data.instagramHandle = instagramHandle;
    if (price !== undefined) data.price = price;

    const updatedSlot = await prisma.slot.update({
      where: { id },
      data,
    });

    return res.json(updatedSlot);
  } catch (e) {
    return res.status(500).json({ error: e });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    await prisma.slot.delete({
      where: { id },
    });
    return res.json({});
  } catch (e) {
    // Catch failed deletes as outcome is the same
    return res.json({});
  }
});

router.post('/:id/bookingconfirm', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const {
      name,
      email,
      phoneNumber,
      service,
      instagramHandle,
      price,
    } = req.body;

    if (!id) return res.status(400).json({ error: 'invalid id' });

    if ([name, email, phoneNumber, service, instagramHandle, price].some((x) => !x)) {
      return res.status(400).json({ error: 'invalid body' });
    }

    const slot = await prisma.slot.findUnique({
      where: { id },
    });
    if (!slot) return res.status(404).json({ error: 'no slot found' });

    if (slot.booked) return res.status(400).json({ error: 'slot already booked' });

    const updatedSlot = await prisma.slot.update({
      where: { id },
      data: {
        name,
        email,
        phoneNumber,
        service,
        instagramHandle,
        price,
        booked: true,
      },
    });

    const emailBody = {
      to: email,
      from: {
        email: 'hello@winniexnails.com',
        name: 'winniexnails',
      },
      templateId: 'd-ed9589eac5144b148c8196a3dd0ffd6a',
      dynamic_template_data: {
        name,
        booking_date: dayjs(slot.bookingDate).format('LLL'),
        service,
        price: currency(price).format(),
      },
    };

    await sgMail.send(emailBody);

    return res.json(updatedSlot);
  } catch (e) {
    return res.status(500).json({ error: e });
  }
});

router.post('/:id/bookingcancel', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const {
      name,
      email,
      phoneNumber,
      service,
      instagramHandle,
      price,
    } = req.body;

    if (!id) return res.status(400).json({ error: 'invalid id' });

    if ([name, email, phoneNumber, service, instagramHandle, price].some((x) => !x)) {
      return res.status(400).json({ error: 'invalid body' });
    }

    const slot = await prisma.slot.findUnique({
      where: { id },
    });
    if (!slot) return res.status(404).json({ error: 'no slot found' });

    if (slot.booked) return res.status(400).json({ error: 'slot already booked' });

    const updatedSlot = await prisma.slot.update({
      where: { id },
      data: {
        name,
        email,
        phoneNumber,
        service,
        instagramHandle,
        price,
        booked: true,
      },
    });

    const emailBody = {
      to: email,
      from: {
        email: 'hello@winniexnails.com',
        name: 'winniexnails',
      },
      templateId: 'd-1393570b041c4dd7b81e667300f3eb2b',
      dynamic_template_data: {
        name,
        booking_date: dayjs(slot.bookingDate).format('LLL'),
        service,
        price: currency(price).format(),
      },
    };

    await sgMail.send(emailBody);

    return res.json(updatedSlot);
  } catch (e) {
    return res.status(500).json({ error: e });
  }
});

router.post('/:id/bookingpaid', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const {
      name,
      email,
      phoneNumber,
      service,
      instagramHandle,
      price,
      paidemail,
    } = req.body;

    if (!id) return res.status(400).json({ error: 'invalid id' });

    if ([name, email, phoneNumber, service, instagramHandle, price, paidemail].some((x) => !x)) {
      return res.status(400).json({ error: 'invalid body' });
    }

    const slot = await prisma.slot.findUnique({
      where: { id },
    });
    if (!slot) return res.status(404).json({ error: 'no slot found' });

    if (slot.booked) return res.status(400).json({ error: 'slot already booked' });

    const updatedSlot = await prisma.slot.update({
      where: { id },
      data: {
        name,
        email,
        phoneNumber,
        service,
        instagramHandle,
        price,
        booked: true,
      },
    });

    const emailBody = {
      to: email,
      from: {
        email: 'hello@winniexnails.com',
        name: 'winniexnails',
      },
      templateId: 'd-cc0665b4e33a44cf98eb37f727ab89be',
      dynamic_template_data: {
        name,
        booking_date: dayjs(slot.bookingDate).format('LLL'),
        service,
        price: currency(price).format(),
      },
    };

    await sgMail.send(emailBody);

    return res.json(updatedSlot);
  } catch (e) {
    return res.status(500).json({ error: e });
  }
});

router.post('/:id/booking48', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const {
      name,
      email,
      phoneNumber,
      service,
      instagramHandle,
      price,
    } = req.body;

    if (!id) return res.status(400).json({ error: 'invalid id' });

    if ([name, email, phoneNumber, service, instagramHandle, price].some((x) => !x)) {
      return res.status(400).json({ error: 'invalid body' });
    }

    const slot = await prisma.slot.findUnique({
      where: { id },
    });
    if (!slot) return res.status(404).json({ error: 'no slot found' });

    if (slot.booked) return res.status(400).json({ error: 'slot already booked' });

    const updatedSlot = await prisma.slot.update({
      where: { id },
      data: {
        name,
        email,
        phoneNumber,
        service,
        instagramHandle,
        price,
        booked: true,
      },
    });

    const emailBody = {
      to: email,
      from: {
        email: 'hello@winniexnails.com',
        name: 'winniexnails',
      },
      templateId: 'd-c96b2a64d0934a16b0e39d45dcb9d085',
      dynamic_template_data: {
        name,
        booking_date: dayjs(slot.bookingDate).format('LLL'),
        service,
        price: currency(price).format(),
      },
    };

    await sgMail.send(emailBody);

    return res.json(updatedSlot);
  } catch (e) {
    return res.status(500).json({ error: e });
  }
});

export default router;
