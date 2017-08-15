// конструктор metadata.js

// функция установки параметров сеанса
import settings from '../../config/app.settings';

// принудительный редирект и установка зоны для абонентов с выделенными серверами
import patch_cnn from '../../config/patch_cnn';

// скрипт инициализации метаданных
import meta_init from './init';

// скрипты модификаторов DataObj`s и DataManager`s
import modifiers from './modifiers';

// генератор события META_LOADED для redux
import {metaActions} from 'metadata-redux';

// параметры сеанса и метаданные инициализируем без лишних проволочек
$p.wsql.init(settings, meta_init);
patch_cnn();

// скрипт инициализации в привязке к store приложения
export function init(store) {

  return $p.load_script('/dist/windowbuilder.js', 'script')
    .then(() => $p.load_script('/dist/wnd_debug.js', 'script'))
    .then(() => {

      // выполняем модификаторы
      modifiers($p);

      // информируем хранилище о готовности MetaEngine
      store.dispatch(metaActions.META_LOADED($p));

      // читаем локальные данные в ОЗУ
      return $p.adapters.pouch.load_data();

    });
}

// экспортируем $p и PouchDB глобально
//global.$p = $p;
