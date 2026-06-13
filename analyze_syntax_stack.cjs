const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, 'src', 'components', 'StudentModal.tsx');
const content = fs.readFileSync(targetPath, 'utf8');

const stack = [];
const lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  for (let j = 0; j < line.length; j++) {
    const char = line[j];
    
    // Skip string literals to avoid counting quotes
    // (This is simple stack, but can help find mismatches)
    if (char === '{' || char === '(' || char === '[') {
      stack.push({ char, line: i + 1, col: j + 1 });
    } else if (char === '}' || char === ')' || char === ']') {
      const top = stack[stack.length - 1];
      if (!top) {
        console.log(`Error: Extra closing token '${char}' at line ${i + 1}, col ${j + 1}`);
        continue;
      }
      
      const isMatch = 
        (char === '}' && top.char === '{') ||
        (char === ')' && top.char === '(') ||
        (char === ']' && top.char === '[');
        
      if (isMatch) {
        stack.pop();
      } else {
        console.log(`Mismatch error: Opened '${top.char}' at line ${top.line}, col ${top.col}, but closed with '${char}' at line ${i + 1}, col ${j + 1}`);
        // Pop anyway to continue scanning
        stack.pop();
      }
    }
  }
}

if (stack.length > 0) {
  console.log(`Unclosed tokens remaining in stack: ${stack.length}`);
  for (let k = Math.max(0, stack.length - 10); k < stack.length; k++) {
    console.log(`- Token '${stack[k].char}' opened at line ${stack[k].line}, col ${stack[k].col}`);
  }
} else {
  console.log("Parsing complete: Nesting is fully correct!");
}
