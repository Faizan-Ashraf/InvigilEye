const fs = require('fs');
const csv = require('csv-parser');

const filePath = 'sample-students.csv';
const fileContent = fs.readFileSync(filePath, 'utf8');
const firstLine = fileContent.split(/\r?\n/)[0] || '';
let delimiter = ',';
try {
  const commaCount = firstLine.split(',').length;
  const semiCount = firstLine.split(';').length;
  const tabCount = firstLine.split('\t').length;
  if (semiCount > commaCount && semiCount >= tabCount) delimiter = ';';
  else if (tabCount > commaCount && tabCount > semiCount) delimiter = '\t';
} catch (e) {}

const headersGuess = firstLine.split(delimiter).map(h => h.replace(/\uFEFF/g, '').trim().toLowerCase());
const headerLike = headersGuess.some(h => /roll|name|student|image|id/.test(h));
const csvOptions = { separator: delimiter, skip_empty_lines: true };
if (!headerLike) csvOptions.headers = ['roll_number', 'name', 'image_url'];
else csvOptions.mapHeaders = ({ header }) => header.replace(/\uFEFF/g, '').trim().toLowerCase().replace(/\s+/g, '_').replace(/[^\w_]/g, '');

console.log('Detected delimiter:', JSON.stringify(delimiter));
console.log('Headers guess:', headersGuess, 'headerLike:', headerLike);

const parsed = [];
const parseErrors = [];
fs.createReadStream(filePath)
  .pipe(csv(csvOptions))
  .on('data', (row) => {
    try {
      const roll = (row.roll_number || row.roll || row.rollno || row.student_id || row.id || '').toString().trim();
      const name = (row.name || row.full_name || row.student_name || '').toString().trim();
      const image_url = (row.image_url || row.image_path || row.image || '').toString().trim();
      if (roll && name) parsed.push({ roll_number: roll, name, image_url, raw: row });
      else parseErrors.push({ raw: row, reason: 'missing_roll_or_name' });
    } catch (e) {
      parseErrors.push({ raw: row, reason: e.message });
    }
  })
  .on('end', () => {
    console.log('Parsed count:', parsed.length);
    if (parseErrors.length) console.log('Errors sample:', parseErrors.slice(0,5));
    console.log('Parsed rows sample:', parsed.slice(0,5));
  })
  .on('error', (err) => console.error('CSV parse failed:', err));