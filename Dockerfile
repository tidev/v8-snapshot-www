FROM node:20

WORKDIR /app
COPY . .

RUN dpkg --add-architecture i386 \
	&& apt-get update \
	&& apt-get -y install libc6:i386 libncurses5:i386 libstdc++6:i386 \
	&& corepack enable \
	&& pnpm install

EXPOSE 5000/tcp

CMD node app --port 5000
