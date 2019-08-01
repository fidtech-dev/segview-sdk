const SV = require('../lib/segview');
const config = require('./config');

const sv = new SV(config.apiKey, config.secret);
const pictures = [
  {
    name: 'picture_0',
    link: 'https://www.carsdrive.com.ar/wp-content/uploads/2015/07/FullSizeRenderfgf_resize.jpg',
  },
  {
    name: 'picture_1',
    link: 'https://www.carsdrive.com.ar/wp-content/uploads/2015/07/FullSizeRenderfgf_resize.jpg',
  },
];
sv.sendPhoto(
  pictures,
  true,
  (res, err) => {
    if (err) throw err;
    // Getting the posted certification back
    if (res) {
      console.log('Getting back the certification ');
      console.log(res.response.certificationId);
    }
  },
);
