import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';

import slots from './slots';
import openSlots from './openSlots';

const PORT = process.env.PORT || 3000;
const app = express();

app.use(cors());
app.use(bodyParser.json());

app.get('/', (req, res) => res.send('Hello World!'));

app.use('/slots', slots);
app.use('/openslots', openSlots);

app.listen(PORT, () => console.log(`App listening on port ${PORT}!`));