const xlsx = require('xlsx');
const path = require('path');

const filename = 'LINCAT_divisions-administratives-v2r1-caps-municipi-20250730.xlsx';
const workbook = xlsx.readFileSync(path.join(process.cwd(), filename));
console.log('SheetNames:', workbook.SheetNames);

workbook.SheetNames.forEach(name => {
    const worksheet = workbook.Sheets[name];
    const data = xlsx.utils.sheet_to_json(worksheet);
    if (data.length > 0) {
        console.log(`Sheet: ${name}, Keys:`, Object.keys(data[0]));
        console.log(`Sheet: ${name}, Sample:`, data[0]);
    }
});
