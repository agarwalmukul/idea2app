import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const SRC_APP_DIR = path.join(projectRoot, 'src', 'app');
const NEXT_DIR = path.join(projectRoot, '.next');

const BANNED_SEGMENT = '(auth)';
const BANNED_ENCODED_SEGMENT = '%28auth%29';

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

function run() {
  scanSourceRoutes();
  scanChunkFiles();

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
    console.error('\n❌ Webpack/chunky route-group regression guard failed.');
    for (const problem of problems) {
      console.error(`\n- ${problem.message}`);
      for (const detail of problem.details) {
        console.error(`  - ${detail}`);
      }
    }
    console.error(
      '\nPlease remove/avoid parenthesized auth route-groups like `(auth)` or encoded `%28auth%29` in app routes before committing.',
    );
    process.exit(1);
  }

  console.log('✅ Webpack/chunky route-group regression guard passed.');
}

run();
