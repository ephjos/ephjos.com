FROM nginx:stable-alpine

COPY public /var/www
COPY nginx /etc/nginx

ENV LISTEN_PORT 5001
EXPOSE 5001

CMD ["nginx"]

