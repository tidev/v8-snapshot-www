import { fastify } from 'fastify';
import { fastifyStatic } from '@fastify/static';
import { fileURLToPath } from 'node:url';
import ejs from 'ejs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { $ } from 'execa';
import { rimraf } from 'rimraf';
import { promisify } from 'node:util';

const app = fastify();

app.register(fastifyStatic, {
	root: fileURLToPath(new URL('../static', import.meta.url))
});

app.post('/gen', async (request, reply) => {
	if (request.headers['content-type'] !== 'application/json') {
		return await reply.code(400).send('Invalid content type');
	}

	const payload = request.body;

	if (!payload || !payload.v8 || typeof payload.v8 !== 'string' || !payload.script || typeof payload.script !== 'string') {
		return await reply.code(400).send('Invalid JSON');
	}

	const v8TargetVersion = payload.v8;
	const v8TargetMode = 'release';
	const androidDir = path.join(os.tmpdir(), 'ti-android', v8TargetVersion, v8TargetMode);
	const v8LibDirectory = path.join(androidDir, 'libs');
	const tmp = path.join(os.tmpdir(), `ti-v8-${Math.floor(Math.random() * 1e6)}`);

	try {
		await fs.mkdir(tmp, { recursive: true });
		await fs.mkdir(androidDir, { recursive: true });

		const startupPath = path.join(tmp, 'startup.js');
		await fs.writeFile(startupPath, `this._startSnapshot = global => { ${payload.script} };`, 'utf-8');

		if (!existsSync(v8LibDirectory)) {
			const v8ArchiveFileName = `libv8-${v8TargetVersion}-${v8TargetMode}.tar.bz2`;
			const downloadedFile = path.join(tmp, v8ArchiveFileName);
			const downloadUrl = `https://github.com/tidev/v8_titanium/releases/download/v${v8TargetVersion}/${v8ArchiveFileName}`;
			// console.log(`Downloading ${downloadUrl} to ${downloadedFile}`);
			await $`curl -L -o ${downloadedFile} ${downloadUrl}`;
			// console.log(`Extracting ${downloadedFile}`);
			await $`tar -xf ${downloadedFile} -C ${androidDir}`;
		}

		const archs = (await fs.readdir(v8LibDirectory, { withFileTypes: true }))
			.filter(entry => entry.isDirectory())
			.map(entry => entry.name);

		// console.log(`Found architectures ${archs.join(', ')}`);

		const blobs = {};

		// Generate snapshots
		for (const arch of archs) {
			const mksnapshotPath = path.join(v8LibDirectory, arch, 'mksnapshot');
			const blobPath = path.join(v8LibDirectory, arch, 'blob.bin');
			const embeddedPath = path.join(v8LibDirectory, arch, 'embedded.S');

			// Delete existing snapshot blob
			try {
				await fs.unlink(blobPath);
			} catch {
				// Do nothing...
			}

			// console.log(`Generating snapshot blob for ${arch}...`);

			const args = [
				`--startup_blob=${blobPath}`,
				startupPath
			];

			// Include embedded blob
			if (existsSync(embeddedPath)) {
				args.unshift(
					'--turbo_instruction_scheduling',
					`--embedded_src=${embeddedPath}`,
					'--embedded_variant=Default',
					'--no-native-code-counters',
				);
			}

			// Generate snapshot blob
			try {
				await fs.chmod(mksnapshotPath, 0o755);
				await $`${mksnapshotPath} ${args}`;
			} catch (e) {
				throw new Error(`Failed to generate snapshot: ${e.message}`);
			}

			// Load snapshot blob
			if (existsSync(blobPath)) {
				blobs[arch] = Buffer.from(await fs.readFile(blobPath, 'binary'), 'binary');
				// console.log(`Generated ${arch} snapshot blob`);
			}

			// Delete snapshot blob
			await fs.unlink(blobPath);
		}

		// Generate 'V8Snapshots.h' from template
		const template = await promisify(ejs.renderFile)('app/V8Snapshots.h.ejs', { blobs }, {});

		// console.log('Generated snapshot header');

		await reply.send(template);
	} catch (e) {
		await reply.code(500).send(e.message);
	} finally {
		await rimraf(tmp);
	}
})

const port = (() => {
	let i = process.argv.indexOf('--port');
	if (i !== -1) {
		i = parseInt(process.argv[i + 1], 10);
		return isNaN(i) ? null : i;
	}
})() || 3000;

await app.listen({
	port
});

console.log(`Server running at http://localhost:${port}`);
