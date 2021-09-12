# winniexnails Server

## Local Dev

1. Install yarn
2. Run `yarn`
3. Run `yarn dev`

## DB Migrations

NOTE: Make sure you don't have a the Postgres Server process running, kill it if you do

1. Download and install Docker
2. Run `docker pull postgres` to pull the image
3. From project root, run `sh ./scripts/db-setup.sh`. This will generate the `.env` file.
4. Run `npx prisma migrate dev` to push your changes to your local database
5. Verify your changes locally using `psql postgres://postgres:secret@localhost:5432/postgres`
