import * as cp from 'child_process';
import { Neovim } from 'neovim';
import * as path from 'path';
import { Item, Source } from '../finder';

interface GrepItem extends Item {
    path: string;
    line: number;
    col: number;
}

export default class Grep implements Source {
    public header: string = 'Grep';
    public items: GrepItem[];

    public async onStart(args: string[], nvimClient: Neovim) {
        if (args.length < 2) {
            this.items = [];
            return;
        }
        const pattern = args[0];
        const cwd = args[1];
        if (pattern === '' || cwd === '') {
            this.items = [];
            return;
        }
        const output = cp.execSync('git grep -ni ' + pattern, { cwd }).toString();
        this.items = output.split('\n')
            .filter((label) => label !== '')
            .map((label) => {
                const split = label.split(':');
                const filename = split[0];
                const line = Number(split[1]);
                const col = split.slice(2).join('').indexOf(pattern) + 1;
                return {
                    label,
                    path: path.join(cwd, filename),
                    line,
                    col,
                };
            });
        return;
    }

    public doAction(selected: number, nvimClient: Neovim): string[] {
        const item = this.items[selected];
        nvimClient.command('e ' + item.path);
        nvimClient.callFunction('cursor', [item.line, item.col]);
        return [];
    }
}
