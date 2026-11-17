/**
 * AKVAPromo · Inserção Rápida de Cupons Amazon
 * 
 * Uso:
 *   node scripts/add-coupon.js --code=AMZ50 --value="R$ 50 OFF" --condition="em hardware acima de R$ 500" --category=hardware
 *   node scripts/add-coupon.js --code=APP10 --value="10% OFF" --condition="no primeiro pedido pelo app" --category=games
 */

const fs = require('fs');
const path = require('path');

function getArg(name, def = '') {
    const prefix = `--${name}=`;
    const arg = process.argv.find(a => a.startsWith(prefix));
    return arg ? arg.slice(prefix.length).replace(/^["']|["']$/g, '') : def;
}

const code = getArg('code');
const value = getArg('value', '10% OFF');
const condition = getArg('condition', 'em produtos selecionados');
const category = getArg('category', 'outros');
const until = getArg('until', '30/11');
const min = getArg('min', 'Sem valor mínimo');

if (!code) {
    console.log('\nUso:');
    console.log('  node scripts/add-coupon.js --code=CODIGO --value="R$ 50 OFF" --condition="em compras acima de R$ 300" --category=hardware\n');
    process.exit(1);
}

const id = `amz-${code.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
const newCoupon = {
    id,
    store: 'amazon',
    category,
    value,
    condition,
    code: code.toUpperCase(),
    until,
    untilFull: `${until}/2026, 23h59`,
    minimum: min,
    scope: 'Produtos elegíveis vendidos pela Amazon',
    limit: '1 uso por conta',
    tested: 'agora mesmo'
};

const dataFile = path.join(__dirname, '..', 'assets', 'akva-data.js');
let content = fs.readFileSync(dataFile, 'utf-8');

const target = 'coupons: [';
const idx = content.indexOf(target);
if (idx === -1) {
    console.error('Lista de coupons não encontrada em akva-data.js');
    process.exit(1);
}

const couponCode = `            {\n                id: '${newCoupon.id}', store: 'amazon', category: '${newCoupon.category}', value: '${newCoupon.value}', condition: '${newCoupon.condition}',\n                code: '${newCoupon.code}', until: '${newCoupon.until}', untilFull: '${newCoupon.untilFull}', minimum: '${newCoupon.minimum}',\n                scope: '${newCoupon.scope}', limit: '${newCoupon.limit}', tested: '${newCoupon.tested}',\n            },\n`;

content = content.slice(0, idx + target.length) + '\n' + couponCode + content.slice(idx + target.length);
fs.writeFileSync(dataFile, content, 'utf-8');

console.log('\n🎉 Cupom adicionado com sucesso!');
console.log(`Código:    ${newCoupon.code}`);
console.log(`Valor:     ${newCoupon.value}`);
console.log(`Condição:  ${newCoupon.condition}`);
console.log(`Categoria: ${newCoupon.category}\n`);
