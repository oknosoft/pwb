import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {Switch, Route} from 'react-router';

import Snack from 'metadata-react/App/Snack';       // сообщения в верхней части страницы (например, обновить после первого запуска)
import Alert from 'metadata-react/App/Alert';       // диалог сообщения пользователю
import Confirm from 'metadata-react/App/Confirm';   // диалог вопросов пользователю (да, нет)
import Popup from 'metadata-react/App/Popup';       // контекстное меню и прочие всплывающие штучки
import WindowPortal from 'metadata-react/App/WindowPortal';     // контент в новом окне (например, для печати)
import Login, {FrmLogin} from 'metadata-react/FrmLogin/Proxy';  // логин и свойства подключения
import NeedAuth from 'metadata-react/App/NeedAuth'; // страница "необхлдима авторизация"
import Header from 'metadata-react/Header';         // навигация
import DumbScreen from '../DumbScreen';             // заставка "загрузка занных"
import DataRoute from './DataRoute';                // вложенный маршрутизатор страниц с данными
import AboutPage from '../About';                   // информация о программе
import HelpPage from '../Help';                     // руководство пользователя
import Settings from '../Settings';                 // настройки
import NotFoundPage from '../NotFoundPage';         // 404
import {lazy} from './lazy';                        // конструкторы для контекста
import browserVersion from './browserVersion';

import {withNavigateAndMeta} from 'metadata-redux';
import Builder from '../Builder';
import Templates from 'wb-forms/dist/CalcOrder/Templates';  // stepper выбора шаблона изделия

let CalcOrderList = DumbScreen;

import items, {item_props} from './menu_items';     // массив элементов меню

class AppRoot extends Component {

  handleDialogClose(name) {
    this.props.handleIfaceState({component: '', name, value: {open: false}});
  }

  handleReset(reset) {
    const {handleNavigate, first_run} = this.props;
    if(first_run || reset) {
      $p.eve && ($p.eve.redirect = true);
      location.replace('/');
    }
    else {
      handleNavigate('/');
    }
  }

  componentDidMount() {
    const {handleNavigate, handleIfaceState} = this.props;
    $p.ui.dialogs.init({handleIfaceState, handleNavigate, lazy});
    browserVersion($p.ui.dialogs);
    let comp;
    if($p.wsql.get_user_param('ram_indexer')) {
      comp = import('wb-forms/dist/CalcOrder/FrmList/CalcOrderList');
      if(items[0].id === 'orders') {
        const orders = items.splice(0, 1);
        items[0].items.unshift({
          text: 'Расчеты-заказы',
          navigate: '/',
          need_meta: true,
          need_user: true,
          icon: orders.icon,
        });
      }
    }
    else {
     comp = import('../CalcOrder/List/CalcOrderListDhtmlx');
    }
    comp.then((module) => {
      CalcOrderList = module.default;
    });
  }

  render() {
    const {props} = this;
    const {snack, alert, confirm, popup, wnd_portal, meta_loaded, doc_ram_loaded, nom_prices_step, page, user, couch_direct,
      offline, title, idle, handleNavigate, handleIfaceState, handleLock, handleUnLock, handleLogin, handleLogOut} = props;
    const iprops = item_props();


    let need_auth = meta_loaded && iprops.need_user && ((!user.try_log_in && !user.logged_in) || (couch_direct && offline));
    if(need_auth && !couch_direct && props.complete_loaded) {
      const current_user = $p.current_user;
      if(current_user && current_user.name == user.name) {
        need_auth = false;
      }
    }

    const auth_props = {
      handleNavigate,
      handleIfaceState,
      handleLock,
      handleUnLock,
      handleLogin,
      handleLogOut,
      offline: couch_direct && offline,
      user,
      title,
      idle,
      pfilter(key) {
        return key !== 'google';
      }
    };

    return [

      <Header key="header" items={items} {...props} />,

      // основной контент или заставка загрузки или приглашение к авторизации
      need_auth || idle ?
        <NeedAuth
          key="auth"
          {...auth_props}
          ComponentLogin={FrmLogin}
        />
        :
        (
          (!props.path_log_in && ((iprops.need_meta && !meta_loaded) || (iprops.need_user && !props.complete_loaded))) ?
            <DumbScreen
              key="dumb"
              title={doc_ram_loaded ? 'Подготовка данных в памяти...' : 'Загрузка из IndexedDB...'}
              page={{text: doc_ram_loaded ? `Цены и характеристики${nom_prices_step ? ` (такт №${nom_prices_step})` : ''}...` :
                  `${(page && page.synonym) || 'Почти готово'}...`}}
              top={92}/>
            :
            <Switch key="switch">
              <Route exact path="/" component={CalcOrderList}/>
              <Route path="/builder/:ref([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})" component={Builder} />
              <Route path="/templates" render={(routeProps) => <Templates {...props} {...routeProps}/>}/>
              <Route path="/:area(doc|cat|ireg|cch|rep).:name" render={(tprops) => <DataRoute {...tprops} title={title} />} />
              <Route path="/about" component={AboutPage} />
              <Route path="/help" component={HelpPage} />
              <Route path="/login" render={(tprops) => <Login {...tprops} {...auth_props} />} />
              <Route path="/settings" component={Settings} />
              <Route path="/waiting" render={(tprops) => <DumbScreen {...tprops} repl={props.repl} />} />
              <Route component={NotFoundPage} />
            </Switch>
        ),

      // всплывающтй snackbar оповещений пользователя
      (snack?.open || (props.first_run && doc_ram_loaded)) &&
      <Snack
        key="snack"
        snack={snack}
        handleClose={snack && snack.open && !snack.reset ? this.handleDialogClose.bind(this, 'snack') : () => this.handleReset(snack && snack.reset)}
      />,

      // диалог сообщений пользователю
      alert?.open && <Alert key="alert" {...alert} handleOk={alert.handleOk || this.handleDialogClose.bind(this, 'alert')}/>,

      // диалог вопросов пользователю (да, нет)
      confirm?.open && <Confirm key="confirm" {...confirm}/>,

      // конткстный popup
      popup?.open && <Popup key="popup" {...popup}/>,

      // popup окно печатных форм
      wnd_portal?.open && <WindowPortal key="wnd_portal" {...wnd_portal}/>,

      // обрыв связи
      couch_direct && user.logged_in && !offline && props.complete_loaded && !props.sync_started && $p.job_prm.use_ram !== false &&
      <Snack
        key="break"
        snack={{
          open: true,
          message: 'Потеряна связь с сервером, ждём восстановления...',
          button: 'Подробнее'}}
        handleClose={() => {
          props.handleIfaceState({
            component: '',
            name: 'alert',
            value: {open: true, title: 'Интернет-соединение', text: 'Можно будет продолжить работу после восстановления связи'}});
        }}
      />,

    ];
  }

  getChildContext() {
    return {components: lazy};
  }
}

AppRoot.childContextTypes = {
  components: PropTypes.object,
};

AppRoot.propTypes = {
  handleNavigate: PropTypes.func.isRequired,
  handleLogin: PropTypes.func.isRequired,
  handleIfaceState: PropTypes.func.isRequired,
  handleLock: PropTypes.func,
  handleUnLock: PropTypes.func,
  handleLogOut: PropTypes.func,
  first_run: PropTypes.bool,
  meta_loaded: PropTypes.bool,
  doc_ram_loaded: PropTypes.bool,
  couch_direct: PropTypes.bool,
  complete_loaded: PropTypes.bool,
  sync_started: PropTypes.bool,
  idle: PropTypes.bool,
  offline: PropTypes.bool,
  path_log_in: PropTypes.bool,
  snack: PropTypes.object,
  alert: PropTypes.object,
  confirm: PropTypes.object,
  repl: PropTypes.object,
  user: PropTypes.object,
  page: PropTypes.object,
  wnd_portal: PropTypes.object,
  nom_prices_step: PropTypes.number,
  title: PropTypes.string,
};

export default withNavigateAndMeta(AppRoot);

