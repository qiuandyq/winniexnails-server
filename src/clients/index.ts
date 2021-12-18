/* eslint-disable linebreak-style */
import { PrismaClient, Prisma } from '@prisma/client';
import { Request, Response, Router } from 'express';

// App setup
const router = Router();
const prisma = new PrismaClient();

router.get('/', async (req: Request, res: Response) => {
  try {
    const findQuery: Prisma.ClientFindManyArgs = {
      orderBy: {
        name: 'asc',
      },
      include: {
        slots: true,
      },
    };

    return res.json(await prisma.client.findMany(findQuery));
  } catch (e) {
    return res.status(500).json({ error: e });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    if (!req.body) {
      return res.status(400).json({ error: 'invalid body' });
    }

    const {
      name, email, phoneNumber, instagramHandle,
    } = req.body;

    if (!name || !email || !phoneNumber || !instagramHandle) { return res.status(404).json({ error: 'invalid detail' }); }

    const client = await prisma.client.findUnique({
      where: { email },
    });

    if (client) { return res.status(400).json({ error: 'email already exists' }); }

    const newClient = await prisma.client.create({
      data: {
        name,
        email,
        phoneNumber,
        instagramHandle,
      },
    });

    return res.json(newClient);
  } catch (e) {
    return res.status(500).json({ error: e });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    const deleteClient = await prisma.client.delete({
      where: { id },
    });
    return res.json(deleteClient);
  } catch (e) {
    // Catch failed deletes as outcome is the same
    return res.status(500).json({ error: e });
  }
});

router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const {
      name, email, phoneNumber, instagramHandle,
    } = req.body;

    const client = await prisma.client.findUnique({
      where: { id },
    });
    if (!client) return res.status(400).json({ error: 'no slot found' });

    const updatedClient = await prisma.client.update({
      where: { id },
      data: {
        name,
        email,
        phoneNumber,
        instagramHandle,
      },
    });

    return res.json(updatedClient);
  } catch (e) {
    return res.status(500).json({ error: e });
  }
});

export default router;
