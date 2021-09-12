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

const { CronJob } = require('cron');

const job = new CronJob('0 */6 * * *', (async () => {
  const begin = new Date(new Date().getTime());
  const end = new Date(new Date().getTime());
  end.setHours(end.getHours() + 48);

  const findQuery: Prisma.SlotFindManyArgs = {
    orderBy: {
      bookingDate: 'asc',
    },
    where: {
      bookingDate: {
        gte: begin.toISOString(),
        lt: end.toISOString(),
      },
      booked: true,
      paid: true,
      updateEmail: false,
    },
  };

  const result = await prisma.slot.findMany(findQuery);

  result.forEach(async (booking) => {
    if (booking.bookingDate) {
      const emailBody = {
        to: String(booking.email),
        from: {
          email: 'hello@winniexnails.com',
          name: 'winniexnails',
        },
        templateId: 'd-c96b2a64d0934a16b0e39d45dcb9d085',
        dynamic_template_data: {
          name: booking.name,
          booking_date: dayjs(booking.bookingDate).format('LLL'),
          service: booking.service,
          price: currency(String(booking.price)).format(),
        },
      };
      await sgMail.send(emailBody);
    }
    await prisma.slot.update({
      where: {
        id: booking.id,
      },
      data: {
        updateEmail: true,
      },
    });
  });

  // const updatedSlot = await prisma.slot.update({
  //   where: { id },
  //   data: {
  //     updateEmail: true,
  //   },
  // });

  // if (slot.bookingDate) {
  //   const emailBody = {
  //     to: email,
  //     from: {
  //       email: 'hello@winniexnails.com',
  //       name: 'winniexnails',
  //     },
  //     templateId: 'd-c96b2a64d0934a16b0e39d45dcb9d085',
  //     dynamic_template_data: {
  //       name,
  //       booking_date: dayjs(slot.bookingDate).format('LLL'),
  //       service,
  //       price: currency(price).format(),
  //     },
  //   };
  //   await sgMail.send(emailBody);

  // console.log(await prisma.slot.findMany(findQuery));
}), null, true, 'America/Los_Angeles');
job.start();

dayjs.extend(LocalizedFormat);

router.get('/', async (req: Request, res: Response) => {
  try {
    const findQuery: Prisma.SlotFindManyArgs = {
      orderBy: {
        bookingDate: 'asc',
      },
      include: {
        addons: true,
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
      addons,
    } = req.body;

    if (paid) {
      try {
        const updatedSlot = await prisma.slot.update({
          where: { id },
          data: {
            paid: true,
          },
        });

        return res.json(updatedSlot);
      } catch (e) {
        return res.status(500).json({ error: e });
      }
    }

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
    if (addons !== undefined) data.addons = addons;

    // if addon create slotaddon loop
    const addonIds: { id: number; }[] = [];

    if (addons.length > 0) {
      addons.forEach(async (addon: any) => {
        const createAddon = await prisma.slotAddon.create({
          data: {
            slotId: id,
            addon: addon.addon,
            price: addon.price,
          },
        });

        addonIds.push({ id: createAddon.id });
      });
    }
    const updatedSlot = await prisma.slot.update({
      where: { id },
      data: {
        booked: true,
        addons: {
          connect: addonIds,
        },
      },
    });

    return res.json(updatedSlot);
  } catch (e) {
    return res.status(500).json({ error: e });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    await prisma.slotAddon.deleteMany({
      where: { slotId: id },
    });
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
      addons,
    } = req.body;

    if (!id) return res.status(400).json({ error: 'invalid id' });

    if ([name, email, phoneNumber, service, instagramHandle, price].some((x) => !x)) {
      return res.status(400).json({ error: 'invalid body' });
    }

    const slot = await prisma.slot.findUnique({
      where: { id },
    });
    if (!slot) return res.status(404).json({ error: 'email no slot found' });

    if (slot.confirmEmail) return res.status(400).json({ error: 'email already sent' });

    const updatedSlot = await prisma.slot.update({
      where: { id },
      data: {
        name,
        email,
        phoneNumber,
        service,
        instagramHandle,
        price,
        confirmEmail: true,
      },
    });

    if (slot.bookingDate) {
      const emailBody = {
        to: email,
        from: {
          email: 'hello@winniexnails.com',
          name: 'winniexnails',
        },
        templateId: 'd-ed9589eac5144b148c8196a3dd0ffd6a',
        dynamic_template_data: {
          id: slot.id,
          name,
          booking_date: dayjs(slot.bookingDate).format('LLL'),
          service,
          price: currency(price).format(),
          addons,
        },
      };
      await sgMail.send(emailBody);

      return res.json(updatedSlot);
    }
    return res.status(500).json({ error: 'server error' });
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
      addons,
    } = req.body;

    if (!id) return res.status(400).json({ error: 'invalid id' });

    if ([name, email, phoneNumber, service, instagramHandle, price].some((x) => !x)) {
      return res.status(400).json({ error: 'invalid body' });
    }

    const slot = await prisma.slot.findUnique({
      where: { id },
    });
    if (!slot) return res.status(404).json({ error: 'no slot found' });

    if (slot.paidEmail) return res.status(400).json({ error: 'paid email already sent' });

    const updatedSlot = await prisma.slot.update({
      where: { id },
      data: {
        name,
        email,
        phoneNumber,
        service,
        instagramHandle,
        paidEmail: true,
      },
    });

    const newAddOn = addons.filter((addon: any) => addon.addon !== 'none');

    if (slot.bookingDate) {
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
          newAddOn,
        },
      };
      await sgMail.send(emailBody);

      return res.json(updatedSlot);
    }
    return res.status(500).json({ error: 'server error' });
  } catch (e) {
    return res.status(500).json({ error: e });
  }
});

export default router;
