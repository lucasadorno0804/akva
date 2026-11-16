// scripts/add-amazon-deal.js
const fs = require('fs');
const path = require('path');

const AFFILIATE_TAG = 'abacatefrito7-20';

function extractASIN(urlOrAsin) {
    const match = urlOrAsin.match(/(?:dp|gp\/product|\/d)\/([A-Z0-9]{10})/i) || urlOrAsin.match(/^([A-Z0-9]{10})$/i);
    return match ? match[1].toUpperCase() : null;
}

function parsePrice(text) {
    if (!text) return null;
    const clean = text.replace(/[^\d,\.]/g, '').replace(/\./g, '').replace(',', '.');
    const val = parseFloat(clean);
    return isNaN(val) ? null : val;
}

async function fetchAmazonProduct(urlOrAsin) {
    const asin = extractASIN(urlOrAsin);
    if (!asin) {
        throw new Error('Não foi possível identificar o ASIN (código do produto) na URL fornecida.');
    }

    const targetUrl = `https://www.amazon.com.br/dp/${asin}`;
    console.log(`Buscando dados de: ${targetUrl}...`);

    const res = await fetch(targetUrl, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        }
    });

    if (!res.ok) {
        throw new Error(`Erro ao acessar Amazon (Status ${res.status})`);
    }

    const html = await res.text();

    // Título
    let title = '';
    const titleMatch = html.match(/<span id="productTitle"[^>]*>([\s\S]*?)<\/span>/i);
    if (titleMatch) {
        title = titleMatch[1].trim();
    }

    // Imagem principal
    let image = '';
    const dynMatch = html.match(/data-a-dynamic-image="\{&quot;(https:\/\/[^&]+)&quot;/i);
    if (dynMatch) {
        image = dynMatch[1];
    } else {
        const landingMatch = html.match(/id="landingImage"[^>]+src="(https:\/\/[^"]+)"/i);
        if (landingMatch) image = landingMatch[1];
    }

    // Preço Atual
    let price = null;
    const priceMatch = html.match(/<span class="a-price aok-align-center[^"]*"[^>]*>[\s\S]*?<span class="a-offscreen">([^<]+)<\/span>/i)
        || html.match(/<span class="a-price apexPriceToPay"[^>]*>[\s\S]*?<span class="a-offscreen">([^<]+)<\/span>/i)
        || html.match(/id="priceblock_ourprice"[^>]*>([^<]+)</i);

    if (priceMatch) {
        price = parsePrice(priceMatch[1]);
    }

    // Preço "De" (riscado / original)
    let was = null;
    const wasMatch = html.match(/<span class="a-price a-text-price[^"]*"[^>]*>[\s\S]*?<span class="a-offscreen">([^<]+)<\/span>/i)
        || html.match(/data-a-strike="true"[^>]*>[\s\S]*?<span class="a-offscreen">([^<]+)<\/span>/i);

    if (wasMatch) {
        was = parsePrice(wasMatch[1]);
    }

    if (!was && price) {
        was = price;
    }

    const affiliateUrl = `https://www.amazon.com.br/dp/${asin}?tag=${AFFILIATE_TAG}`;

    return {
        id: `amz-${asin.toLowerCase()}`,
        asin,
        title: title || `Produto Amazon ${asin}`,
        price: price || 0,
        was: was || (price ? price * 1.2 : 0),
        image: image || 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=720&h=720&fit=crop&q=75&auto=format',
        store: 'amazon',
        fit: 'contain',
        url: affiliateUrl,
        checked: 'agora mesmo'
    };
}

async function main() {
    const input = process.argv[2];
    if (!input) {
        console.log('Uso: node scripts/add-amazon-deal.js "<URL_OU_ASIN>"');
        process.exit(1);
    }

    try {
        const deal = await fetchAmazonProduct(input);
        console.log('\n--- Produto Capturado ---');
        console.log(`Título: ${deal.title}`);
        console.log(`Preço: R$ ${deal.price.toFixed(2)} (De: R$ ${deal.was.toFixed(2)})`);
        console.log(`Desconto: ${deal.was > deal.price ? Math.round((1 - deal.price / deal.was) * 100) : 0}%`);
        console.log(`Link com Afiliado: ${deal.url}`);
        console.log('\nObjeto para akva-data.js:');
        console.log(JSON.stringify(deal, null, 4));

        const save = process.argv.includes('--save');
        if (save) {
            const dataPath = path.join(__dirname, '..', 'assets', 'akva-data.js');
            let content = fs.readFileSync(dataPath, 'utf-8');
            const insertIndex = content.indexOf('deals: [');
            if (insertIndex !== -1) {
                const dealStr = `            {\n                id: '${deal.id}', store: 'amazon',\n                title: ${JSON.stringify(deal.title)},\n                price: ${deal.price}, was: ${deal.was}, image: ${JSON.stringify(deal.image)}, fit: 'contain',\n                url: '${deal.url}', checked: 'agora mesmo',\n            },\n`;
                const afterDeals = insertIndex + 'deals: ['.length;
                content = content.slice(0, afterDeals) + '\n' + dealStr + content.slice(afterDeals);
                fs.writeFileSync(dataPath, content, 'utf-8');
                console.log(`\n✅ Oferta adicionada com sucesso ao assets/akva-data.js!`);
            }
        } else {
            console.log(`\nDica: Adicione '--save' no final para inserir automaticamente no site!`);
        }
    } catch (err) {
        console.error('Erro:', err.message);
    }
}

main();
