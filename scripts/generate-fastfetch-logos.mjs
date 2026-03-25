import { execSync } from 'child_process';
import ansiToSvg from 'ansi-to-svg';
import fs from 'fs';
import path from 'path';

// ensure target directory exists
const targetDir = path.resolve('./public/fastfetch-logos');
if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
}

// Get logo list
console.log('Fetching logo list...');
const listOutput = execSync('fastfetch --list-logos').toString();
const lines = listOutput.split('\n');
const scriptLogos = [];

for (const line of lines) {
    // format: `1) "Name" "Alias"`
    const match = line.match(/^\d+\)\s+"([^"]+)"/);
    if (match) {
        scriptLogos.push(match[1]);
    }
}

console.log(`Found ${scriptLogos.length} logos. Generating SVGs...`);

for (const logo of scriptLogos) {
    try {
        const fetchCmd = `fastfetch --logo "${logo}" -s none --pipe false`;
        let stdout = execSync(fetchCmd, { env: { ...process.env, FORCE_COLOR: '1' } }).toString();
        
        // Clean cursor movements and clear screen sequences, keeping format (color) sequences
        stdout = stdout.replace(/\x1b\[(?![0-9;]*m)[0-9;A-HJKRsu=\?]*[a-zA-Z]/g, '');

        let svg = ansiToSvg(stdout);
        // Replace black background with transparent
        svg = svg.replace(/<rect[^>]*fill="#000000"[^>]*\/>/g, '');
        // Replace default text fill with currentColor
        svg = svg.replace(/<g fill="#D3D3D3">/g, '<g fill="currentColor">');

        // Clean filename just in case
        const filename = logo.replace(/[/\\?%*:|"<>]/g, '_') + '.svg';
        fs.writeFileSync(path.join(targetDir, filename), svg);
        process.stdout.write('.');
    } catch (e) {
        console.error(`\nFailed to fetch logo ${logo}:`, e.message);
    }
}
console.log('\n\nDone! All logos saved to public/fastfetch-logos/');
