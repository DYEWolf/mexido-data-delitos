'use strict';

const fs = require('node:fs');
const path = require('node:path');

function fail(code) { const error = new Error(code); error.code = code; throw error; }

// A single new child of a canonical, private parent; reject Git ancestors and aliases.
function assertPrivateDestination(outputDir) {
  if (typeof outputDir !== 'string' || !path.isAbsolute(outputDir) ||
    path.normalize(outputDir) !== outputDir || path.basename(outputDir) === '.git') fail('invalid_input');
  const parentPath = path.dirname(outputDir);
  let parent;
  try {
    parent = fs.statSync(parentPath);
    if (fs.realpathSync(parentPath) !== parentPath) fail('invalid_input');
  } catch { fail('invalid_input'); }
  if (!parent.isDirectory() || (parent.mode & 0o077) !== 0) fail('private_parent_required');
  for (let current = parentPath; ; current = path.dirname(current)) {
    try { fs.lstatSync(path.join(current, '.git')); fail('repo_output_rejected'); }
    catch (error) { if (error.message === 'repo_output_rejected') throw error; if (error.code !== 'ENOENT') fail('invalid_input'); }
    if (path.dirname(current) === current) break;
  }
  return outputDir;
}

function assertNewDestination(outputDir) {
  assertPrivateDestination(outputDir);
  try { fs.lstatSync(outputDir); fail('output_exists'); }
  catch (error) { if (error.message === 'output_exists') throw error; if (error.code !== 'ENOENT') fail('invalid_input'); }
}

module.exports = Object.freeze({ assertPrivateDestination, assertNewDestination });
