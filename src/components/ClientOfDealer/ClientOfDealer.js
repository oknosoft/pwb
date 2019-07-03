/**
 * ### Карточка покупателя
 * каркас компонента - визуальная глупая часть
 *
 * Created by Evgeniy Malyarov on 13.11.2017.
 */

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import Button from '@material-ui/core/Button';
import Dialog from 'metadata-react/App/Dialog';
//import Dialog from './Dialog';
import connect from './connect';
import FormGroup from '@material-ui/core/FormGroup';
import DataField from 'metadata-react/DataField';

import Paper from '@material-ui/core/Paper';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import TextField from '@material-ui/core/TextField';

class ClientOfDealer extends Component {

  constructor(props, context) {
    super(props, context);
    const {handleCancel, handleCalck, dialog: {ref, cmd, _mgr}} = props;
    this.handleCancel = handleCancel.bind(this);
    this.handleCalck = handleCalck.bind(this);
    this.handleChange = this.handleChange.bind(this)
    this.state = {
      msg: null,
      valTab: 0
    };

    this.obj = _mgr.by_ref[ref];
    const meta = this.meta = _mgr.metadata().form[cmd];
    const data = this.data = this.obj[cmd].split('\u00A0');

    // виртуальные данные
    const fields = Object.keys(meta.fields);
    this.fake_obj = {
      _metadata(fld) {
        return fld ? meta.fields[fld] : meta;
      },

      get _manager() {
        return _mgr;
      },

    };
    for (const fld of fields) {
      this.fake_obj.__define(fld, {
        get() {
          return $p.utils.fetch_type(data[fields.indexOf(fld)], meta.fields[fld]);
        },
        set(v) {
          data[fields.indexOf(fld)] = v;
        }
      });
    }
  }


  handleOk = () => {
    const {data, obj, meta, fake_obj, props: {dialog}} = this;

    // если не указаны обязательные реквизиты
    for (var mf in meta.fields) {
      if (meta.fields[mf].mandatory && !fake_obj[mf]) {
        this.setState({
          msg: {
            title: $p.msg.mandatory_title,
            text: $p.msg.mandatory_field.replace("%1", meta.fields[mf].synonym)
          }
        });
        return;
      }
    }

    obj[dialog.cmd] = data.join('\u00A0');
    this.handleCancel();
  };

  handleErrClose = () => {
    this.setState({msg: null});
  };

  renderUi(items) {

    return items.map((item, index) => {

      if (Array.isArray(item)) {
        return this.renderIt(item);
      }

      if (item.element === 'DataBtn') {
        return <Tab key={'tab' + index} label={item.label}/>
      }

      if (item.element === 'BtnGroup') {
        return <Paper>
          <Tabs key={'tabs' + index} value={this.state.valTab} onChange={this.handleChange}>
            {this.renderUi(item.items)}
          </Tabs>
        </Paper>
      }
    });
  }

  renderIt(items) {

    const {fake_obj, meta} = this;

    return items.map((item, index) => {

      if (Array.isArray(item)) {
        return this.renderIt(item);
      }

      if (item.element === 'DataField') {
        return <DataField key={'df' + index} _obj={fake_obj} _fld={item.fld} _meta={meta.fields[item.fld]}/>;
      }

      if (item.element === 'FormGroup') {
        return <FormGroup key={'fg' + index} row={item.row}>{this.renderIt(item.items)}</FormGroup>;
      }

      return <div key={'div' + index}>Не реализовано в текущей версии</div>;
    });
  }

  handleChange(event, index) {
    this.setState({valTab: index});
  }

  render() {

    const {handleCancel, handleOk, handleErrClose, meta, state: {msg}} = this;

    return <Dialog
      open
      initFullScreen
      large
      title="Реквизиты клиента"
      onClose={handleCancel}
      actions={[
        <Button key="ok" onClick={handleOk} color="primary">Записать и закрыть</Button>,
        <Button key="cancel" onClick={handleCancel} color="primary">Закрыть</Button>
      ]}
    >
      {this.renderUi(meta.ui.items)}
      {this.renderIt(meta.obj2[this.state.valTab].items)}
      {msg && <Dialog
        open
        title={msg.title}
        onClose={handleErrClose}
        actions={[
          <Button key="ok" onClick={handleErrClose} color="primary">Ок</Button>,
        ]}
      >
        {msg.text || msg}
      </Dialog>}
    </Dialog>;

  }
}

ClientOfDealer.propTypes = {
  dialog: PropTypes.object.isRequired,
  handlers: PropTypes.object.isRequired,
  handleCalck: PropTypes.func.isRequired,
  handleCancel: PropTypes.func.isRequired,
};

export default connect(ClientOfDealer);
