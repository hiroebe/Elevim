import { Color } from './neovim/store';

export function intToColor(i: number): Color {
    const r = (i >> 16) % 256;
    const g = (i >> 8) % 256;
    const b = i % 256;
    return {r, g, b};
}

export function colorToCSS(color: Color, opacity: number = 1): string {
    return 'rgba(' + color.r + ', ' + color.g + ', ' + color.b + ', ' + opacity + ')';
}

export function shiftColor(color: Color, rate: number): Color {
    const r = Math.floor(Math.min(Math.max(0, color.r * rate), 255));
    const g = Math.floor(Math.min(Math.max(0, color.g * rate), 255));
    const b = Math.floor(Math.min(Math.max(0, color.b * rate), 255));
    return {r, g, b};
}
