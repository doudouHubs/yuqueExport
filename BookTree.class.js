const { readFile } = require('node:fs/promises');
const yaml = require('js-yaml');

/**
 * @description: 书本目录树
 * @return {*}
 */
class BookTree {
    bookJson = null

    async initilize(metaPath) {
        const metaFile = JSON.parse(await readFile(metaPath, { encoding: 'utf-8' }));
        const { book, docs } = JSON.parse(metaFile.meta);
        this.bookJson = yaml.load(book.tocYml);
    }

    /**
     * @description: 通过文件id获取文件的实际路径
     * @param {*} fileId
     * @return {*}
     */
    getFilePath(fileId) {
        let doc = this.bookJson.find(item => {
            return item.doc_id === fileId;
        })
        
        if (doc) {
            let filePath = this.getFolderRelPath(doc);
            if (doc.child_uuid) {
                filePath = `${filePath}/${doc.title}`
            }
            return filePath;
        }

        return '';
    }

    /**
     * @description: 获得文件夹的相对路径
     * @return {*}
     */
    getFolderRelPath(book) {
        let title = book.title.replace(/\/|\\/g, '-');
        let filePath = title;
        if (book.parent_uuid) {
            let pBook = this.bookJson.find(item => item.uuid === book.parent_uuid);
            filePath = `${this.getFolderRelPath(pBook)}/${filePath}`
        }
        return filePath
    }
}

module.exports = BookTree
