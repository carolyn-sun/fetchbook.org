import { getLogoForOS } from './src/logos.ts';
console.log("Aqua, macos", getLogoForOS("Aqua", "MacBookPro18,3", "macos").substring(0, 30));
console.log("Empty", getLogoForOS("").substring(0, 30));
