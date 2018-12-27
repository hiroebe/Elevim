export function colorToHexString(color: number): string {
    return '#' + ('000000' + color.toString(16)).substr(-6);
}

export function shiftColor(color: string, rate: number): string {
    const colorInt = parseInt(color.slice(1), 16);
    let r = (colorInt >> 16) % 256;
    let g = (colorInt >> 8) % 256;
    let b = colorInt % 256;
    r = Math.floor(Math.min(Math.max(0, r * rate), 255));
    g = Math.floor(Math.min(Math.max(0, g * rate), 255));
    b = Math.floor(Math.min(Math.max(0, b * rate), 255));

    const newColor = (r << 16) + (g << 8) + b;
    return colorToHexString(newColor);
}
