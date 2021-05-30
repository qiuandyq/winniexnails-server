# winniexnails Server

## Local Dev

1. Install yarn
2. Run `yarn`
3. Run `yarn dev`


## Push DB Updates
1. Add DB line to .env file like so
```
DATABASE_URL="postgres://dbconnectionstring"
```
2. Run `npx prisma db push`

TODO: Add Migration files (need to test using local docker)