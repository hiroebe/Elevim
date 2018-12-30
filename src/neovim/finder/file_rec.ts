import * as cp from 'child_process';
import { Neovim } from 'neovim';
import { Item, Source } from '../finder';

export default class FileRec implements Source {
    public header: string;
    public items: Item[];

    public async onStart(args: string[], nvimClient: Neovim) {
        const cwd = await nvimClient.eval('getcwd()') as string;
        const output = cp.execSync('git ls-files', { cwd }).toString();
        this.items = output.split('\n')
            .filter((label) => label !== '')
            .map((label) => ({ label }));
        this.header = 'Files Recursive [' + cwd + ']';
    }

    public doAction(selected: number, nvimClient: Neovim): string[] {
        nvimClient.command('e ' + this.items[selected].label);
        return [];
    }
}
