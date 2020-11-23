/**
 * ### Модификаторы обработки _Заказ покупателя_
 *
 * &copy; Evgeniy Malyarov http://www.oknosoft.ru 2014-2018
 *
 * Created 13.05.2016
 *
 * @module dp_buyers_order
 */

export default function ($p) {

  // переопределяем свойства цвет и система - они будут псевдонимами свойств текущей характеристики
  $p.DpBuyers_order = class DpBuyers_order extends $p.DpBuyers_order {

    get clr() {
      const {characteristic} = this;
      return characteristic.empty() ? this._getter('clr') : characteristic.clr;
    }

    set clr(v) {
      const {characteristic, _data} = this;
      if(characteristic.empty()) {
        return this.__setter('clr', v);
      }
      if(!v || characteristic.clr == v) {
        return;
      }
      this._manager.emit_async('update', this, {clr: characteristic.clr});
      characteristic.clr = v;
      _data._modified = true;
    }

    get sys() {
      const {characteristic} = this;
      return characteristic.empty() ? this._getter('sys') : characteristic.sys;
    }

    set sys(v) {
      const {characteristic, _data} = this;
      if(characteristic.empty()) {
        return this.__setter('sys', v);
      }
      if(!v || characteristic.sys == v) {
        return;
      }
      this._manager.emit_async('update', this, {sys: characteristic.sys});
      characteristic.sys = v;
      _data._modified = true;
    }

    get extra_fields() {
      return this.characteristic.params;
    }

    // установим количество по умолчению при добавлении строки
    add_row(row) {
      if(row._owner.name === 'production') {
        row.qty = row.quantity = 1;
      }
    }

    // TODO пробежать по всем строкам ниже удаляемой и заменить elm в параметрах
    del_row(row) {
      const {_owner: {_owner, _name}} = row;
      if(_name === 'production') {
        // удаляем параметры текущей строки
        _owner.product_params.clear({elm: row.row});
        // корректируем elm в параметрах нижележащих строк
        _owner.product_params.forEach(prm => {
          if (prm.elm > row.row) {
            prm.elm--;
          }
        });
      }
    }
  };

  // свойства и методы табчасти скидок
  $p.DpBuyers_orderCharges_discountsRow = class DpBuyers_orderCharges_discountsRow extends $p.DpBuyers_orderCharges_discountsRow {

    // при изменении реквизита
    value_change(field, type, value) {
      if(field == 'discount_percent') {
        const {_owner, nom_kind} = this;
        const {_mode, _calc_order} = _owner._owner;
        _calc_order.production.forEach((row) => {
          if(row.nom.nom_kind == nom_kind) {
            row[_mode] = parseFloat(value || 0);
          }
        });
      }
    }

  };

  // свойства и методы табчасти продукции
  $p.DpBuyers_orderProductionRow = class DpBuyers_orderProductionRow extends $p.DpBuyers_orderProductionRow {

    // при изменении вставки перезаполним параметры
    value_change(field, type, value) {

      if(field === 'len' || field === 'height') {
        this[field] = value;
        if(this.len != 0 && this.height != 0) {
          this.s = (this.height * this.len / 1000000).round(3);
        }
      }

      if(field === 'inset') {
        const {_owner, row} = this;
        if(this.inset != value || type === 'force') {
          this.inset = value;
          const {product_params} = _owner._owner;
          const defaults = this.inset.product_params;
          product_params.clear({elm: row});
          this.inset.used_params().forEach((param) => {
            const prow = product_params.add({elm: row, param: param});

            // подстановка умолчаний для параметра
            defaults.find_rows({param}, (drow) => {
              if(drow.value && (drow.value != $p.utils.blank.guid)) {
                prow.value = drow.value;
              }
              else if(drow.list) {
                try {
                  prow.value = JSON.parse(drow.list)[0];
                }
                catch (e) {}
              }
            });

            // подстановка умолчаний для цвета
            const {pclrs} = $p.DpBuyers_orderProductionRow;
            if(!pclrs.size) {
              const {properties} = $p.job_prm;
              pclrs.add(properties.clr_inset);
              pclrs.add(properties.clr_elm);
              pclrs.add(properties.clr_product);
            }
            defaults.forEach((drow) => {
              if(pclrs.has(drow.param)) {
                $p.record_log(`deprecated: Для установки цвета по умолчанию, используйте группу цветов вставки, а не предопределенный параметр
Вставка: ${this.inset.name} (${this.inset.id})`);
                this.clr = drow.value;
                return false;
              }
            });

          });
          this._manager.emit_async('rows', _owner._owner, {product_params: true});
        }
      }
    }

  };

  $p.DpBuyers_orderProductionRow.pclrs = new Set();

  // вызов формы подключаемого react компонента из dhtmlx
  $p.dp.buyers_order.open_component = function (wnd, o, handlers, component, area = 'DataObjPage') {

    let imodule;
    switch (component){
    case 'ClientOfDealer':
      imodule = import('../../components/CalcOrder/ClientOfDealer');
      break;
    case 'ClientOfDealerSearch':
      imodule = import('../../components/CalcOrder/ClientOfDealerSearch');
      break;
    case 'PushUtils':
      imodule = import('../../components/PushUtils');
      break;
    case 'Additions':
      imodule = import('../../components/CalcOrder/Additions');
      break;
    case 'AdditionsExt':
      imodule = import('../../components/CalcOrder/AdditionsExt');
      break;
    case 'Jalousie':
      imodule = import('../../components/CalcOrder/Jalousie');
      break;
    case 'ChangeRecalc':
      imodule = import('../../components/CalcOrder/ChangeRecalc');
      break;
      case 'Sysparams':
        imodule = import('../../components/CalcOrder/Sysparams');
        break;
    case 'CutEvaluation':
      imodule = import('../../components/CalcOrder/CutEvaluation');
      break;
    case 'DeliveryAddr':
      imodule = import('../../components/DeliveryAddr');
      break;
    case 'ObjHistory':
      imodule = import('wb-forms/dist/ObjHistory');
      break;
    }
    imodule.then((module) => handlers.handleIfaceState({
        component: area,
        name: 'dialog',
        value: {
          ref: o.ref,
          cmd: o.cmd,
          _mgr: o._mgr || o._manager,
          wnd: wnd,
          Component: module.default
        },
      }));
  };

}
