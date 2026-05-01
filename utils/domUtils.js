const cheerio = require('cheerio');

const domUtils = {
    load(html) {
        return cheerio.load(html);
    },

    getImages($) {
        const images = [];
        $('img').each((i, el) => {
            images.push({
                src: $(el).attr('src') || $(el).attr('data-src') || 'unknown',
                alt: $(el).attr('alt')
            });
        });
        return images;
    }
};

module.exports = domUtils;
