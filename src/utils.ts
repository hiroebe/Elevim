export function colorToHexString(color: number): string {
    return '#' + ('000000' + color.toString(16)).substr(-6);
}
