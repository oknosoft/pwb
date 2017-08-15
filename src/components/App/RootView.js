import React, {Component} from 'react';

import {ConnectedRouter as Router} from 'react-router-redux';
import {Route} from 'react-router';

// статусы "загружено и т.д." в ствойствах компонента
import withMeta from 'metadata-redux/src/withMeta';

// заставка "загрузка занных"
import DumbScreen from '../DumbScreen/DumbScreen';

// корневые контейнеры
import AppView from './AppView';

// тема для material-ui
import {MuiThemeProvider} from 'material-ui/styles';
import theme from '../../styles/muiTheme';

class RootView extends Component {

  constructor(props) {
    super(props);
    this.state = {path_log_in: this.isPathLogIn()};
  }

  shouldComponentUpdate(props, state) {
    const {user, data_empty, couch_direct, offline, history} = props;
    const {path_log_in} = state;
    let res = true;

    if (path_log_in != this.isPathLogIn()) {
      this.setState({path_log_in: this.isPathLogIn()});
      res = false;
    }

    // если есть сохранённый пароль и online, пытаемся авторизоваться
    if (!user.logged_in && user.has_login && !user.try_log_in && !offline) {
      props.handleLogin();
      res = false;
    }

    // если это первый запуск или couch_direct и offline, переходим на страницу login
    if (!path_log_in && ((data_empty === true && !user.try_log_in) || (couch_direct && offline))) {
      history.push('/login');
      res = false;
    }

    return res;
  }

  isPathLogIn() {
    return !!location.pathname.match(/\/(login|about|settings)$/);
  }

  render() {

    const {props} = this;
    const {meta_loaded, data_empty, data_loaded, history} = props;
    const show_dumb = !meta_loaded ||
      (data_empty === undefined) ||
      (data_empty === false && !data_loaded);

    return <MuiThemeProvider theme={theme}>
      {
        show_dumb ?
          <DumbScreen {...props} />
          :
          <Router history={history}>
            <Route component={AppView}/>
          </Router>
      }
    </MuiThemeProvider>;
  }
}

export default withMeta(RootView);
