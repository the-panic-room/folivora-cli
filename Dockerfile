FROM node
MAINTAINER Jhonny Mata <solucionesmatajm@gmail.com>

WORKDIR /home/folivora
COPY . .

RUN npm install && npm test && ln -s ./bin/mirror-cli \
    /usr/bin/folivora && mkdir /config \
    && cp ./repo.example.json /config/repo.json \
    && ln -s /config/repo.json ./

VOLUME /var/cache/folivora/

EXPOSE 8000

CMD ["folivora", "runserver", "0.0.0.0", "8000"]