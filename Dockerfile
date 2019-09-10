FROM node
ARG NPM_CONFIG_REGISTRY=https://registry.npmjs.org/
MAINTAINER Jhonny Mata <solucionesmatajm@gmail.com>

WORKDIR /home/folivora
COPY . .

RUN npm install && ln -s /home/folivora/bin/mirror-cli \
    /usr/bin/folivora && mkdir /config \
    && cp ./repo.example.json /config/repo.json \
    && ln -s /config/repo.json ./

VOLUME /var/cache/folivora/

EXPOSE 8000

ENTRYPOINT ["/usr/bin/folivora", "runserver", "0.0.0.0", "8000", "--verbose"]