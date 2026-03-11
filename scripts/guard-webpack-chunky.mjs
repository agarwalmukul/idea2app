import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const SRC_APP_DIR = path.join(projectRoot, 'src', 'app');
const NEXT_DIR = path.join(projectRoot, '.next');
const CHECK_DEV_VENDOR = process.env.CHECK_DEV_VENDOR === '1';

const BANNED_SEGMENT = '(auth)';
const BANNED_ENCODED_SEGMENT = '%28auth%29';
const GUARD_SAMPLE_LIMIT = 12;

function addProblem(message, details = []) {
  problems.push({ message, details });
}

const problems = [];

function findFiles(dir, cb) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(projectRoot, fullPath);

    if (entry.isDirectory()) {
      findFiles(fullPath, cb);
    } else if (entry.isFile()) {
      cb(fullPath, relativePath);
    }
  }
}

function scanSourceRoutes() {
  if (!fs.existsSync(SRC_APP_DIR)) {
    return;
  }

  findFiles(SRC_APP_DIR, (_fullPath, relativePath) => {
    if (
      relativePath.includes(`(${BANNED_SEGMENT})`) ||
      relativePath.toLowerCase().includes(BANNED_ENCODED_SEGMENT)
    ) {
      addProblem('Route group still present under src/app', [relativePath]);
    }
  });
}

function scanNestedString(value, callback, pathTrace = []) {
  if (typeof value === 'string') {
    callback(value, pathTrace.join('.'));
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      scanNestedString(item, callback, [...pathTrace, `[${index}]`]),
    );
    return;
  }

  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      scanNestedString(child, callback, [...pathTrace, key]);
    }
  }
}

function scanManifest(filePath, name) {
  if (!fs.existsSync(filePath)) return;

  const raw = fs.readFileSync(filePath, 'utf8');
  const lower = raw.toLowerCase();

  const hitSimple = raw.includes(BANNED_SEGMENT);
  const hitEncoded = lower.includes(BANNED_ENCODED_SEGMENT);

  if (hitSimple || hitEncoded) {
    const traces = [];
    try {
      const data = JSON.parse(raw);
      scanNestedString(data, (value, keyPath) => {
        if (
          value.includes(BANNED_SEGMENT) ||
          value.toLowerCase().includes(BANNED_ENCODED_SEGMENT)
        ) {
          traces.push(`${keyPath}: ${value}`);
        }
      });
    } catch {
      traces.push('JSON parse failed; raw text match only.');
    }

    addProblem(`Build manifest contains disallowed route segment (${name})`, traces);
  }
}

function scanChunkFiles() {
  if (!fs.existsSync(NEXT_DIR)) return;
  const chunkDir = path.join(NEXT_DIR, 'static', 'chunks');
  if (!fs.existsSync(chunkDir)) return;

  findFiles(chunkDir, (_fullPath, relativePath) => {
    const fileName = path.basename(relativePath);
    const lower = fileName.toLowerCase();
    if (
      fileName.includes(BANNED_SEGMENT) ||
      lower.includes(BANNED_ENCODED_SEGMENT)
    ) {
      addProblem('Build chunk filename still contains disallowed auth route-group marker', [
        relativePath,
      ]);
    }
  });
}

function scanDevWebpackVendorChunks() {
  if (!fs.existsSync(NEXT_DIR)) return;

  const scans = [
    {
      dir: path.join(NEXT_DIR, 'dev', 'server'),
      vendorDir: path.join(NEXT_DIR, 'dev', 'server', 'vendor-chunks'),
    },
  ];

  const seen = new Set();

  for (const { dir, vendorDir } of scans) {
    if (!fs.existsSync(dir)) continue;

    let missingCount = 0;
    const sample = [];

    const files = [];
    findFiles(dir, (fullPath, relativePath) => {
      if (fullPath.endsWith('.js')) {
        files.push({ fullPath, relativePath });
      }
    });

    for (const { fullPath, relativePath } of files) {
      const raw = fs.readFileSync(fullPath, 'utf8');
      const vendorChunkRegex = /['"](?:\.\/)?vendor-chunks\/([^'"\s,\)\]]+)['"]/g;
      let match;

      while ((match = vendorChunkRegex.exec(raw)) !== null) {
        const vendorFile = match[1];
        const resolved = path.join(vendorDir, `${vendorFile}.js`);

        if (seen.has(resolved)) continue;
        seen.add(resolved);

        if (!fs.existsSync(vendorDir) || !fs.existsSync(resolved)) {
          missingCount++;
          if (sample.length < GUARD_SAMPLE_LIMIT) {
            sample.push(`${relativePath} -> vendor-chunks/${vendorFile}`);
          }
        }
      }
    }

    if (missingCount > 0) {
      sample.push(`... ${missingCount - Math.min(GUARD_SAMPLE_LIMIT, missingCount)} additional missing vendor-chunk references (truncated)`);
      addProblem(
        `Missing webpack vendor chunk artifacts in ${path.relative(projectRoot, vendorDir)}.`,
        sample,
      );
    }
  }
}

function run() {
  scanSourceRoutes();
  scanChunkFiles();

  if (CHECK_DEV_VENDOR) {
    scanDevWebpackVendorChunks();
  }

  const manifests = [
    'build-manifest.json',
    'app-paths-manifest.json',
    'app-path-routes-manifest.json',
    'prerender-manifest.json',
    'required-server-files.json',
    'routes-manifest.json',
    'server/app-path-manifest.json',
  ];

  for (const manifestName of manifests) {
    scanManifest(path.join(NEXT_DIR, manifestName), manifestName);
  }

  if (problems.length > 0) {
    console.error('\n❌ Webpack/chunky+vendor regression guard failed.');
    for (const problem of problems) {
      console.error(`\n- ${problem.message}`);
      for (const detail of problem.details) {
        console.error(`  - ${detail}`);
      }
    }

    console.error(
      '\nFix suggestions:\n' +
        '- Rebuild after clearing dev artifacts when this happens: `rm -rf .next && npm run dev -- --webpack`\n' +
        '- Ensure full compile completes before opening app routes.\n' +
        '- Keep auth routes flattened (no `(auth)` folders) to avoid chunk path encoding regressions.',
    );
    process.exit(1);
  }

  console.log('✅ Webpack/chunky+vendor regression guard passed.');
}

run();
