const express = require("express");
const app = express();
const { exec, execSync } = require('child_process');
const PORT = process.env.SERVER_PORT || process.env.PORT || 3000;        
const UUID = process.env.UUID || 'ed93aed7-4bba-40c8-99e3-9682d75697d1'; //若需要改UUID，需要在config.json里改为一致
const NEZHA_SERVER = process.env.NEZHA_SERVER || 'nz.f4i.cn';     
const NEZHA_PORT = process.env.NEZHA_PORT || '5555';                     
const NEZHA_KEY = process.env.NEZHA_KEY || '5ddVS93Eq0Uc9he8';
const ARGO_DOMAIN = process.env.ARGO_DOMAIN || 'gggg.kko.us.kg';      
const ARGO_AUTH = process.env.ARGO_AUTH || 'eyJhIjoiMzBmMDEyMGY1OGRjYjk4ZDc5ZTM0YTM5ODY2ZGVjMTAiLCJ0IjoiY2YwYTA4ZjgtM2VhNi00MmQ4LTk3NDktNGE3YzQ3OWYwOGY4IiwicyI6Ik1qQmhZamd5TVRJdFpqUmtZaTAwTVdJMExUZzNPR1F0TUdVek1ERTRNelZrT1daaiJ9';
const CFIP = process.env.CFIP || 'www.visa.com.tw';
const NAME = process.env.NAME || 'Choreo';

// root route
app.get("/", function(req, res) {
  res.send("Hello world!");
});

const metaInfo = execSync(
  'curl -s https://speed.cloudflare.com/meta | awk -F\\" \'{print $26"-"$18}\' | sed -e \'s/ /_/g\'',
  { encoding: 'utf-8' }
);
const ISP = metaInfo.trim();

// sub subscription
app.get('/sub', (req, res) => {
  const VMESS = { v: '2', ps: `${NAME}-${ISP}`, add: CFIP, port: '443', id: UUID, aid: '0', scy: 'none', net: 'splithttp', type: 'none', host: ARGO_DOMAIN, path: '/vmess?ed=2048', tls: 'tls', sni: ARGO_DOMAIN, alpn: '' };
  const vlessURL = `vless://${UUID}@${CFIP}:443?encryption=none&security=tls&sni=${ARGO_DOMAIN}&type=ws&host=${ARGO_DOMAIN}&path=%2Fvless%3Fed%3D2048#${NAME}-${ISP}`;
  const vmessURL = `vmess://${Buffer.from(JSON.stringify(VMESS)).toString('base64')}`;
  const base64Content = Buffer.from(`${vlessURL}\n\n${vmessURL}\n`).toString('base64');

  res.type('text/plain; charset=utf-8').send(base64Content);
});

// run-nezha
  let NEZHA_TLS = '';
  if (NEZHA_SERVER && NEZHA_PORT && NEZHA_KEY) {
    const tlsPorts = ['443', '8443', '2096', '2087', '2083', '2053'];
    if (tlsPorts.includes(NEZHA_PORT)) {
      NEZHA_TLS = '--tls';
    } else {
      NEZHA_TLS = '';
    }
  const command = `nohup ./swith -s ${NEZHA_SERVER}:${NEZHA_PORT} -p ${NEZHA_KEY} ${NEZHA_TLS} >/dev/null 2>&1 &`;
  try {
    exec(command);
    console.log('swith is running');

    setTimeout(() => {
      runWeb();
    }, 2000);
  } catch (error) {
    console.error(`swith running error: ${error}`);
  }
} else {
  console.log('NEZHA variable is empty, skip running');
  runWeb();
}

// run-xr-ay
function runWeb() {
  const command1 = `nohup ./web -c ./config.json >/dev/null 2>&1 &`;
  exec(command1, (error) => {
    if (error) {
      console.error(`web running error: ${error}`);
    } else {
      console.log('web is running');

      setTimeout(() => {
        runServer();
      }, 2000);
    }
  });
}

// run-server
function runServer() {
  let command2 = '';
  if (ARGO_AUTH.match(/^[A-Z0-9a-z=]{120,250}$/)) {
    command2 = `nohup ./server tunnel --edge-ip-version auto --no-autoupdate --protocol http2 run --token ${ARGO_AUTH} >/dev/null 2>&1 &`;
  } else {
    command2 = `nohup ./server tunnel --edge-ip-version auto --config tunnel.yml run >/dev/null 2>&1 &`;
  }

  exec(command2, (error) => {
    if (error) {
      console.error(`server running error: ${error}`);
    } else {
      console.log('server is running');
    }
  });
}

app.listen(PORT, () => console.log(`App is listening on port ${PORT}!`));
