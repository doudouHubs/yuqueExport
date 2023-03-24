const log4js = require("log4js");
const { readdir, readFile, writeFile, mkdir } = require('node:fs/promises');
const TurndownService = require('turndown')
const { gfm, tables, strikethrough } = require('joplin-turndown-plugin-gfm')
const fs = require('fs');
const path = require('path')
const BookTree = require('./BookTree.class');

var turndownService = new TurndownService()
// turndownService.use(gfm)
// Use the table and strikethrough plugins only
turndownService.use([tables, strikethrough])
/**
 * @description: 知识库对象，可获取包含书籍目录，课本信息
 * @return {*}
 */
class BookLib {
    // 目录树
    bookTree = null;
    logger = null

    // 书本列表
    booklist = [];
    name = '';
    dest = './docs'
    output = './output'

    constructor(options = { name: '', dest: '', output: '' }) {
        this.initilize(options);
    }

    initilize(options) {
        for (const key in options) {
            this[key] = options[key]
        };

        log4js.shutdown()
        log4js.configure({
            appenders: { booklib: { type: "file", filename: `./Log/${this.name}.log` } },
            categories: { default: { appenders: ["booklib"], level: "all" } },
        });
        this.logger = log4js.getLogger(this.name);
        this.logger.info(`导出知识库：${this.name}`);

    }


    /**
     * @description: 初始化知识库，获取所有书本
     * @return {*}
     */
    async initBookLib() {
        await this.initBookTree();
        await this.initBookFolder();
    }

    /**
     * @description: 初始化目录树
     * @return {*}
     */
    async initBookTree() {
        this.bookTree = new BookTree();
        await this.bookTree.initilize(`${this.dest}/${this.name}/$meta.json`);
    }

    /**
     * @description: 初始化所有知识库文件夹
     */
    async initBookFolder() {
        await mkdir(`${this.output}/${this.name}`);

        for (const book of this.bookTree.bookJson) {
            // 有子集的为文件夹
            if (!book.child_uuid) continue;

            let folderPath = `${this.output}/${this.name}/${this.bookTree.getFolderRelPath(book)}`;

            if (fs.existsSync(folderPath)) continue;

            await mkdir(folderPath);
        }
    }

    /**
     * @description: 导出所有文档
     * @return {*}
     */
    async exportAllDocs() {
        const files = await readdir(`${this.dest}/${this.name}`)

        for (const filename of files) {
            if (filename === '$meta.json') continue

            await this.html2md(filename);
        }
        this.logger.info('所有文档导出完毕');
    }

    // 转化知识库文档为md文档
    async html2md(filename) {
        let dir = this.name;
        let fileJson = `${this.dest}/${dir}/${filename}`;
        // 读取 JSON 文件
        const data = JSON.parse(await readFile(fileJson, { encoding: 'utf-8' }));
        if (data.doc.type !== 'Doc' && data.doc.type !== 'DOC') {

            return
        }
        // 转换为 Markdown
        let markdown = turndownService.turndown(data.doc.body || data.doc.body_draft);
        let mdName = data.doc.title.replace(/\/|\\/g, '-');
        let fileMd = path.join(`${this.output}/${dir}`, this.bookTree.getFilePath(data.doc.id) || mdName);
        // 写入 Markdown 文件
        writeFile(fileMd + '.md', markdown);

        this.logger.info('导出文档：' + `${fileJson} => ${fileMd}.md`);
    }
}

module.exports = BookLib