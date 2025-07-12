![npm version](https://img.shields.io/npm/v/typebuild)
![npm downloads](https://img.shields.io/npm/dw/typebuild)
![license](https://img.shields.io/npm/l/typebuild)

# TypeBuild 🛠

A powerful and lightweight build tool for modern TypeScript projects. Built with love, frustration, and the need to fix what most compilers leave broken. Before you start, make sure to install the TypeScript library. After all... a TypeScript tool doesn't really work without TypeScript 😅.

---

## ✨ Why I Made This

Honestly?  
I was *tired of compilers* that would happily transpile my TypeScript… but leave all my import paths broken because they didn't add .js extensions.  
I tried a bunch of tools. None of them really gave me what I needed — *a clean build with working import paths, static files, a preserved folder structure, and full control*.

Every time I built a project, I had to manually fix 30+ lines of imports, or the structure would break entirely, especially with relative paths.  
I thought: “If no one fixes this properly… I will.”  
And that’s how *TypeBuild* was born 💜

---

## 🚀 What TypeBuild Does

- ✅ *ESM Import Fixing* – adds .js to relative imports after build, so your code actually runs.
- ✅ *Static File Copying* – .env, config files, anything you want to ship with the build.
- ✅ *Optional Type Check* – If your tsconfig uses strict: true, it will run tsc --noEmit first.
- ✅ *Removes Type-Only Imports* – if you want, it can strip out type.ts imports from final files.
- ✅ *Progress Bars + Logs* – shows you exactly what’s going on, with colorful feedback.

---

## 📦 Installation


Global installation and use:
```bash
npm install -g typebuild
typebuild
```

Or use it once with npx:
```bash
npm install -D typebuild
npx typebuild
```

---

## 🧠 How to Use

Add this to your tsconfig.json:
```json
{
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "module": "ESNext",
    "target": "ES2022"
  },
  "typebuild": {
    "typeFileNames": ["typeFile.ts", "secondTypeFile.ts"],
    "staticFiles": [".env", "data"],
    "ignoredDirs": ["node_modules", ".git"],
    "indexFile": "index.js"
  }
}
```
> typeFileNames: names of files where you store your types (e.g. types.ts)

> staticFiles: files/folders to copy to outDir (e.g. .env, data)

> ignoredDirs: folders where types won't be searched (e.g. node_modules, .git)

> indexFile: name of the output main entry file (e.g. index.js)



Then run:

```bash
npx typebuild
```

Or set it up in your package.json:

```json
"scripts": {
  "build": "typebuild"
}
```


---

## 📝 What Makes It Special?

Unlike other tools that assume you’ll patch things later, TypeBuild does it right on the first go.
It respects your folder structure, fixes your imports, copies files, and lets you decide how strict you want to be.

It’s not meant to replace big build tools — it’s here to make them suck less.


---

# 🔮 Future Plans (Maybe 😅)

- TypeRun — A tiny runtime for TS apps

- TypeGUI — Visual representation of TS projects

- Typux OS — A TypeScript-friendly Linux distribution (no joke 😏, but a lot of years)



---

# Made with 💜 by [Wolvit](https://github.com/Wolvit)
Because sometimes, you gotta build your own tools to make the world less annoying. 🤘


---

# 📜 License

MIT — use it, fork it, break it, fix it. Have fun 💜

---

## 🔧 Contributing

Have ideas or found a bug?  
Feel free to open an [issue](https://github.com/Wolvit/typebuild/issues) or submit a PR — every bit helps 