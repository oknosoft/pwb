
function reset_replace(prm) {

  const {pouch} = $p.wsql;
  const {local} = pouch;
  const destroy_ram = local.ram && local.ram.destroy.bind(local.ram);
  const destroy_doc = local.doc && local.doc.destroy.bind(local.doc);
  const do_reload = () => {
    setTimeout(() => {
      $p.eve.redirect = true;
      location.replace(prm.host);
    }, 1000);
  };
  const do_replace = destroy_ram ?
    () => destroy_ram()
      .then(destroy_doc)
      .catch(destroy_doc)
      .then(do_reload)
      .catch(do_reload)
    :
    do_reload;

  setTimeout(do_replace, 10000);

  dhtmlx.confirm({
    title: 'Новый сервер',
    text: `Зона №${prm.zone} перемещена на выделенный сервер ${prm.host}`,
    cancel: $p.msg.cancel,
    callback: do_replace
  });
}

/**
 * предопределенные зоны
 */
export const predefined = {
  'aribaz.': {zone: 2, host: 'https://aribaz.oknosoft.ru/'},
  'eco.': {zone: 21, host: 'https://eco.oknosoft.ru/'},
  'ecookna.': {zone: 21, host: 'https://zakaz.ecookna.ru/', splash: {css: 'splash21', title: false}, log_level: 'warn', templates: true},
  //'localhost': {zone: 21, splash: {img: '', text: ''}, splash: {css: 'splash21', title: false}, log_level: 'warn', templates: true}, //
  'rusokon.': {zone: 19, host: 'https://rusokon.oknosoft.ru/'},
  'kaleva.': {zone: 8, host: 'https://kaleva.oknosoft.ru/'},
  'tmk.': {zone: 23, host: 'https://tmk-online.ru/'},
  'crystallit.': {zone: 25, host: 'https://crystallit.oknosoft.ru/'},
  'okna-stolicy.': {zone: 22, host: 'https://okna-stolicy.oknosoft.ru/'},
}

/**
 * патч зоны по умолчанию
 */
export function patch_prm(settings) {
  return (prm) => {
    settings(prm);
    for (const elm in predefined) {
      if(location.host.match(elm)) {
        prm.zone = predefined[elm].zone;
        break;
      }
    }
    return prm;
  };
}

/**
 * патч параметров подключения
 */
export function patch_cnn() {

  const {job_prm, wsql} = $p;

  for (const elm in predefined) {
    const prm = predefined[elm];
    if(location.host.match(elm)) {
      wsql.get_user_param('zone') != prm.zone && wsql.set_user_param('zone', prm.zone);
      if(prm.log_level) {
        job_prm.job_prm = prm.log_level;
      }
      if(prm.splash) {
        job_prm.splash = prm.splash;
      }
      if(prm.templates) {
        job_prm.templates = prm.templates;
      }
    }
  }
  if(!location.host.match('localhost')) {
    for (const elm in predefined) {
      const prm = predefined[elm];
      if(prm.host && wsql.get_user_param('zone') == prm.zone && !location.host.match(elm)) {
        reset_replace(prm);
      }
    }
  }
}
