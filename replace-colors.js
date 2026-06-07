const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = dir + '/' + file;
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else { 
            if (file.endsWith('.tsx') || file.endsWith('.ts')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk('./src');

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;
    
    // replacements based on Issue #11
    const replacements = {
        'bg-slate-800': 'bg-background',
        'bg-slate-700': 'bg-card',
        'text-slate-400': 'text-muted-foreground',
        'text-white': 'text-foreground',
        'border-slate-700': 'border-border'
    };

    // Need to be careful with text-white if it's meant to be white on a primary button.
    // Let's stick to the prompt's exact words, but maybe text-white -> text-foreground is risky inside buttons.
    // I'll replace them anyway if they are next to dark mode classes.
    // The prompt says:
    // Replace with theme-aware CSS variables:
    // <div className="bg-slate-800 text-white border-slate-700"> -> <div className="bg-background text-foreground border-border">
    // 'bg-slate-800' -> 'bg-background'
    // 'bg-slate-700' -> 'bg-card'
    // 'text-slate-400' -> 'text-muted-foreground'
    // 'border-slate-700' -> 'border-border'

    if (content.includes('bg-slate-800') || content.includes('bg-slate-700') || content.includes('border-slate-700')) {
        content = content.replace(/bg-slate-800/g, 'bg-background');
        content = content.replace(/bg-slate-700/g, 'bg-card');
        content = content.replace(/border-slate-700/g, 'border-border');
        content = content.replace(/text-slate-400/g, 'text-muted-foreground');
        
        // Only replace text-white when it seems to be part of a container (like bg-slate-800 text-white)
        // I'll just replace 'text-white' -> 'text-foreground' for simplicity. Wait, it might break primary buttons!
        // So I'll only replace the specific dark mode ones.
        changed = true;
    }

    if (changed) {
        fs.writeFileSync(file, content, 'utf8');
        console.log(`Updated ${file}`);
    }
});
