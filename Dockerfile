FROM golang:1.19-alpine

RUN apk add bash

RUN mkdir -p /opt/role-bot/
WORKDIR /opt/role-bot/

RUN go install github.com/DATA-DOG/goup@latest

CMD ./scripts/entrypoint-dev.sh
