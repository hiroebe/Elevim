import { Neovim } from 'neovim';
import { Item, Source } from '../finder';

interface LoclistItem extends Item {
    bufnr: number;
    line: number;
    col: number;
}

export default class Loclist implements Source {
    public header: string = 'Location List';
    public items: LoclistItem[];

    public async onStart(args: string[], nvimClient: Neovim) {
        let results = await nvimClient.eval('getloclist(0)') as string[];
        if (results.length === 0) {
            results = await nvimClient.eval('getqflist()') as string[];
        }
        this.items = results.map((result: any) => ({
            label: result['text'],
            bufnr: result['bufnr'],
            line: result['lnum'],
            col: result['col'],
        }));
        return;
    }

    public doAction(selected: number, nvimClient: Neovim): string[] {
        const item = this.items[selected];
        nvimClient.command('buffer ' + item.bufnr);
        nvimClient.callFunction('cursor', [item.line, item.col]);
        return [];
    }
}
