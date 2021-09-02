/* eslint-disable linebreak-style */
import { PrismaClient, Prisma } from '@prisma/client';
import dayjs from 'dayjs';
import sgMail from '@sendgrid/mail';
import currency from 'currency.js';

const prisma = new PrismaClient();

const cronJob = async () => {
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
};
