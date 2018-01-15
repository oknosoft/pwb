/**
 * ### Модификаторы обработки _Заказ покупателя_
 *
 * &copy; Evgeniy Malyarov http://www.oknosoft.ru 2014-2018
 *
 * Created 13.05.2016
 *
 * @module dp_buyers_order
 */

import CalcOrderAdditions from '../../components/CalcOrderAdditions';

export default function ($p) {

  // переопределяем свойства цвет и система - они будут псевдонимами свойств текущей характеристики
  $p.DpBuyers_order = class DpBuyers_order extends $p.DpBuyers_order {

    get clr() {
      return this.characteristic.clr;
    }

    set clr(v) {
      const {characteristic, _data} = this;
      if((!v && characteristic.empty()) || characteristic.clr == v) {
        return;
      }
      this._manager.emit_async('update', this, {clr: characteristic.clr});
      characteristic.clr = v;
      _data._modified = true;
    }

    get sys() {
      return this.characteristic.sys;
    }

    set sys(v) {
      const {characteristic, _data} = this;
      if((!v && characteristic.empty()) || characteristic.sys == v) {
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
      if(row._owner.name === 'production') {
        return;
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

      if(field == 'len' || field == 'height') {
        this[field] = value;
        if(this.len != 0 && this.height != 0) {
          this.s = (this.height * this.len / 1000000).round(3);
        }
      }

      if(field == 'inset') {
        const {_owner, row} = this;
        if(this.inset != value) {
          this.inset = value;
          const {product_params} = _owner._owner;
          product_params.clear({elm: row});
          this.inset.used_params.forEach((param) => product_params.add({
            elm: row,
            param: param
          }));
          this._manager.emit_async('rows', _owner._owner, {product_params: true});
        }
      }
    }

  };

  // форма допов и услуг
  $p.dp.buyers_order.open_additions = function (wnd, o, handlers) {

    handlers.handleIfaceState({
      component: 'DataObjPage',
      name: 'dialog',
      value: {
        ref: o.ref,
        wnd: wnd,
        Component: CalcOrderAdditions
      },
    });
  };

}


