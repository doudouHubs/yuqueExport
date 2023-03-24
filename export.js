const { readdir, lstat, unlink, mkdir, rmdir } = require('node:fs/promises');
const fs = require('fs');
const path = require('path');
const log4js = require("log4js");
const BookLib = require('./BookLib.class.js');

class YuqueTranformer {
    dest = './docs'
    output = './output'
    bookLibs = [];

    constructor() {
        this.initilize();
    }

    async initilize() {
        await this.initFolder();

        let logger = log4js.getLogger("export");
        log4js.configure({
            appenders: { export: { type: "file", filename: `./Log/export.log` } },
            categories: { default: { appenders: ["export"], level: "all" } },
        });

        logger.info(`开始导出，初始化获取全部知识库目录`);
        this.bookLibs = await this.getAllBookLib();

        logger.info('批量导出文档为Markdown');
        for (const bookLib of this.bookLibs) {
            logger.info(`导出知识库：${bookLib.name}`);
            await bookLib.exportAllDocs();
        }
        logger.info('所有知识库导出完毕');
        console.log('所有知识库导出完毕');
    }

    async initFolder() {
        // 清空日志文件
        await deleteFolderRecursive('./Log');
        await deleteFolderRecursive(this.output);
        await mkdir(this.output);
    }

    /**
     * @description: 获取所有知识库
     * @return {*}
     */
    async getAllBookLib() {
        let bookLibs = []
        const files = await readdir(this.dest);

        for (const item of files) {
            let stat = await lstat(`${this.dest}/${item}`)
            if (stat.isDirectory() === true) {
                let bookLiber = new BookLib({
                    name: item,
                    dest: this.dest,
                    output: this.output
                })
                await bookLiber.initBookLib();
                bookLibs.push(bookLiber)
            }
        }
        return bookLibs
    }
}

async function deleteFolderRecursive(folderPath) {
    if (!fs.existsSync(folderPath)) return;

    let folders = await readdir(folderPath)
    for (const file of folders) {
        const curPath = path.join(folderPath, file);
        const info = await lstat(curPath)
        if (info.isDirectory()) {
            await deleteFolderRecursive(curPath);
        } else {
            await unlink(curPath);
        }
    }

    await rmdir(folderPath);
}

new YuqueTranformer()