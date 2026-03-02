const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, '../assets/icons');
const outPath = path.join(__dirname, '../src/utils/paymentIcons.js');

const upi = fs.readFileSync(path.join(assetsDir, 'upi.svg')).toString('base64');
const shield = fs.readFileSync(path.join(assetsDir, 'shield.svg')).toString('base64');

const content = `/** Auto-generated - run: node scripts/genPaymentIcons.js */
export const UPI_ICON_BASE64 = "${upi}";
export const SHIELD_ICON_BASE64 = "${shield}";
`;

fs.writeFileSync(outPath, content);
console.log('Generated paymentIcons.js');
