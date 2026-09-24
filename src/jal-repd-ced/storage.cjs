'use strict';

const fs = require('node:fs');
const path = require('node:path');

function findGitWorktreeRoot(startDirectory = process.cwd(), fileSystem = fs) {
  let current = path.resolve(startDirectory);
  for (;;) {
    if (fileSystem.existsSync(path.join(current, '.git'))) return current;
    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

function isInsideDirectory(candidate, directory) {
  const relative = path.relative(path.resolve(directory), path.resolve(candidate));
  return relative === '' || (!!relative && !relative.startsWith('..') && !path.isAbsolute(relative));
}

function storageError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function assertPrivateOutputDirectory(outputDirectory, options = {}) {
  const fileSystem = options.fs || fs;
  const resolvedOutputDirectory = path.resolve(outputDirectory);
  const worktreeRoot = options.worktreeRoot === undefined
    ? findGitWorktreeRoot(options.cwd || process.cwd(), fileSystem)
    : options.worktreeRoot;

  if (!options.allowRepoOutputForTests && worktreeRoot && isInsideDirectory(resolvedOutputDirectory, worktreeRoot)) {
    throw storageError(
      'repo_output_rejected',
      'Output directory must be outside the Git worktree unless allowRepoOutputForTests is set.',
    );
  }

  return { outputDirectory: resolvedOutputDirectory, worktreeRoot };
}

function mkdirp(directory, fileSystem = fs) {
  fileSystem.mkdirSync(directory, { recursive: true });
}

function atomicWriteFile(filePath, contents, fileSystem = fs) {
  mkdirp(path.dirname(filePath), fileSystem);
  const temporaryPath = path.join(
    path.dirname(filePath),
    `.${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`,
  );
  fileSystem.writeFileSync(temporaryPath, contents, 'utf8');
  fileSystem.renameSync(temporaryPath, filePath);
}

function writeJson(filePath, value, fileSystem = fs) {
  atomicWriteFile(filePath, `${JSON.stringify(value, null, 2)}\n`, fileSystem);
}

function writeNdjson(filePath, records, fileSystem = fs) {
  const body = records.length === 0 ? '' : `${records.map((record) => JSON.stringify(record)).join('\n')}\n`;
  atomicWriteFile(filePath, body, fileSystem);
}

function readJsonIfExists(filePath, fileSystem = fs) {
  if (!fileSystem.existsSync(filePath)) return null;
  return JSON.parse(fileSystem.readFileSync(filePath, 'utf8'));
}

function readNdjsonIfExists(filePath, fileSystem = fs) {
  if (!fileSystem.existsSync(filePath)) return [];
  const contents = fileSystem.readFileSync(filePath, 'utf8').trim();
  if (!contents) return [];
  return contents.split('\n').map((line) => JSON.parse(line));
}

function createStorage(outputDirectory, options = {}) {
  const fileSystem = options.fs || fs;
  const assertion = assertPrivateOutputDirectory(outputDirectory, options);
  mkdirp(assertion.outputDirectory, fileSystem);

  function resolve(name) {
    return path.join(assertion.outputDirectory, name);
  }

  return {
    outputDirectory: assertion.outputDirectory,
    worktreeRoot: assertion.worktreeRoot,
    path: resolve,
    readJson(name) { return readJsonIfExists(resolve(name), fileSystem); },
    readNdjson(name) { return readNdjsonIfExists(resolve(name), fileSystem); },
    writeJson(name, value) { writeJson(resolve(name), value, fileSystem); },
    writeNdjson(name, records) { writeNdjson(resolve(name), records, fileSystem); },
  };
}

module.exports = Object.freeze({
  assertPrivateOutputDirectory,
  atomicWriteFile,
  createStorage,
  findGitWorktreeRoot,
  isInsideDirectory,
  readJsonIfExists,
  readNdjsonIfExists,
  writeJson,
  writeNdjson,
});
