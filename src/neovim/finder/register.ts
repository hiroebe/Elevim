import { Neovim } from 'neovim';
import { Item, Source } from '../finder';

interface RegisterItem extends Item {
    regname: string;
}

export default class Register implements Source {
    public header: string = 'Register';
    public items: RegisterItem[];

    public async onStart(args: string[], nvimClient: Neovim) {
        const regnames = [
            '"',
            '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
            'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j',
            'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't',
            'u', 'v', 'w', 'x', 'y', 'z',
            '-', '.', ':', '#', '%', '/', '=',
        ];
        this.items = [];
        for (const regname of regnames) {
            const reg = await nvimClient.eval("getreg('" + regname + "')") as string;
            if (reg === '') {
                continue;
            }
            const label = '"' + regname + '  '
                + reg.replace('\n', '\n    ');
            this.items.push({
                label,
                regname,
            });
        }
    }

    public doAction(selected: number, nvimClient: Neovim): string[] {
        const item = this.items[selected];
        nvimClient.command('normal! "' + item.regname + 'p');
        return [];
    }
}
