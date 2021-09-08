/* eslint-disable linebreak-style */
import { PrismaClient, Prisma } from '@prisma/client';
import sgMail from '@sendgrid/mail';
import currency from 'currency.js';

const prisma = new PrismaClient();

sgMail.setApiKey(String(process.env.SENDGRID_API_KEY));

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
    include: {
      addOn: true,
    },
  };

  const result = await prisma.slot.findMany(findQuery);

  result.forEach(async (booking: any) => {
    if (booking.bookingDate) {
      const newAddOn = booking.addOn.filter((slot: any) => slot.addon !== 'none');
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
};

cronJob();

// process.exit(1);
