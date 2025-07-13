#!/usr/bin/env node

import { execSync } from 'child_process';
import { build } from 'esbuild';
import fs from 'fs-extra';
import { parse } from 'jsonc-parser';
import * as path from 'path';
import readline from 'readline';

const logDir = path.join(process.cwd(), 'build', 'logs');
fs.ensureDirSync(logDir);
const logFile = path.join(logDir, `build.log`)

const rawConfig = fs.readFileSync('./tsconfig.json', 'utf8') || null;
const config = parse(rawConfig);
const options = config.typebuild || null;
const typeFileNames = options?.typeFileNames || [];
const staticFiles = options?.staticFiles || [];
const outDir = config.compilerOptions?.outDir || './dist';
const cleanedOutDir = outDir.replace(/^\.\//, '');
const rootDir = config.compilerOptions?.rootDir || process.cwd();
const ignoredDirs = !options?.ignoredDirs || options?.ignoredDirs.length == 0 ? ['.git', 'node_modules', cleanedOutDir] : options?.ignoredDirs;
let indexFile = options?.indexFile || 'index.js';

function checkTypes() {
    if (!config.compilerOptions?.strict) return;
    try {
        console.log('\x1b[33m%s\x1b[0m', `Checking TypeScript types (strict mode)...`);
        execSync('npx tsc --noEmit', { stdio: 'inherit' });
        console.log('\x1b[32m%s\x1b[0m', `✅ Success: Types check passed!\n`);
    } catch (err) {
        console.error('\x1b[31m%s\x1b[0m', `❌ Error: Types check failed. Fix your TypeScript errors before building.\n${err}\n`);
        process.exit(1);
    }
}

function logBuild(color = '', message) {
    if (color.includes("[31")) {
        console.error(color, message)
    } else if (color.includes("[33")) {
        console.warn(color, message);
    } else {
        console.log(color, message)
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    let logContent = "";
    if (message.includes("BUILD START")) logContent = message;
    else {
        logContent = `[${timestamp}] - ${message}`;
    }
    fs.appendFileSync(logFile, logContent.trim() + "\n", 'utf-8');
}

function promptUser(question) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    return new Promise((resolve) => {
        rl.question((question), (answer) => {
            rl.close();
            resolve((answer.trim().toLowerCase()) || 'b');
        });
    });
}
checkTypes();
logBuild('', '===BUILD START===\n');

if (!fs.existsSync('./tsconfig.json')) {
    logBuild('\x1b[31m%s\x1b[0m', "❌ Error: tsconfig.json not found! Run this script from the root directory of your project!");
    console.log('\x1b[33m%s\x1b[0m', 'You can view log in ./build/logs');
    logBuild('', '\n===BUILD END===\n');
    process.exit(1);
}

if (!fs.existsSync('./package.json')) {
    logBuild('\x1b[31m%s\x1b[0m', "❌ Error: package.json not found! Run this script from the root directory of your project!");
    console.log('\x1b[33m%s\x1b[0m', 'You can view log in ./build/logs');
    logBuild('', '\n===BUILD END===\n');
    process.exit(1);
}

const raWpkg = fs.readFileSync('./package.json', 'utf8');
const pkg = parse(raWpkg);

if (pkg.type !== 'module') {
    logBuild('\x1b[31m%s\x1b[0m', "❌ Error: package.json must have 'type' set to 'module' for ES module support!");
    console.log('\x1b[33m%s\x1b[0m', 'You can view log in ./build/logs');
    logBuild('', '\n===BUILD END===\n');
    process.exit(1);
}



if (!options) {
    logBuild('\x1b[33m%s\x1b[0m', `⚠️  Warn: You haven't set any typebuild options in tsconfig.json! Everything will be defaulted to the following values:\n    - rootDir: current working directory\n    - outDir: ./dist\n    - ignoredDirs: ['.git', 'node_modules', ${cleanedOutDir}]\n    - indexFile: index.js\n (Type files imports and static files will be ignored if not specified in tsconfig.json with 'typebuild' key)`);
} else {
    if (!options.ignoredDirs || options.ignoredDirs.length === 0) {
        logBuild('\x1b[33m%s\x1b[0m', `⚠️  Warn: No ignored directories found in tsconfig.json! Defaulted to ['.git', 'node_modules', ${cleanedOutDir}]\n`);
    }

    if (!indexFile) {
        logBuild('\x1b[33m%s\x1b[0m', "⚠️  Warn: No index name found in tsconfig.json! Defaulted to 'index.js'\n");
    }
    if (!config.compilerOptions?.rootDir) {
        logBuild('\x1b[33m%s\x1b[0m', "⚠️  Warn: No root directory found in tsconfig.json! Defaulted to current working directory\n");
    }
    if (!config.compilerOptions?.outDir) {
        logBuild('\x1b[33m%s\x1b[0m', "⚠️  Warn: No output directory found in tsconfig.json! Defaulted to './dist'\n");
    }
    if (!typeFileNames || typeFileNames.length === 0) {
        logBuild('\x1b[33m%s\x1b[0m', "⚠️  Warn: No type files found in tsconfig.json! Type files imports will be ignored\n");
    }
    if (!staticFiles || staticFiles.length === 0) {
        logBuild('\x1b[33m%s\x1b[0m', "⚠️  Warn: No static files found in tsconfig.json! Static files will be ignored\n");
    }
}






function findIndexFile(dir, indexFile) {
    const files = fs.readdirSync(dir, { withFileTypes: true });

    for (const file of files) {
        const fullPath = path.join(dir, file.name);

        if (file.isDirectory()) {
            const found = findIndexFile(fullPath, indexFile);
            if (found) return found;
        } else if (file.name.toLocaleLowerCase() === indexFile.toLocaleLowerCase()) {
            return path.relative(outDir, fullPath).replace(/\\/g, '/');
        }
    }

    return null;
}



if (!ignoredDirs.includes('.git')) {
    ignoredDirs.push('.git');
}
if (!ignoredDirs.includes('node_modules')) {
    ignoredDirs.push('node_modules');
}
if (!ignoredDirs.includes(cleanedOutDir)) {
    ignoredDirs.push(cleanedOutDir);
}

function getAllEntryPoints(dir) {
    logBuild('\x1b[33m%s\x1b[0m', `Scanning file or directory: ${dir}`);
    const entries = [];
    let stats;

    try {
        stats = fs.statSync(dir);
    } catch (err) {
        logBuild('\x1b[31m%s\x1b[0m', `❌ Error: accessing file or directory ${dir}:`, err);
        return entries;
    }

    if (stats.isDirectory()) {
        logBuild('\x1b[32m%s\x1b[0m', `✅ Success: Found directory: ${dir}`);

        const files = fs.readdirSync(dir);
        for (const file of files) {
            const fullPath = path.join(dir, file);

            if (ignoredDirs.includes(file)) {
                logBuild('\x1b[33m%s\x1b[0m', `Skipping ignored file or directory: ${fullPath}`);
                continue;
            }

            entries.push(...getAllEntryPoints(fullPath));
        }
    } else if (dir.endsWith('.ts')) {
        logBuild('\x1b[32m%s\x1b[0m', `✅ Success: Found TypeScript file: ${dir}`);
        entries.push(dir);
    } else {
        logBuild('\x1b[33m%s\x1b[0m', `Skipping non-TypeScript file: ${dir}`);
    }
    return entries;
}
function copyStaticFiles(staticFiles, rootDir, outDir) {
    const total = staticFiles.length;
    let current = 0;
    for (const file of staticFiles) {
        const srcPath = path.join(rootDir, file);
        const destPath = path.join(outDir, file);
        current++;
        updateProgressBar(current, total, 'Static files progress: ')
        if (!fs.existsSync(srcPath)) {
            logBuild('\x1b[33m%s\x1b[0m', `⚠️  Warn: Static file ${srcPath} does not exist! Skipping.`);
            continue;
        }

        if (fs.existsSync(destPath)) {
            fs.removeSync(destPath);
            logBuild('\x1b[32m%s\x1b[0m', `\n🗑️  ✅ Success: Removed existing static file: ${destPath}`);
        }

        fs.copySync(srcPath, destPath, { overwrite: true, errorsOnExist: false });
        logBuild('\x1b[32m%s\x1b[0m', `✅ Success: Copied static file: ${srcPath} to ${destPath}`);
    }
    endProressBar();
    logBuild('\x1b[32m%s\x1b[0m', `✅ Success: Done copying static files!`);


}

function updateProgressBar(current, total, prefix = '') {
    let barLength = 40;
    let progress = Math.round((current / total) * barLength);

    if (progress > barLength) progress = barLength;
    if (progress < 0) progress = 0;
    const remaining = barLength - progress;
    const percent = Math.round((current / total) * 100, 100);

    const bar = '█'.repeat(progress) + '░'.repeat(remaining);
    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);
    process.stdout.write(`${prefix} [${bar}] ${percent}% (${current}/${total})\n`);
}

function endProressBar() {
    process.stdout.write('\n')
}
function getAllJS(dir, ignoredDirs) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    let jsFiles = [];

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (ignoredDirs.includes(entry.name)) continue;

        if (entry.isDirectory()) {
            jsFiles = jsFiles.concat(getAllJS(fullPath, ignoredDirs));
        } else if (path.extname(entry.name) === '.js') {
            jsFiles.push(fullPath);
        }
    }
    return jsFiles;
}

function fixImportPaths(dir) {
    const jsFiles = getAllJS(dir, ignoredDirs);
    const total = jsFiles.length;
    let current = 0;

    for (const filePath of jsFiles) {
        let content = fs.readFileSync(filePath, 'utf-8');
        const originalContent = content;

        content = content.replace(/(import\s+[^"']*?\s+from\s+['"])(\.{1,2}\/[^'"]+?)(['"])/g, (match, p1, p2, p3) => {
            if (p2.endsWith('.js') || p2.endsWith('.json')) return match;

            return `${p1}${p2}.js${p3}`;
        });

        if (content !== originalContent) {
            fs.writeFileSync(filePath, content, 'utf-8');
            logBuild('\x1b[32m%s\x1b[0m', `✅ Success: Fixed import paths in ${filePath}`);
        }

        current++;
        updateProgressBar(current, total, 'Fixing import paths: ');
    }

    endProressBar();
    logBuild('\x1b[32m%s\x1b[0m', `✅ Success: Fixed all import paths in JavaScript files!\n`);


}

function removeTypesImports(dir, fileNames) {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    const validFiles = files.filter(file => !ignoredDirs.includes(file.name) && (file.isDirectory() || path.extname(file.name) === '.js'));
    const total = Math.max(1, validFiles.length);
    let current = 0;
    for (const file of validFiles) {
        current++;
        const fullPath = path.join(dir, file.name);

        if (file.isDirectory()) {
            removeTypesImports(fullPath, fileNames);
        } else if (path.extname(fullPath) === '.js') {
            let content = fs.readFileSync(fullPath, 'utf8');

            const originalContent = content;
            for (const fileName of fileNames) {
                const base = path.basename(fileName, path.extname(fileName)); // např. 'types.ts' → 'types'

                const importRegex = new RegExp(
                    `^\\s*import(?:\\s+[^'"]*?)?\\s*from\\s*['"][^'"]*\\b${base}\\b[^'"]*['"]\\s*;?\\s*$|^\\s*import\\s+['"][^'"]*\\b${base}\\b[^'"]*['"]\\s*;?\\s*$`,
                    'gm'
                );

                content = content.replace(importRegex, '');
            }



            if (content !== originalContent) {
                fs.writeFileSync(fullPath, content, 'utf8');
                logBuild('\x1b[32m%s\x1b[0m', `🗑️✅ Success: Removed types import in: ${fullPath}`);
            }
        }

        updateProgressBar(current, total, 'Checking type imports: ');
    }
    endProressBar();
    logBuild('\x1b[32m%s\x1b[0m', `🗑️  ✅ Success: Checked all type imports in ${dir}`);
}



const startTime = Date.now();
logBuild('\x1b[32m%s\x1b[0m', '🚀 typebuild Build Started...\n');
const entryPoints = getAllEntryPoints(rootDir);
build({
    entryPoints,
    outdir: outDir,
    bundle: false,
    format: 'esm',
    target: 'es2023',
    platform: 'node',
    outExtension: { '.js': '.js' },
    sourcemap: true,
    charset: 'utf8'
}).then(async () => {
    fixImportPaths(outDir);
    !typeFileNames || typeFileNames.length == 0 ? logBuild('\x1b[33m%s\x1b[0m', "⚠️  Warn: You didn't specify the type files") : removeTypesImports(outDir, typeFileNames);
    !staticFiles || staticFiles.length == 0 ? logBuild('\x1b[33m%s\x1b[0m', "⚠️  Warn: You didn't specify the static files") : copyStaticFiles(staticFiles, rootDir, outDir);



    if (!indexFile.toLowerCase().endsWith('.js')) {
        indexFile += '.js';
    }



    const indexPath = options?.indexPath || findIndexFile(outDir, indexFile) || null;

    if (indexPath) {
        const startScript = path.posix.join(outDir, indexPath);
        pkg.scripts.start = `node ${startScript}`;
        logBuild('\x1b[32m%s\x1b[0m', `✅ Success: Found index file: ${startScript}\n`);
        fs.writeFileSync('./package.json', JSON.stringify(pkg, null, 2), 'utf8');
    } else {
        logBuild('\x1b[33m%s\x1b[0m', '⚠️  Warn: No index file found! You have to manually set the start script in package.json');
    }
    if (pkg.typebuild && pkg.typebuild.askedUser) {
        logBuild('\x1b[33m%s\x1b[0m', 'You have already answered the question about running TypeBuild automatically! Skipping...');
    } else {
        const choice = await promptUser('\x1b[36m \n⚙️  Do you want to run TypeBuild automatically? [Y] - All [S] - Prestart script [B - Default] - Build only [N] - None:  \x1b[0m');

        if (!pkg.scripts) pkg.scripts = {};

        switch (choice) {
            case 'y':
                pkg.scripts.prestart = 'npx typebuild';
                pkg.scripts.build = 'npx typebuild';
                logBuild('\x1b[32m%s\x1b[0m', '✅ Success: Added prestart and build scripts to package.json!');
                break;
            case 's':
                pkg.scripts.prestart = 'npx typebuild';
                logBuild('\x1b[32m%s\x1b[0m', '✅ Success: Added prestart script to package.json!');
                break;
            case 'b':
                pkg.scripts.build = 'npx typebuild';
                logBuild('\x1b[32m%s\x1b[0m', '✅ Success: Added build script to package.json!');
                break;
            case 'n':
                logBuild('\x1b[33m%s\x1b[0m', '⚠️  Warn: No scripts added to package.json!');
                break;
            default:
                logBuild('\x1b[33m%s\x1b[0m', '⚠️  Warn: Invalid choice! No scripts added to package.json!');
                break;
        }
        pkg.typebuild = pkg.typebuild || {};
        pkg.typebuild.askedUser = true;
        fs.writeFileSync('./package.json', JSON.stringify(pkg, null, 2), 'utf8');
    }

    const endTime = Date.now();
    const duration = endTime - startTime
    logBuild('\x1b[32m%s\x1b[0m', `✅ Success: Build completed successfully in duration ${duration} ms.`);
    console.log('\x1b[33m%s\x1b[0m', 'You can view log in ./build/logs');
    logBuild('', '\n===BUILD END===\n');


}).catch((error) => {
    logBuild('\x1b[31m%s\x1b[0m', '❌ Error: Build failed:', error);
    console.log('\x1b[33m%s\x1b[0m', 'You can view log in ./build/logs');
    logBuild('', '\n===BUILD END===\n');
});