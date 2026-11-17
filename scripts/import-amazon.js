/**
 * AKVAPromo · Importador Automático de Produtos Amazon
 * Extrai título, imagem de alta resolução do CDN, preço atual e gera link de afiliado.
 * 
 * Uso:
 *   node scripts/import-amazon.js "<URL_OU_ASIN>"
 *   node scripts/import-amazon.js "<URL_OU_ASIN>" --category=games --save
 *   node scripts/import-amazon.js "<URL_OU_ASIN>" --category=hardware --save
 */

const fs = require('fs');
const path = require('path');

const AFFILIATE_TAG = 'abacatefrito7-20';

function extractASIN(input) {
    const match = input.match(/(?:dp|gp\/product|\/d)\/([A-Z0-9]{10})/i) || input.match(/^([A-Z0-9]{10})$/i);
    return match ? match[1].toUpperCase() : null;
}

function parsePrice(text) {
    if (!text) return null;
    const clean = text.replace(/[^\d,\.]/g, '').replace(/\./g, '').replace(',', '.');
    const val = parseFloat(clean);
    return isNaN(val) ? null : val;
}

async function fetchProduct(input) {
    const asin = extractASIN(input);
    if (!asin) {
        throw new Error('Não foi possível identificar o código ASIN na URL ou texto fornecido.');
    }

    const url = `https://www.amazon.com.br/dp/${asin}`;
    console.log(`\n[1/3] Conectando à Amazon para ASIN ${asin}...`);

    const res = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        }
    });

    if (!res.ok) {
        throw new Error(`Falha ao carregar página da Amazon (Status ${res.status})`);
    }

    const html = await res.text();
    console.log('[2/3] Extraindo metadados e imagem oficial do CDN...');

    // Título
    const titleMatch = html.match(/<span id="productTitle"[^>]*>([\s\S]*?)<\/span>/i);
    const title = titleMatch ? titleMatch[1].trim() : `Produto Amazon ${asin}`;

    // Imagem do CDN da Amazon
    let image = null;
    const imgIdMatch = html.match(/https:\/\/m\.media-amazon\.com\/images\/I\/([A-Za-z0-9+%-]{10,12})/);
    if (imgIdMatch) {
        image = `https://m.media-amazon.com/images/I/${imgIdMatch[1]}._AC_SL1000_.jpg`;
    } else {
        const anyImg = html.match(/https:\/\/m\.media-amazon\.com\/images\/I\/[A-Za-z0-9+%-]+(?:\._[A-Za-z0-9,._-]+)?\.jpg/);
        if (anyImg) image = anyImg[0];
    }

    // Preço
    let price = null;
    const priceMatch = html.match(/class="a-price aok-align-center[^"]*"[^>]*>[\s\S]*?<span class="a-offscreen">([^<]+)<\/span>/i)
                    || html.match(/class="a-price apexPriceToPay"[^>]*>[\s\S]*?<span class="a-offscreen">([^<]+)<\/span>/i);
    if (priceMatch) {
        price = parsePrice(priceMatch[1]);
    }

    let was = null;
    const wasMatch = html.match(/class="a-price a-text-price[^"]*"[^>]*>[\s\S]*?<span class="a-offscreen">([^<]+)<\/span>/i);
    if (wasMatch) {
        was = parsePrice(wasMatch[1]);
    }

    if (!was && price) was = Math.round(price * 1.25);

    const affiliateUrl = `https://www.amazon.com.br/dp/${asin}?tag=${AFFILIATE_TAG}`;

    return {
        id: `amz-${asin.toLowerCase()}`,
        asin,
        title,
        price: price || 0,
        was: was || 0,
        image: image || 'https://m.media-amazon.com/images/I/61drBproFZL._AC_SL1000_.jpg',
        url: affiliateUrl
    };
}

async function main() {
    const args = process.argv.slice(2);
    const input = args.find(a => !a.startsWith('--'));

    if (!input) {
        console.log('\nUso:');
        console.log('  node scripts/import-amazon.js "<LINK_DO_PRODUTO>"');
        console.log('  node scripts/import-amazon.js "<LINK_DO_PRODUTO>" --category=hardware --save\n');
        process.exit(1);
    }

    const catArg = args.find(a => a.startsWith('--category='));
    const category = catArg ? catArg.split('=')[1] : 'outros';
    const shouldSave = args.includes('--save');

    try {
        const item = await fetchProduct(input);
        const discount = item.was > item.price ? Math.round((1 - item.price / item.was) * 100) : 0;

        console.log('\n[3/3] ✅ Dados obtidos com sucesso:');
        console.log('----------------------------------------------------');
        console.log(`ASIN:      ${item.asin}`);
        console.log(`Título:    ${item.title}`);
        console.log(`Preço:     R$ ${item.price.toFixed(2)} (De: R$ ${item.was.toFixed(2)} | -${discount}%)`);
        console.log(`Imagem:    ${item.image}`);
        console.log(`Afiliado:  ${item.url}`);
        console.log('----------------------------------------------------');

        if (shouldSave) {
            const dataFile = path.join(__dirname, '..', 'assets', 'akva-data.js');
            let content = fs.readFileSync(dataFile, 'utf-8');
            const target = 'deals: [';
            const idx = content.indexOf(target);
            if (idx !== -1) {
                const dealCode = `            {\n                id: '${item.id}', store: 'amazon', category: '${category}',\n                title: ${JSON.stringify(item.title)},\n                price: ${item.price}, was: ${item.was}, image: '${item.image}', fit: 'contain',\n                url: '${item.url}', checked: 'agora mesmo',\n            },\n`;
                const newContent = content.slice(0, idx + target.length) + '\n' + dealCode + content.slice(idx + target.length);
                fs.writeFileSync(dataFile, newContent, 'utf-8');
                console.log(`\n🎉 Item adicionado automaticamente ao akva-data.js na categoria [${category}]!`);
            }
        } else {
            console.log('\nDica: Adicione "--save" no final para inserir diretamente no site!');
        }
    } catch (err) {
        console.error('\n❌ Erro:', err.message);
    }
}

main();
