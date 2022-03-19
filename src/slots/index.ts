/* eslint-disable linebreak-style */
import { PrismaClient, Prisma } from '@prisma/client';
import { Request, Response, Router } from 'express';
import dayjs from 'dayjs';
import LocalizedFormat from 'dayjs/plugin/localizedFormat';
import sgMail from '@sendgrid/mail';
import currency from 'currency.js';

// App setup
const ics = require('ics');

const router = Router();
const prisma = new PrismaClient();

sgMail.setApiKey(String(process.env.SENDGRID_API_KEY));

const { CronJob } = require('cron');

const findClient = async (email:any) => {
  const client = await prisma.client.findUnique({
    where: {
      email,
    },
  });

  return client;
};

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

router.get('/v2/:month/:year', async (req: Request, res: Response) => {
  const date = new Date(Number(req.params.year), Number(req.params.month), 1);
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  try {
    const findQuery: Prisma.SlotFindManyArgs = {
      where: {
        bookingDate: {
          gte: firstDay,
          lt: lastDay,
        },
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
      date,
    } = req.body;

    if (date) {
      try {
        const updatedSlot = await prisma.slot.update({
          where: { id },
          data: {
            bookingDate: dayjs(date).toDate(),
          },
        });

        return res.json(updatedSlot);
      } catch (e) {
        return res.status(500).json({ error: e });
      }
    }

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
            price: addon.price ? addon.price : '0',
          },
        });

        addonIds.push({ id: createAddon.id });
      });
    }

    const client = await findClient(email);

    if (client) {
      await prisma.client.update({
        where: { id: client.id },
        data: {
          slots: {
            connect: { id },
          },
        },
      });
    } else {
      await prisma.client.create({
        data: {
          name,
          email,
          phoneNumber,
          instagramHandle,
          slots: {
            connect: { id },
          },
        },
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
    return res.status(500).json({ error: e });
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

router.post('/bookingconfirm', async (req: Request, res: Response) => {
  try {
    const formatAMPM = (date: any) => {
      let hours = date.getHours();
      let minutes = date.getMinutes();
      const ampm = hours >= 12 ? 'pm' : 'am';
      hours %= 12;
      hours = hours || 12; // the hour '0' should be '12'
      minutes = minutes < 10 ? `0${minutes}` : minutes;
      const strTime = `${hours}:${minutes} ${ampm}`;
      return strTime;
    };

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
        updateEmail: false,
      },
      include: {
        addons: true,
      },
    };

    const result = await prisma.slot.findMany(findQuery);

    result.forEach(async (booking: any) => {
      if (booking.bookingDate) {
        const newAddOn = booking.addons.filter((addon: any) => addon.addon !== 'none');
        const bookingDate = `${new Date(booking.bookingDate).toDateString()
        } ${formatAMPM(new Date(booking.bookingDate))}`;
        const emailBody = {
          to: String(booking.email),
          from: {
            email: 'hello@winniexnails.com',
            name: 'winniexnails',
          },
          templateId: 'd-c96b2a64d0934a16b0e39d45dcb9d085',
          dynamic_template_data: {
            name: booking.name,
            booking_date: bookingDate,
            service: booking.service,
            price: currency(String(booking.price)).format(),
            newAddOn,
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
    return res.status(500).json('sent email confirmations');
  } catch (e) {
    return res.status(500).json({ error: e });
  }
});

router.post('/:id/bookingtoclient', async (req: Request, res: Response) => {
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

    if (slot.bookingDate) {
      const date = new Date(slot.bookingDate);
      let addOnString = '';
      addons.forEach((addon: any) => { if (addOnString === '') addOnString += `${addon.addon} `; else addOnString += `, ${addon.addon}`; });
      let addOnPrice = '';
      addons.forEach((addon: any) => { if (addon.price) addOnPrice += `+ $${addon.price} `; });
      let dateString = '';
      if (date.getHours() === 12) {
        const num = date.getHours();
        dateString = `${num.toString()}:`;
        dateString += date.getMinutes();
        dateString += 'PM';
      } else if (date.getHours() > 12) {
        const num = date.getHours() - 12;
        dateString = `${num.toString()}:`;
        dateString += date.getMinutes();
        dateString += 'PM';
      } else {
        const num = date.getHours();
        dateString = `${num.toString()}:`;
        dateString += date.getMinutes();
        dateString += 'AM';
      }

      const event = {
        start: [
          date.getFullYear(),
          date.getMonth() + 1,
          date.getDate(),
          date.getHours(),
          date.getMinutes(),
        ],
        duration: { hours: 2, minutes: 0 },
        title: `${dateString} ${name} - ${service}`,
        description: `${service}: ${addOnString} 
        \nPrice: $${price} ${addOnPrice} 
        \nPhone Number: ${phoneNumber} 
        \nIG: ${instagramHandle} 
        \nEmail: ${email}`,
      };

      const { value } = ics.createEvent(event);

      const emailBody = {
        to: process.env.CLIENT_EMAIL,
        from: {
          email: 'hello@winniexnails.com',
          name: 'winniexnails',
        },
        templateId: 'd-2e3d2b1e30424e41b8b4fd2ee3bcd306',
        dynamic_template_data: {
          id: slot.id,
          name,
          booking_date: dayjs(slot.bookingDate).format('LLL'),
          service,
          email,
          phoneNumber,
          instagram: instagramHandle,
          price: currency(price).format(),
          addons,
        },
        attachments: [
          {
            content: Buffer.from(value).toString('base64'),
            filename: 'invite.ics',
            name: 'invite.ics',
            type: 'application/ics',
            disposition: 'attachment',
          },
        ],
      };
      await sgMail.send(emailBody);

      return res.json();
    }
    return res.status(500).json({ error: 'server error' });
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
      service,
      instagramHandle,
      price,
      addons,
      booked,
    } = req.body;

    if (!id) return res.status(400).json({ error: 'invalid id' });

    if (booked === 'open') {
      return res.json();
    }

    const slot = await prisma.slot.findUnique({
      where: { id },
    });
    if (!slot) return res.status(404).json({ error: 'email no slot found' });

    if (slot.bookingDate) {
      const emailBody = {
        to: email,
        from: {
          email: 'hello@winniexnails.com',
          name: 'winniexnails',
        },
        templateId: 'd-1393570b041c4dd7b81e667300f3eb2b',
        dynamic_template_data: {
          id: slot.id,
          name,
          booking_date: dayjs(slot.bookingDate).format('LLL'),
          service,
          email,
          instagram: instagramHandle,
          price: currency(price).format(),
          addons,
        },
      };
      await sgMail.send(emailBody);

      return res.json();
    }
    return res.status(500).json({ error: 'server error' });
  } catch (e) {
    return res.status(500).json({ error: e });
  }
});

export default router;
