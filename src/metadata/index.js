// модуль создаёт и настраивает MetaEngine

// функция установки параметров сеанса
import settings from '../../config/app.settings';

// генератор события META_LOADED для redux
import {addMiddleware} from 'redux-dynamic-middlewares';
// стандартные события pouchdb и метаданных
import {metaActions, metaMiddleware} from 'metadata-redux';
// дополнительные события pouchdb
import {customPouchMiddleware} from '../redux/reducers/pouchdb';

// читаем скрипт инициализации метаданных, полученный в результате выполнения meta:prebuild
import init_meta from 'wb-core/dist/init_meta';
import init_sql from 'wb-core/dist/init_sql';
import init_classes from 'wb-core/dist/init';
import modifiers from './modifiers';
import proxy_login, {load_ram, load_common} from 'metadata-react/common/proxy';

// загружаем metadata.transition и экспортируем $p глобально
import $p from 'metadata-dhtmlx';

// подключаем react-специфичные методы
import plugin_react from 'metadata-react/plugin';
plugin_react.constructor.call($p);

// подключаем cron
// import cron from 'metadata-abstract-ui/cron';
// cron.constructor.call($p);

import reset_cache from './reset_cache';

global.$p = $p;

// параметры сеанса и метаданные инициализируем без лишних проволочек
$p.wsql.init(settings.prm(settings));
settings.cnn($p);

// со скрипом инициализации метаданных, так же - не затягиваем
init_meta($p);
init_sql($p);
init_classes($p);

// запускаем проверку единственности экземпляра
//$p.utils.single_instance_checker.init();

// скрипт инициализации в привязке к store приложения
export function init(store) {

  try {

    const {dispatch} = store;

    // подключаем metaMiddleware
    addMiddleware(metaMiddleware($p));
    addMiddleware(customPouchMiddleware($p));

    // сообщяем адаптерам пути, суффиксы и префиксы
    const {wsql, job_prm, classes, adapters: {pouch}, md} = $p;
    classes.PouchDB.plugin(proxy_login());
    pouch.init(wsql, job_prm);
    reset_cache(pouch);

    pouch.remote.ram = new classes.PouchDB(pouch.dbpath('ram'), {auto_compaction: true, revs_limit: 3, owner: pouch, fetch: pouch.fetch});
    pouch.on({
      on_log_in() {
        return load_ram($p)
          .then(() => {
            const {roles} = $p.current_user || {};
            if(roles && (roles.includes('ram_editor') || roles.includes('doc_full'))) {
              pouch.local.sync.ram = pouch.remote.ram.changes({
                since: 'now',
                live: true,
                include_docs: true
              })
                .on('change', (change) => {
                  // информируем слушателей текущего сеанса об изменениях
                  if(change.doc.class_name !== 'doc.nom_prices_setup' && change.doc.obj_delivery_state !== 'Шаблон') {
                    pouch.load_changes({docs: [change.doc]});
                    pouch.emit('ram_change', change);
                  }
                })
                .on('error', (err) => {
                  $p.record_log(err);
                });
            }
          });
      },
    });
    md.once('predefined_elmnts_inited', () => pouch.emit('pouch_complete_loaded'));

    // читаем paperjs и deep-diff
    $p.load_script(process.env.NODE_ENV === 'production' ?
      '/dist/paperjs-deep-diff.min.js' : '/dist/paperjs-deep-diff.js', 'script')

      // читаем базовый скрипт рисовалки
      .then(() => import('wb-core/dist/drawer'))

      .then((module) => {
        module.default({$p, paper});
      })

      // читаем дополнительный скрипт рисовалки
      .then(() => $p.load_script('/dist/windowbuilder.js', 'script'))

      // читаем скрипт расчетной части построителя
      .then(() => $p.load_script('/dist/wnd_debug.js', 'script'))

      // читаем скрипты модификаторов DataObj`s и DataManager`s
      .then(() => {

        // выполняем модификаторы
        modifiers($p);

        // информируем хранилище о готовности MetaEngine
        dispatch(metaActions.META_LOADED($p));

        // скрипт qrcode грузим асинхронно
        $p.load_script('/dist/qrcodejs/qrcode.min.js', 'script');
        $p.load_script('/dist/qrcodejs/qrcode.tosjis.min.js', 'script');

        // читаем локальные данные в ОЗУ
        return load_common($p);

      })
      .catch((err) => {
        $p.record_log(err);
      });
  }
  catch (err) {
    $p && $p.record_log(err);
  }
}


