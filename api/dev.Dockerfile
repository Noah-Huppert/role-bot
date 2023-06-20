FROM golang:1.19-alpine

ARG CONTAINER_USER_ID=1000
RUN adduser -D -u ${CONTAINER_USER_ID} api

RUN apk add bash

RUN mkdir -p /opt/role-bot/ && chown api /opt/role-bot/
WORKDIR /opt/role-bot/

USER api

RUN go install github.com/Noah-Huppert/goup@02d1736
RUN go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest

CMD ./scripts/entrypoint-dev.sh
