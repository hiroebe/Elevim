import * as fs from 'fs';
import { Neovim } from 'neovim';
import * as path from 'path';
import { Item, Source } from '../finder';

interface FileItem extends Item {
    path: string;
    isDir: boolean;
}

export default class File implements Source {
    public header: string;
    public items: FileItem[];

    public async onStart(args: string[], nvimClient: Neovim) {
        const targetPath = args.length > 0 ? args[0] : await nvimClient.eval('getcwd()') as string;

        if (!fs.statSync(targetPath).isDirectory()) {
            return;
        }
        const filenames = fs.readdirSync(targetPath);
        this.items = filenames.map((name) => {
            const fullPath = path.join(targetPath, name);
            const isDir = fs.statSync(fullPath).isDirectory();
            return {
                label: isDir ? name + '/' : name,
                path: fullPath,
                isDir,
            };
        });
        this.items.push({
            label: '..',
            path: path.join(targetPath, '..'),
            isDir: true,
        });
        this.header = 'Files [' + targetPath + ']';
    }

    public doAction(selected: number, nvimClient: Neovim): string[] {
        const item = this.items[selected];
        if (item.isDir) {
            return ['file', item.path];
        }
        nvimClient.command('e ' + item.path);
        return [];
    }
}
