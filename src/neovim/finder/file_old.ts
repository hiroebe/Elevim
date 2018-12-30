import { Neovim } from 'neovim';
import { Item, Source } from '../finder';

export default class FileOld implements Source {
    public header: string = 'Recent Files';
    public items: Item[];

    public async onStart(args: string[], nvimClient: Neovim) {
        await nvimClient.command('wviminfo|rviminfo!');
        const labels = await nvimClient.eval('filter(copy(v:oldfiles), "filereadable(v:val)")') as string[];
        this.items = labels.map((label) => ({ label }));
    }

    public doAction(selected: number, nvimClient: Neovim): string[] {
        nvimClient.command('e ' + this.items[selected].label);
        return [];
    }
}
