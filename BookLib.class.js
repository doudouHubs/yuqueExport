const log4js = require("log4js");
const { readdir, readFile, appendFile, writeFile, mkdir } = require('node:fs/promises');
const TurndownService = require('turndown')
const { gfm, tables, strikethrough } = require('joplin-turndown-plugin-gfm')
const fs = require('fs');
const os = require('os');
const path = require('path')
const BookTree = require('./BookTree.class');

var turndownService = new TurndownService()
turndownService.use(gfm)
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
    dest = './docs';
    output = './output';
    // 链接类型文档
    LinkFile = '未导出-链接文档.md';
    // 未导出文档
    notExport = '未导出文档列表.md'

    constructor(options = { name: '', dest: '', output: '' }) {
        this.initilize(options);
    }

    initilize(options) {
        for (const key in options) {
            this[key] = options[key]
        };

        this.logger = log4js.getLogger('export');
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
            if (book.type === 'LINK') {
                await this.writeToLinkFile(book)
            }

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
            await this.writeToNotExportFile(data.doc)
            return
        }
        // 转换为 Markdown
        let markdown = turndownService.turndown(data.doc.body || data.doc.body_draft);
        let mdName = data.doc.title.replace(/\/|\\/g, '-');
        let fileMd = path.join(`${this.output}/${dir}`, this.bookTree.getFilePath(data.doc.id) || mdName);
        // 去除多出来的斜杠\
        markdown = markdown.replace(/\\/g, '')
        // 写入 Markdown 文件
        writeFile(fileMd + '.md', markdown);

        this.logger.info('导出文档：' + `${fileJson} => ${fileMd}.md`);
    }

    /**
     * @description: 写入链接文档
     */
    writeToLinkFile(doc) {
        let content = `[LINK] ${doc.title}：${doc.url} \n\n`
        return appendFile(`${this.output}/${this.name}/${this.LinkFile}`, content)
    }

    /**
     * @description: 写入未导出文档
     */
    writeToNotExportFile(doc) {
        let content = `[${doc.type}] ${doc.title} \n\n`;
        return appendFile(`${this.output}/${this.name}/${this.notExport}`, content)
    }
}

module.exports = BookLib