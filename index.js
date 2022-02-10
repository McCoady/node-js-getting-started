const express = require('express')
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const pinataSDK = require('@pinata/sdk');
const pinata = pinataSDK("ca2a171f24a57d7ca40d", "c0528064038468a8202d42b8c2d96e8546ebb9c6104094cc93e33d0b96258935");
const PORT = process.env.PORT || 5000;

let urlRedirect;

express()
  .use(express.static(path.join(__dirname, 'public')))
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .get('/', (req, res) => res.render('pages/index'))
  .get('/scrape/', (req, res) => {
    const { x, t } = req.query;
    tokenId = Buffer.from(x, 'utf-8').toString('base64')
    hash = Buffer.from(t, 'utf-8').toString('base64')
    returnPng(tokenId, hash).then((url) => {
      console.log(url)
      res.redirect(Buffer.from(url))
    })
  })
  .listen(PORT, () => console.log(`Listening on ${PORT}`));

async function returnPng(tokenId, hash) {

  async function findPng() {
    const metadataFilter = {
      name: tokenId + hash,
    }
    const filters = {
      status: 'pinned',
      metadata: metadataFilter
    }
    const result = await pinata.pinList(filters)
    return result
  }

  async function getPng() {
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    const url = 'https://ipfs.io/ipfs/QmVA89MA4uo6yPbLxzzd8XvTAKerFbjWApnwHV3UqxrmCw?x=' + tokenId + "&t=" + hash;
    await page.goto(url, { waitUntil: 'networkidle2', });
    try {
      const dataUrl = await page.evaluate(() => {
        const canvas = document.getElementById('defaultCanvas0');
        return canvas.toDataURL();
      });
      let base64Data, binaryData;
      base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");
      base64Data += base64Data.replace('+', ' ');
      binaryData = new Buffer.from(base64Data, 'base64').toString('binary');
      fs.writeFile("out.png", binaryData, 'binary', function (e) {
        const readableStreamForFile = fs.createReadStream("out.png");
        const options = {
          pinataMetadata: {
            name: tokenId + hash
          },
          pinataOptions: {
            cidVersion: 0
          }
        }
        pinata.pinFileToIPFS(readableStreamForFile, options).then((result) => {
          console.log(result);
        }).catch((e) => {
          console.log(e);
        });
        console.log(e);
      });
    } catch (e) {
      console.log(e);
    }
    await browser.close();
  }

  let obj = findPng();
  const url = obj.then(function (ipfsPin) {
    if (ipfsPin.count >= 1) {
      urlRedirect = "https://ipfs.io/ipfs/" + ipfsPin.rows[0].ipfs_pin_hash
      console.log(ipfsPin);
      //console.log(urlRedirect)
      return urlRedirect;
    } else {
      getPng().then(console.log(('Image being generated, please wait')));
      return "image generating";
    }

  }).then(function (result) {
    return result
  })
  return url;
}