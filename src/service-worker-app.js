/**
 * уточнения к сервисворкеру
 */

import {skipWaiting} from 'workbox-core';
import {precacheAndRoute} from 'workbox-precaching';

// в отладочном режиме, обновляем cache раз в день
const dkey = new Date().toJSON().substring(0, 10);

export default function () {
  skipWaiting();

  const revision = '20250205';
  const persistent = '20240000';

  precacheAndRoute([
    {url: '/dist/dhtmlx.min.js', revision: persistent },
    {url: '/dist/windowbuilder.js', revision },
    {url: '/dist/wnd_debug.js', revision },
    {url: '/dist/paperjs-deep-diff.min.js', revision: persistent },
    {url: '/dist/jszip.min', revision: persistent },
    {url: '/dist/xlsx.full.min', revision: persistent },
    {url: '/dist/docxtemplater.min.js', revision: persistent },
    {url: '/dist/docxtemplater-image-module.min.js', revision: persistent },
    {url: '/dynamic-settings.js', revision },
    //{url: '/couchdb/mdm/92/common', revision: dkey },
    //{url: '/styles/app.0c9a31.css', revision: null},
  ]);

}


