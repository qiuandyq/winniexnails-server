#! /bin/bash

docker run \
	--rm \
	--name winniexnails \
	-e POSTGRES_PASSWORD=secret \
	-d \
	-p 5432:5432 \
	postgres \

echo 'DATABASE_URL="postgres://postgres:secret@localhost:5432/postgres"' > .env