# V8Snapshots.h Generator Site

This site generates a V8Snapshots.h file so that macOS and Windows machines can build the Titanium SDK. Generating the snapshot header requires a Linux machine.

Production: https://v8-snapshot.titaniumsdk.com/

## Dev

	pnpm i
	pnpm start

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Deploy

One time:

	git remote add dokku dokku@titaniumsdk.com:v8-snapshot.titaniumsdk.com

Then to release:

	git push dokku main
