FROM node:20

WORKDIR /app
COPY . /app

RUN dpkg --add-architecture i386 \
	&& apt-get update \
	&& apt-get -y install libc6:i386 libncurses5:i386 libstdc++6:i386 \
	&& corepack enable \
	&& pnpm install --frozen-lockfile

EXPOSE 80/tcp
CMD node app --port 80
