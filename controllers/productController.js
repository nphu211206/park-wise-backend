// File: controllers/productController.js (Nội dung mới)

const axios = require('axios');
const cheerio = require('cheerio');
const Product = require('../models/productModel');

// --- HÀM CÀO DỮ LIỆU TỪ FPT SHOP ---
const scrapeFPTShop = async () => {
    try {
        const url = 'https://fptshop.com.vn/phu-kien';
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);
        let products = [];

        $('.cdt-product-wrapper').each((i, el) => {
            const name = $(el).find('h3.cdt-product__name').text().trim();
            const priceText = $(el).find('.cdt-product__show-price').text().trim().replace(/[.₫]/g, '');
            const price = parseInt(priceText, 10);
            const imageUrl = $(el).find('.cdt-product__img img').attr('src');
            const affiliateLink = 'https://fptshop.com.vn' + $(el).find('a').attr('href');

            if (name && price && imageUrl && affiliateLink) {
                products.push({ name, price, imageUrl, affiliateLink, source: 'FPTShop' });
            }
        });
        return products;
    } catch (error) {
        console.error('Lỗi khi cào dữ liệu từ FPTShop:', error);
        return [];
    }
};

// --- CONTROLLERS ---

// Controller để kích hoạt việc cào dữ liệu và lưu vào DB
exports.scrapeAndSaveProducts = async (req, res) => {
    try {
        console.log('Bắt đầu quá trình cào dữ liệu...');
        const fptProducts = await scrapeFPTShop();
        
        if (fptProducts.length === 0) {
            return res.status(500).json({ status: 'fail', message: 'Không cào được sản phẩm nào.' });
        }
        
        console.log(`Cào thành công ${fptProducts.length} sản phẩm. Đang lưu vào database...`);
        
        const operations = fptProducts.map(product => ({
            updateOne: {
                filter: { affiliateLink: product.affiliateLink },
                update: { $set: product },
                upsert: true,
            },
        }));

        await Product.bulkWrite(operations);

        console.log('Lưu vào database thành công!');
        res.status(200).json({
            status: 'success',
            message: `Cập nhật thành công ${fptProducts.length} sản phẩm.`,
        });

    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Lỗi server nội bộ.', error: error.message });
    }
};

// Controller để lấy sản phẩm từ DB cho frontend
exports.getAllProducts = async (req, res) => {
    try {
        const products = await Product.aggregate([{ $sample: { size: 12 } }]);
        res.status(200).json({
            status: 'success',
            results: products.length,
            data: { products },
        });
    } catch (error) {
        res.status(404).json({ status: 'fail', message: 'Không tìm thấy sản phẩm.' });
    }
};