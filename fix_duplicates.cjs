const fs = require('fs');

// Read the file
const content = fs.readFileSync('services/supabaseService.ts', 'utf8');
const lines = content.split('\n');

// Keep only first 600 lines (0-599)
const newContent = lines.slice(0, 600).join('\n');

// Write back
fs.writeFileSync('services/supabaseService.ts', newContent, 'utf8');

console.log(`File trimmed to 600 lines (removed ${lines.length - 600} duplicate lines)`);
