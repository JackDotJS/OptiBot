const fs = require('fs');
const path = require('path');
const util = require('util');

const locateTD = /to(-)?do|wip|work[- ]in[- ]progress/gi;
const locateCM = /(^| )(\/{2,}|\/\*)/gim;

const folders = [
  './'
];

const scanned = [];

const TDresults = [];
const CMresults = [];

console.log('SCANNING...');

let i = 0;
(function nextFolder() {
  const dirPath = folders[i];
  const dir = fs.readdirSync(dirPath);

  const nextd = () => {
    if(i+1 >= folders.length) {
      console.log(`\n\nSCANNED FILES: \n${scanned.join('\n')}`);
      console.log(`\n\nSCANNED DIRECTORIES: \n${folders.join('\n')}`);
      console.log(`\n\n"TODO" RESULTS: \n${TDresults.join('\n')}`);
      console.log(`\n\n"COMMENT" RESULTS: \n${CMresults.join('\n')}`);
    } else {
      i++;
      nextFolder();
    }
  };

  let i2 = 0;
  (function nextFile() {
    const file = dir[i2];

    const nextf = () => {
      if(i2+1 >= dir.length) {
        nextd();
      } else {
        i2++;
        nextFile();
      }
    };

    if(dir.length === 0 || file === undefined) {
      nextd();
    } else
    if(file.startsWith('.') || file === 'node_modules') {
      nextf();
    } else
    if(file.match(/^.+\.\w+/)) {
      // file
      if(file.endsWith('.js') && file !== path.parse(__filename).name+'.js') {
        try {
          const content = fs.readFileSync(`${dirPath}/${file}`, {encoding: 'utf8'});

          if(content.length === 0) {
            nextf();
            return;
          }

          const lines = content.split('\n');
          for(let i3 = 0; i3 < lines.length; i3++) {
            const line = lines[i3];
            const todo = line.match(locateTD);
            const comments = line.match(locateCM);

            if(todo) {
              TDresults.push(`${file}:${i3+1} - ${todo}`);
            }

            if(comments) {
              CMresults.push(`${file}:${i3+1} - ${comments}`);
            }
          }

          scanned.push(file);
          nextf();
        }
        catch(err) {
          console.error(err);
          nextf();
        }
      } else {
        nextf();
      }
    } else {
      // folder
      folders.push(`${dirPath}${(i === 0) ? '' : '/'}${file}`);
      nextf();
    }
  })();
})();