const { chromium } = require('playwright');
const fs = require('fs');
const XLSX = require('xlsx');
const rutaArchivoXLSX = './bd_scraping/bd_scrp.xlsx';

(async() => {
    const workbook = XLSX.readFile(rutaArchivoXLSX);
    const sheetName = workbook.SheetNames[1];
    const worksheet = workbook.Sheets[sheetName];

    const data = XLSX.utils.sheet_to_json(worksheet, { raw: true });
    const totalElementos = data.length;

    fs.writeFileSync('datos_originales.json', JSON.stringify(data, null, 2));
    console.log('Datos originales guardados en datos_originales.json');

    const browser = await chromium.launch();
    const page = await browser.newPage();

    const guardarDatos = () => {
        fs.writeFileSync('datos_actualizados.json', JSON.stringify(data, null, 2));
        console.log('Datos actualizados y guardados en datos_actualizados.json');
    };

    process.on('uncaughtException', (error) => {
        console.error('Excepción no controlada:', error);
        guardarDatos();
        process.exit(1);
    });

    process.on('beforeExit', () => {
        console.log('El proceso está por terminar. Guardando datos...');
        guardarDatos();
    });

    for (let i = 0; i < data.length; i++) {
        const item = data[i];
        const skuId = item.SKU_ID;
        const url = `https://www.falabella.com/falabella-cl/search?Ntt=${skuId}`;

        console.log(`Procesando elemento ${i + 1} de ${totalElementos}, SKU_ID: ${skuId}`);

        await page.goto(url);
        const ratingElement = await page.$('.bv_avgRating_component_container.notranslate');

        if (ratingElement) {
            const ratingValue = await ratingElement.textContent();
            item.dato_scraping = ratingValue;
        } else {
            item.dato_scraping = 'No se encontró rating';
        }

        console.log(`Scraping completado para SKU_ID: ${skuId}`);
    }

    await browser.close();
})();