FROM node:20-alpine

WORKDIR /app
COPY . /app

RUN dpkg --add-architecture i386 \
	&& apt-get update \
	&& apt-get -y install libc6:i386 libncurses5:i386 libstdc++6:i386 \
	&& corepack enable \
	&& pnpm install --frozen-lockfile \
	&& pnpm run build

EXPOSE 5000/tcp
CMD node app --port 5000
