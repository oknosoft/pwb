/**
 * форма документа Расчет-заказ. публикуемый метод: doc.calc_order.form_obj(o, pwnd, attr)
 *
 * &copy; Evgeniy Malyarov http://www.oknosoft.ru 2014-2018
 *
 * @module doc_calc_order_form_obj
 */

(function ($p) {

  const _mgr = $p.doc.calc_order;
  let _meta_patched;

  function fill_btns(wnd) {
    const toolbar = wnd.getAttachedToolbar();
    const {cat: {formulas}, current_user: {branch}} = $p;
    formulas.find_rows({parent: formulas.predefined('filling')}, (formula) => {
      if(formula.params.find({param: 'destination', value: 'doc.calc_order'})) {
        // костыльный фильтр 'filter.branch.keys.has'
        const br_keys = formula.params.find({param: 'filter.branch.keys.has'});
        if(br_keys && !branch.empty() && !branch.keys.find({acl_obj: br_keys._obj.value})) {
          return;
        }
        toolbar.addListOption('bs_create_by_virtue', `fill_${formula.ref}`, '~', 'button', formula.name);
      }
    });
  }

  _mgr.form_obj = function (pwnd, attr, handlers) {

    let o, wnd;

    /**
     * структура заголовков табчасти продукции
     * @param source
     */
    if(!_meta_patched) {
      (function (source, user) {
        // TODO: штуки сейчас спрятаны в ro и имеют нулевую ширину
        if($p.wsql.get_user_param('hide_price_dealer')) {
          source.headers = '№,Номенклатура,Характеристика,Комментарий,Штук,Длина,Высота,Площадь,Колич.,Ед,Скидка,Цена,Сумма,Скидка&nbsp;дил,Цена&nbsp;дил,Сумма&nbsp;дил';
          source.widths = '40,200,*,220,0,0,0,90,70,40,70,70,90,0,0,0';
          source.min_widths = '30,200,220,140,0,0,0,80,70,70,70,70,90,0,0,0';
        }
        else if($p.wsql.get_user_param('hide_price_manufacturer')) {
          source.headers = '№,Номенклатура,Характеристика,Комментарий,Штук,Длина,Высота,Площадь,Колич.,Ед,Скидка&nbsp;пост,Цена&nbsp;пост,Сумма&nbsp;пост,Скидка,Цена,Сумма';
          source.widths = '40,200,*,220,0,0,0,90,70,40,0,0,0,70,70,90';
          source.min_widths = '30,200,220,140,0,0,0,80,70,70,0,0,0,70,70,90';
        }
        else {
          source.headers = '№,Номенклатура,Характеристика,Комментарий,Штук,Длина,Высота,Площадь,Колич.,Ед,Скидка&nbsp;пост,Цена&nbsp;пост,Сумма&nbsp;пост,Скидка&nbsp;дил,Цена&nbsp;дил,Сумма&nbsp;дил';
          source.widths = '40,200,*,220,0,0,0,90,70,40,70,70,90,70,70,90';
          source.min_widths = '30,200,220,140,0,0,0,80,70,70,70,70,90,70,70,90';
        }

        if(user.role_available('СогласованиеРасчетовЗаказов') || user.role_available('РедактированиеЦен') || user.role_available('РедактированиеСкидок')) {
          source.types = 'cntr,ref,ref,txt,ro,ro,ro,ro,calck,ref,calck,calck,ro,calck,calck,ro';
        }
        else {
          source.types = 'cntr,ref,ref,txt,ro,ro,ro,ro,calck,ref,ro,calck,ro,calck,calck,ro';
        }

        _meta_patched = true;

      })($p.doc.calc_order.metadata().form.obj.tabular_sections.production, $p.current_user);
    }

    attr.draw_tabular_sections = (o, wnd, tabular_init) => {

      attr.tabular_init = tabular_init;

      /**
       *  статусбар с картинками
       */
      wnd.elmnts.statusbar = wnd.attachStatusBar();
      wnd.elmnts.svgs = new $p.iface.OSvgs(wnd, wnd.elmnts.statusbar, rsvg_click);
    };

    attr.draw_pg_header = (o, wnd) => {

      function layout_resize_finish() {
        setTimeout(() => {
          if(wnd.elmnts && wnd.elmnts.layout_header && wnd.elmnts.layout_header.setSizes) {
            wnd.elmnts.layout_header.setSizes();
            wnd.elmnts.pg_left.objBox.style.width = '100%';
            wnd.elmnts.pg_right.objBox.style.width = '100%';
          }
        }, 200);
      }

      /**
       *  закладка шапка
       */
      wnd.elmnts.layout_header = wnd.elmnts.tabs.tab_header.attachLayout('3U');

      wnd.elmnts.layout_header.attachEvent('onResizeFinish', layout_resize_finish);

      wnd.elmnts.layout_header.attachEvent('onPanelResizeFinish', layout_resize_finish);

      /**
       *  левая колонка шапки документа
       */
      wnd.elmnts.cell_left = wnd.elmnts.layout_header.cells('a');
      wnd.elmnts.cell_left.hideHeader();
      const struct = {
        obj: o,
        pwnd: wnd,
        read_only: wnd.elmnts.ro,
        oxml: {
          ' ': [
            {id: 'number_doc', path: 'o.number_doc', synonym: 'Номер', type: 'ro'},
            {id: 'date', path: 'o.date', synonym: 'Дата', type: 'ro', txt: moment(o.date).format(moment._masks.date_time)},
            'number_internal'
          ],
          'Контактная информация': [
            'partner',
            {id: 'client_of_dealer', path: 'o.client_of_dealer', synonym: 'Клиент дилера', type: 'client'},
            'phone',
            {id: 'shipping_address', path: 'o.shipping_address', synonym: 'Адрес доставки', type: 'addr'}
          ],
          'Дополнительные реквизиты': [
            'obj_delivery_state',
            'category',
            {id: 'manager', path: 'o.manager', synonym: 'Автор', type: 'ro'},
            'leading_manager'
          ]
        }
      };
      if(o.obj_delivery_state == 'Шаблон') {
        const permitted_sys = $p.cch.properties.predefined('permitted_sys');
        struct.oxml['Дополнительные реквизиты'].push({
          id: `extra_fields|${permitted_sys.ref}`,
          path: '', //'extra_fields.find({property}).txt_row',
          synonym: 'Разрешенные системы',
          type: 'permitted_sys'
        });
      }
      wnd.elmnts.pg_left = wnd.elmnts.cell_left.attachHeadFields(struct);

      wnd.elmnts.pg_left.xcell_action = function (component, fld) {
        $p.dp.buyers_order.open_component(wnd, {
          ref: o.ref,
          cmd: fld,
          _mgr: _mgr,
        }, handlers, component);
      };

      /**
       *  правая колонка шапки документа
       * TODO: задействовать либо удалить choice_links
       * var choice_links = {contract: [
				 * {name: ["selection", "owner"], path: ["partner"]},
				 * {name: ["selection", "organization"], path: ["organization"]}
				 * ]};
       */

      wnd.elmnts.cell_right = wnd.elmnts.layout_header.cells('b');
      wnd.elmnts.cell_right.hideHeader();
      wnd.elmnts.pg_right = wnd.elmnts.cell_right.attachHeadFields({
        obj: o,
        pwnd: wnd,
        read_only: wnd.elmnts.ro,
        oxml: {
          'Налоги': ['vat_consider', 'vat_included'],
          'Аналитика': ['project',
            {id: 'organization', path: 'o.organization', synonym: 'Организация', type: 'refc'},
            {id: 'contract', path: 'o.contract', synonym: 'Договор', type: 'refc'},
            {id: 'bank_account', path: 'o.bank_account', synonym: 'Счет организации', type: 'refc'},
            {id: 'department', path: 'o.department', synonym: 'Офис продаж', type: 'refc'},
            {id: 'warehouse', path: 'o.warehouse', synonym: 'Склад отгрузки', type: 'refc'},
          ],
          'Итоги': [
            {id: 'weight', path: 'o.weight', synonym: 'Масса изделий, кг', type: 'ron', txt: o.weight},
            {id: 'areas', path: 'o.areas', synonym: 'Площадь изделий, м²', type: 'ro', txt: o.areas},
            {id: 'doc_currency', path: 'o.doc_currency', synonym: 'Валюта документа', type: 'ro', txt: o['doc_currency'].toString()},
            {id: 'doc_amount', path: 'o.doc_amount', synonym: 'Сумма', type: 'ron', txt: o.doc_amount},
            {id: 'amount_internal', path: 'o.amount_internal', synonym: 'Сумма внутр', type: 'ron', txt: o.amount_internal},
          ]
        }
      });

      /**
       *  редактор комментариев
       */
      wnd.elmnts.cell_note = wnd.elmnts.layout_header.cells('c');
      wnd.elmnts.cell_note.hideHeader();
      wnd.elmnts.cell_note.setHeight(100);
      wnd.elmnts.cell_note.attachHTMLString(`<textarea placeholder='Комментарий к заказу' class='textarea_editor'>${o.note}</textarea>`);

      if(Array.isArray(_mgr.form_obj.on_create)) {
        for(const method of _mgr.form_obj.on_create) {
          try{
            method({o, wnd});
          }
          catch (e) {

          }
        }
      }
    };

    attr.toolbar_struct = $p.injected_data['toolbar_calc_order_obj.xml'];

    attr.toolbar_click = toolbar_click;

    attr.on_close = frm_close;

    return this.constructor.prototype.form_obj.call(this, pwnd, attr)
      .then((res) => {
        if(res) {
          o = res.o;
          wnd = res.wnd;
          wnd.prompt = prompt;
          wnd.close_confirmed = true;
          if(handlers) {
            wnd.handleNavigate = handlers.handleNavigate;
            wnd.handleIfaceState = handlers.handleIfaceState;
          }

          (o._data._reload ? o.load() : Promise.resolve())
            .then(() => {
              if(o.obj_delivery_state == 'Шаблон') {
                return o.load_templates();
              }
              else {
                if(o._data._reload) {
                  delete o._data._reload;
                  _mgr.emit_async('rows', o, {'production': true});
                }
                return o.load_linked_refs();
              }
            })
            .then(() => {

              const footer = {
                columns: ",,,,#stat_t,,,#stat_s,,,,,#stat_t,,,#stat_t",
                _in_header_stat_s (tag, index, data) {
                  const calck = function () {
                    return o.areas;
                  };
                  this._stat_in_header(tag, calck, index, data);
                },
                _in_header_stat_t (tag, index, data) {
                  const column = this.columnIds[index];
                  const calck = function () {
                    let sum = 0;
                    for(const row of o.production) {
                      sum += row[column];
                    }
                    return sum.round(2).toLocaleString('ru-RU') + '\u00a0';
                  };
                  this._stat_in_header(tag, calck, index, data);
                }
              };

              // табчасть продукции со специфическим набором кнопок
              attr.tabular_init('production', $p.injected_data['toolbar_calc_order_production.xml'], footer);
              attr.tabular_init('planning');

              const {production} = wnd.elmnts.grids;
              production.disable_sorting = true;
              production.attachEvent('onRowSelect', production_select);
              production.attachEvent('onEditCell', (stage,rId,cInd,nValue,oValue,fake) => {
                if(stage == 2 && fake !== true){
                  if(production._edit_timer){
                    clearTimeout(production._edit_timer);
                  }
                  production._edit_timer = setTimeout(() => {
                    if(wnd && wnd.elmnts) {
                      const {selection} = production;
                      production.selection = selection;
                      production.selectCell(rId - 1, cInd);
                    }
                  }, 160);
                }
              });

              let toolbar = wnd.elmnts.tabs.tab_production.getAttachedToolbar();
              toolbar.addSpacer('btn_delete');
              toolbar.attachEvent('onclick', toolbar_click);

              // табчасть планирования
              toolbar = wnd.elmnts.tabs.tab_planning.getAttachedToolbar();
              toolbar.addButton('btn_fill_plan', 3, 'Заполнить');
              toolbar.attachEvent('onclick', toolbar_click);

              // подключаемые действия
              fill_btns(wnd);

              // в зависимости от статуса
              set_editable(o, wnd);

              rsvg_reload();
              o._manager.on('svgs', rsvg_reload);

              const search = $p.job_prm.parse_url_str(location.search);
              if(search.ref) {
                setTimeout(() => {
                  wnd.elmnts.tabs.tab_production && wnd.elmnts.tabs.tab_production.setActive();
                  rsvg_click(search.ref, 0);
                }, 200);
              }
            })
            .catch(() => {
              delete o._data._reload;
            });

          return res;
        }
      });

    /**
     * проверка, можно ли покидать страницу
     * @param loc
     * @return {*}
     */
    function prompt(loc) {
      if(loc.pathname.match(/\/builder|\/templates/)) {
        return true;
      }
      return (o && o._modified) ? `${o.presentation} изменён.\n\nЗакрыть без сохранения?` : true;
    }

    function close() {
      if(o && o._obj) {
        const {ref, state} = o._obj;
        handlers.handleNavigate(`/?ref=${ref}&state_filter=${state || 'draft'}`);
      }
      else {
        handlers.handleNavigate(`/`);
      }
      $p.doc.calc_order.off('svgs', rsvg_reload);
    }

    /**
     * При активизации строки продукции
     * @param id
     * @param ind
     */
    function production_select(id, ind) {
      const row = o.production.get(id - 1);
      const {svgs, grids: {production}} = wnd.elmnts;
      svgs.select(row.characteristic.ref);

      // если пользователь неполноправный, проверяем разрешение изменять цены номенклатуры
      if(production.columnIds[ind] === 'price') {
        const {current_user, CatParameters_keys, utils, enm: {comparison_types, parameters_keys_applying}} = $p;
        if(current_user.role_available('СогласованиеРасчетовЗаказов') || current_user.role_available('РедактированиеЦен')) {
          production.cells(id, ind).setDisabled(false);
        }
        else {
          const {nom} = row;
          let disabled = true;
          current_user.acl_objs.forEach(({acl_obj}) => {
            if(acl_obj instanceof CatParameters_keys && acl_obj.applying == parameters_keys_applying.Ценообразование) {
              acl_obj.params.forEach(({value, comparison_type}) => {
                if(utils.check_compare(nom, value, comparison_type, comparison_types)) {
                  return disabled = false;
                }
              });
              if(!disabled) {
                return disabled;
              }
            }
          });

          return production.cells(id, ind).setDisabled(disabled);
        }
      }

      // если изделие или вложенное изделие или комплектация - блокируем все поля
      else if(row.characteristic.calc_order === o || row.nom === $p.job_prm.nom.accessories) {
        if(!['discount_percent', 'discount_percent_internal', 'price_internal', 'amount_internal', 'note'].includes(production.columnIds[ind])) {
          production.cells(id, ind).setDisabled(true);
        }
      }

      // если выбрана номенклатура
      else if (['nom', 'characteristic'].includes(production.columnIds[ind])) {
        production.cells(id, ind).setDisabled(!row.characteristic.calc_order.empty());
      }
    }

    /**
     * обработчик нажатия кнопок командных панелей
     */
    function toolbar_click(btn_id) {

      const {ui, dp: {buyers_order}} = $p;

      switch (btn_id) {

      case 'btn_sent':
        save('sent');
        break;

      case 'btn_save':
        save('save');
        break;

      case 'btn_save_close':
        save('close');
        break;

      case 'btn_retrieve':
        save('retrieve');
        break;

      case 'btn_reload':
        reload();
        break;

      case 'btn_post':
        save('post');
        break;

      case 'btn_unpost':
        save('unpost');
        break;

      case 'btn_fill_plan':
        o.fill_plan();
        break;

      case 'btn_close':
        close();
        break;

      case 'btn_add_builder':
        open_builder(true);
        break;

      case 'btn_clone':
        open_builder('clone');
        break;

      case 'btn_add_product':
        (o.is_new() ? o.save() : Promise.resolve())
          .then(() => buyers_order.open_component(wnd, o, handlers, 'AdditionsExt'));
        break;

      case 'btn_additions':
        (o.is_new() ? o.save() : Promise.resolve())
          .then(() => buyers_order.open_component(wnd, o, handlers, 'Additions'));
        break;

      case 'btn_jalousie':
        open_jalousie(true);
        break;

      case 'cut_evaluation':
      case 'cut_evaluation_2d':
        cut_evaluation(btn_id === 'cut_evaluation_2d');
        break;

      case 'btn_share':
        buyers_order.open_component(wnd, {ref: o.ref, cmd: btn_id}, handlers, 'PushUtils');
        break;

      case 'btn_add_material':
        add_material();
        break;

      case 'btn_edit':
        open_builder();
        break;

      case 'btn_recalc_row':
        recalc('row');
        break;

      case 'btn_recalc_doc':
        recalc('doc');
        break;

      case 'btn_change_recalc':
        change_recalc();
        break;

      case 'btn_prod_import':
        prod_import();
        break;

      case 'btn_prod_export':
        prod_export();
        break;

      case 'btn_spec':
        open_spec();
        break;

      case 'btn_discount':
        show_discount();
        break;

      case 'btn_go_connection':
        go_connection();
        break;

      case 'btn_history':
        buyers_order.open_component(wnd, {
          ref: o.ref,
          cmd: {hfields: null, db: null},
          _mgr
        }, handlers, 'ObjHistory');
        break;

      case 'btn_number':
        const {current_user} = $p;
        const {_manager, obj_delivery_state, number_doc, date} = o;
        const title = `Заказ №${number_doc} от ${moment(date).format(moment._masks.date_time)}`;
        if (current_user.role_available('ИзменениеТехнологическойНСИ') || current_user.role_available('СогласованиеРасчетовЗаказов')) {
          ui.dialogs.input_value({
            title,
            text: 'Новый номер',
            type: 'string',
            initialValue: number_doc,
          })
            .then((number) => {
              if (number.length !== 11) {
                throw new Error('Длина номера должна быть 11 символов');
              }
              if (number !== number_doc) {
                const db = obj_delivery_state == 'Шаблон' ? _manager.adapter.db({cachable: 'ram'}) : _manager.adapter.db(_manager);
                return db.query('doc/number_doc', {key: [_manager.class_name, date.getFullYear(), number]})
                  .then((res) => {
                    if (res.rows.length) {
                      throw new Error(`Заказ с номером ${number} уже существует в базе за ${date.getFullYear()} год`);
                    }
                    o.number_doc = number;
                    return o.save();
                  });
              }
            })
            .catch((err) => {
              err && ui.dialogs.alert({title, text: err.message});
            });
        }
        else {
          ui.dialogs.alert({title, text: 'Недостаточно прав для изменения номера документа'});
        }
        break;

      case 'calc_order':
        clone_calc_order(o);
        break;

      case 'btn_print':
        const {_spacer} = this;
        ui.dialogs.popup({
          anchorEl: _spacer,
          _mgr,
          handlePrint: (model) => _mgr.print(o, model),
          variant: 'hidden',
        });
        break;
    }

      if(btn_id.startsWith('prn_')) {
        _mgr.print(o, btn_id, wnd);
      }
      else if(btn_id.startsWith('fill_')) {
        const formula = $p.cat.formulas.get(btn_id.substr(5));
        formula && formula.execute(o);
      }
    }

    /**
     * показывает список связанных документов
     */
    function go_connection() {
      $p.msg.show_not_implemented();
    }

    /**
     * копирует заказ
     * @param o
     * @return {undefined}
     */
    function clone_calc_order(o) {
      const {_manager} = o;
      if(o._modified) {
        return $p.msg.show_msg({
          title: o.presentation,
          type: 'alert-warning',
          text: 'Документ изменён.<br />Перед созданием копии сохраните заказ'
        });
      }
      handlers.handleIfaceState({
        component: '',
        name: 'repl',
        value: {root: {title: 'Длительная операция', text: 'Копирование и пересчет заказа'}},
      });
      handlers.handleNavigate(`/waiting`);
      _manager.clone(o)
        .then((doc) => {
          handlers.handleNavigate(`/${_manager.class_name}/${doc.ref}`);
        })
        .catch((err) => {
          $p.record_log(err);
          handlers.handleNavigate(`/`);
        });
    }

    /**
     * создаёт и показывает диалог групповых скидок
     */
    function show_discount() {

      if(!wnd.elmnts.discount) {
        wnd.elmnts.discount = $p.dp.buyers_order.create();
      }
      // перезаполняем
      refill_discount(wnd.elmnts.discount);

      const discount = $p.iface.dat_blank(null, {
        width: 300,
        height: 220,
        allow_close: true,
        allow_minmax: false,
        caption: 'Скидки по группам'
      });
      discount.setModal(true);

      discount.attachTabular({
        obj: wnd.elmnts.discount,
        ts: 'charges_discounts',
        reorder: false,
        disable_add_del: true,
        toolbar_struct: $p.injected_data['toolbar_discounts.xml'],
        ts_captions: {
          'fields': ['nom_kind', 'discount_percent'],
          'headers': 'Группа,Скидка',
          'widths': '*,80',
          'min_widths': '120,70',
          'aligns': '',
          'sortings': 'na,na',
          'types': 'ro,calck'
        },
      });
      const toolbar = discount.getAttachedToolbar();
      toolbar.attachEvent('onclick', (btn) => {
        wnd.elmnts.discount._mode = btn;
        refill_discount(wnd.elmnts.discount);
        toolbar.setItemText('bs', toolbar.getListOptionText('bs', btn));
      });
      if(wnd.elmnts.discount._disable_internal) {
        toolbar.disableListOption('bs', 'discount_percent');
      }
      toolbar.setItemText('bs', toolbar.getListOptionText('bs', wnd.elmnts.discount._mode));
    }

    function refill_discount(dp) {

      if(!dp._mode) {
        dp._disable_internal = !$p.current_user.role_available('РедактированиеСкидок');
        dp._mode = dp._disable_internal ? 'discount_percent_internal' : 'discount_percent';
        dp._calc_order = o;
      }

      const {charges_discounts} = dp;
      const groups = new Set();
      dp._data._loading = true;
      charges_discounts.clear();
      o.production.forEach((row) => {
        const group = {nom_kind: row.nom.nom_kind};
        if(!groups.has(group.nom_kind)) {
          groups.add(group.nom_kind);
          charges_discounts.add(group);
        }
        charges_discounts.find_rows(group, (sub) => {
          const percent = row[dp._mode];
          if(percent > sub.discount_percent) {
            sub.discount_percent = percent;
          }
        });
      });
      dp._data._loading = false;
      dp._manager.emit_async('rows', dp, {'charges_discounts': true});
    }


    /**
     * вспомогательные функции
     */

    function production_get_sel_index() {
      const selId = wnd.elmnts.grids.production.getSelectedRowId();
      if(selId && !isNaN(Number(selId))) {
        return Number(selId) - 1;
      }

      $p.msg.show_msg({
        type: 'alert-warning',
        text: $p.msg.no_selected_row.replace('%1', 'Продукция'),
        title: o.presentation
      });
    }

    function reload() {
      o && o.load()
        .then(() => o.load_linked_refs())
        .then(() => {
          const {pg_left, pg_right, grids: {production}} = wnd.elmnts;
          const {selection} = production;
          pg_left.reload();
          pg_right.reload();
          production.selection = selection;
          wnd.set_text();
        });
    }

    function save(action) {

      const {msg, enm} = $p;

      function do_save(post) {

        wnd.progressOn();

        if(!wnd.elmnts.ro) {
          o.note = wnd.elmnts.cell_note.cell.querySelector('textarea').value.replace(/&nbsp;/g, ' ').replace(/<.*?>/g, '').replace(/&.{2,6};/g, '');
          wnd.elmnts.pg_left.selectRow(0);
        }

        o.save(post)
          .then(() => {
            wnd.progressOff();
            if(action == 'sent' || action == 'close') {
              close();
            }
            else {
              wnd.set_text();
              set_editable(o, wnd);
            }
          })
          .catch((err) => {
            wnd.progressOff();
            if(err._rev) {
              // показать диалог и обработать возврат
              dhtmlx.confirm({
                title: o.presentation,
                text: err.message + '<div style="text-align: left;padding-top: 16px;">Ваши правки потеряны, можно закрыть форму либо прочитать актуальную версию заказа с сервера</div>',
                cancel: 'Прочитать',
                callback: (btn) => {
                  btn === false && reload();
                }
              });
            }
            else {
              msg.show_msg({
                type: 'alert-warning',
                text: err.message || err,
                title: o.presentation
              });
            }
          });
      }

      switch (action) {
      case 'sent':
        // показать диалог и обработать возврат
        dhtmlx.confirm({
          title: msg.order_sent_title,
          text: msg.order_sent_message,
          cancel: msg.cancel,
          callback: function (btn) {
            if(btn) {
              // установить транспорт в "отправлено" и записать
              o.obj_delivery_state = enm.obj_delivery_states.Отправлен;
              do_save();
            }
          }
        });
        break;

      case 'retrieve':
        // установить транспорт в "отозвано" и записать
        o.obj_delivery_state = enm.obj_delivery_states.Отозван;
        do_save();
        break;

      case 'post':
        do_save(true);
        break;

      case 'unpost':
        do_save(false);
        break;

      default:
        do_save();
      }
    }

    function frm_close() {

      // выгружаем из памяти всплывающие окна скидки и связанных файлов
      ['vault', 'vault_pop', 'discount', 'svgs', 'layout_header'].forEach((elm) => {
        wnd && wnd.elmnts && wnd.elmnts[elm] && wnd.elmnts[elm].unload && wnd.elmnts[elm].unload();
      });

      return true;
    }

    // устанавливает видимость и доступность
    function set_editable(o, wnd) {

      const {pg_left, pg_right, frm_toolbar, grids, tabs} = wnd.elmnts;

      pg_right.cells('vat_consider', 1).setDisabled(true);
      pg_right.cells('vat_included', 1).setDisabled(true);

      const ro = wnd.elmnts.ro = o.is_read_only;
      const {enm: {obj_delivery_states: {Отправлен, Отклонен, Шаблон}}, current_user} = $p;

      const retrieve_enabed = !o._deleted &&
        (o.obj_delivery_state == Отправлен || o.obj_delivery_state == Отклонен);

      grids.production.setEditable(!ro);
      grids.planning.setEditable(!ro);
      pg_left.setEditable(!ro);
      pg_right.setEditable(!ro);

      // гасим кнопки проведения, если недоступна роль
      if(!current_user.role_available('СогласованиеРасчетовЗаказов')) {
        frm_toolbar.hideItem('btn_post');
        frm_toolbar.hideItem('btn_unpost');
      }

      // если не технологи и не менеджер - запрещаем менять статусы
      if(!current_user.role_available('ИзменениеТехнологическойНСИ') && !current_user.role_available('СогласованиеРасчетовЗаказов')) {
        pg_left.cells('obj_delivery_state', 1).setDisabled(true);
      }

      // кнопки записи и отправки гасим в зависимости от статуса
      if(ro) {
        frm_toolbar.disableItem('btn_sent');
        frm_toolbar.disableItem('btn_save');
        frm_toolbar.disableItem('btn_save_close');
        let toolbar;
        const disable = (itemId) => toolbar.disableItem(itemId);
        toolbar = tabs.tab_production.getAttachedToolbar();
        toolbar.forEachItem(disable);
        toolbar = tabs.tab_planning.getAttachedToolbar();
        toolbar.forEachItem(disable);
      }
      else {
        // шаблоны никогда не надо отправлять
        if(o.obj_delivery_state == Шаблон) {
          frm_toolbar.disableItem('btn_sent');
        }
        else {
          frm_toolbar.enableItem('btn_sent');
        }
        frm_toolbar.enableItem('btn_save');
        frm_toolbar.enableItem('btn_save_close');
        let toolbar;
        const enable = (itemId) => toolbar.enableItem(itemId);
        toolbar = tabs.tab_production.getAttachedToolbar();
        toolbar.forEachItem(enable);
        toolbar = tabs.tab_planning.getAttachedToolbar();
        toolbar.forEachItem(enable);
      }
      if(retrieve_enabed) {
        frm_toolbar.enableListOption('bs_more', 'btn_retrieve');
      }
      else {
        frm_toolbar.disableListOption('bs_more', 'btn_retrieve');
      }
    }

    /**
     * показывает диалог с сообщением "это не продукция"
     */
    function not_production() {
      const {msg} = $p;
      msg.show_msg({
        title: msg.bld_title,
        type: 'alert-error',
        text: msg.bld_not_product
      });
    }

    /**
     * Пересчитывает строку или весь заказ
     * @param [mode] {String} - если 'row' - пересчет строки
     */
    function recalc(mode) {
      if(mode == 'row') {
        const selId = production_get_sel_index();
        if(selId == undefined) {
          return not_production();
        }
        const row = o.production.get(selId);
        if(row) {
          const {owner, calc_order, leading_product} = row.characteristic;
          let ox;
          if(row.characteristic.empty() || calc_order.empty() || owner.is_procedure || owner.is_accessory) {
            return not_production();
          }
          else if(!row.characteristic.coordinates.count()) {
            // возможно, это подчиненная продукция
            if(leading_product.calc_order == calc_order) {
              ox = leading_product;
            }
          }
          else {
            ox = row.characteristic;
          }
          if(ox) {
            wnd.progressOn();
            ox.recalc()
              .catch((err) => {
                $p.msg.show_msg({
                  title: $p.msg.bld_title,
                  type: 'alert-error',
                  text: err.stack || err.message
                });
              })
              .then(() => wnd.progressOff());
          }
        }
      }
      else {
        wnd.progressOn();
        o.recalc({save: true})
          .catch((err) => {
            $p.msg.show_msg({
              title: $p.msg.bld_title,
              type: 'alert-error',
              text: err.stack || err.message
            });
          })
          .then(() => {
            wnd.progressOff();
            wnd.set_text();
          });
      }
    }

    /**
     * Открывает диалог пересчета со сменой системы и прочих параметров
     */
    function change_recalc() {
      $p.dp.buyers_order.open_component(wnd, {ref: o.ref, _mgr}, handlers, 'ChangeRecalc');
    }

    /**
     * Копирует продукцию текущей строки в буфер обмена
     */
    function prod_export() {
      const selId = production_get_sel_index();
      if(selId == undefined) {
        not_production();
      }
      else {
        const {utils, ui: {dialogs}} = $p;
        const row = o.production.get(selId);
        if(row) {
          const {owner, calc_order} = row.characteristic;
          if(row.characteristic.empty() || calc_order.empty() || owner.is_procedure || owner.is_accessory) {
            not_production();
          }
          else if(row.characteristic.coordinates.count()) {
            const json = JSON.stringify(utils._mixin({class_name: row.characteristic.class_name}, row.characteristic._obj, [],
              'ref,_rev,branch,name,calc_order,product,leading_product,leading_elm,origin,partner,department,specification,svg,class_name'.split(',')));
            navigator.clipboard.writeText(json)
              .then(() => dialogs.alert({
                title: 'Экспорт данных',
                text: `${row.characteristic.prod_name(true)} скопировано в буфер обмена`,
              }))
              .catch(err => dialogs.alert({text: err.message}));
          }
          else {
            not_production();
          }
        }
      }
    }

    /**
     * Добавляет строку из буфера обмена
     */
    function prod_import() {
      const err = new TypeError('В буфере обмена нет подходящих данных');
      $p.dp.buyers_order.open_component(wnd, {
        _mgr,
        ref: o.ref,
        cmd: {
          fin(raw, refill) {
            open_builder(raw);
          }
        }
      }, handlers, 'FromClipboard');
      // navigator.clipboard.readText()
      //   .then((text) => JSON.parse(text))
      //   .catch(() => {
      //     throw err;
      //   })
      //   .then((obj) => {
      //     if(obj?.class_name !== 'cat.characteristics') {
      //       throw err;
      //     }
      //     open_builder(obj);
      //   })
      //   .catch(err => $p.ui.dialogs.alert({text: err.message}));
    }

    /**
     * ОткрытьПостроитель()
     * @param [create_new] {Boolean} - создавать новое изделие или открывать в текущей строке
     */
    function open_builder(create_new, refill) {

      if(create_new === 'clone') {
        const selId = production_get_sel_index();
        if(selId == undefined) {
          not_production();
        }
        else {
          const row = o.production.get(selId);
          if(row) {
            const {owner, calc_order} = row.characteristic;
            if(row.characteristic.empty() || calc_order.empty() || owner.is_procedure || owner.is_accessory) {
              not_production();
            }
            else if(row.characteristic.leading_product.calc_order == calc_order) {
              $p.ui.dialogs.alert({title: 'Вложенное изделие', text: 'Нельзя копировать части изделия'});
            }
            else if(row.characteristic.coordinates.count()) {
              // добавляем строку
              o.create_product_row({grid: wnd.elmnts.grids.production, create: true})
                .then((nrow) => {
                  const {characteristic} = nrow;
                  nrow.quantity = row.quantity;
                  nrow.note = row.note;
                  // заполняем продукцию копией данных текущей строки
                  characteristic._mixin(row.characteristic._obj, null,
                    'ref,name,calc_order,product,leading_product,leading_elm,origin,partner'.split(','), true);
                  characteristic._data._is_new = true;
                  return characteristic.save();
                })
                .then((cx) => {
                  // при необходимости, установим признак перезаполнять параметры изделия и фурнитуры
                  if(calc_order.refill_props || refill === true) {
                    cx._data.refill_props = true;
                  }
                  // открываем рисовалку
                  handlers.handleNavigate(`/builder/${cx.ref}?order=${o.ref}`);
                });
            }
            else {
              not_production();
            }
          }
        }
      }
      else if(create_new) {
        o.create_product_row({grid: wnd.elmnts.grids.production, create: true})
          .then(({characteristic}) => {
            if(typeof create_new === 'object') {
              // заполняем продукцию сырыми данными
              characteristic._mixin(create_new, null, 'ref,name,calc_order,product,leading_product,leading_elm,origin,partner'.split(','), true);
              if(refill === true) {
                characteristic._data.refill_props = true;
              }
              handlers.handleNavigate(`/builder/${characteristic.ref}?order=${o.ref}`);
            }
            else {
              handlers.handleNavigate(`/templates/?order=${o.ref}&ref=${characteristic.ref}&action=new`);
            }
          });
      }

      else {
        const selId = production_get_sel_index();
        if(selId != undefined) {
          const row = o.production.get(selId);
          if(row) {
            const {owner, calc_order, sys, leading_product, coordinates} = row.characteristic;
            // если стоим на строке жалюзи, открываем конструктор жалюзи
            if(owner === $p.job_prm.nom.foroom) {
              return open_jalousie();
            }
            // возможно, это заготовка - проверим номенклатуру системы
            if(leading_product.calc_order == calc_order && !coordinates.find({cnstr: 1, elm_type: "Вложение"})) {
              return handlers.handleNavigate(`/builder/${leading_product.ref}?order=${o.ref}`);
            }
            if(row.characteristic.empty() || calc_order.empty() || owner.is_procedure || owner.is_accessory || (sys.empty() && !coordinates.count())) {
              not_production();
            }
            else {
              handlers.handleNavigate(`/builder/${row.characteristic.ref}?order=${o.ref}`);
            }
          }
        }
      }

    }

    function cut_evaluation(c2d) {
      $p.dp.buyers_order.open_component(wnd, {ref: o.ref, _mgr}, handlers, c2d ? 'CutEvaluation2D' : 'CutEvaluation');
    }

    function open_jalousie(create_new) {
      const {dp, job_prm: {nom}} = $p;
      if(create_new) {
        return o.create_product_row({grid: wnd.elmnts.grids.production, create: true})
          .then((row) => {
            row.nom = nom.foroom;
            row.characteristic.owner = row.nom;
            row.unit = row.nom.storage_unit;
            dp.buyers_order.open_component(wnd, {ref: o.ref, cmd: row, _mgr}, handlers, 'Jalousie');
          });
      }
      else {
        const selId = production_get_sel_index();
        if(selId != undefined) {
          const row = o.production.get(selId);
          const {owner} = row.characteristic;
          // если стоим на строке жалюзи, открываем конструктор жалюзи
          if(owner === nom.foroom) {
            row.nom = nom.foroom;
            row.unit = row.nom.storage_unit;
            return dp.buyers_order.open_component(wnd, {ref: o.ref, cmd: row, _mgr}, handlers, 'Jalousie');
          }
        }
        not_production();
      }
    }

    /**
     * Открывает форму спецификации текущей строки
     */
    function open_spec() {
      const selId = production_get_sel_index();
      if(selId != undefined) {
        const row = o.production.get(selId);
        row && !row.characteristic.empty() && row.characteristic.form_obj().then((w) => w.wnd.maximize());
      }
    }

    function rsvg_reload() {
      o && wnd && wnd.elmnts && wnd.elmnts.svgs && wnd.elmnts.svgs.reload(o);
    }

    function rsvg_click(ref, dbl) {
      const {production} = wnd.elmnts.grids;
      production && o.production.find_rows({characteristic: ref}, (row) => {
        production.selectRow(row.row - 1, dbl === 0);
        dbl && open_builder();
        return false;
      });
    }

    /**
     * добавляет строку материала
     */
    function add_material() {
      const {production} = wnd.elmnts.grids;
      const {row} = o.create_product_row({grid: production});
      setTimeout(() => {
        production.selectCell(row - 1, production.getColIndexById('nom'), false, true, true);
        production.cells().open_selection();
      }, 100);
    }

  };

  const {setCValue} = eXcell_ro.prototype;
  eXcell_ro.prototype.setCValue = function (val) {
    return setCValue.call(this, typeof val === 'number' ? val.toLocaleString('ru-RU') : val);
  };
  //eXcell_calck.prototype.setCValue = eXcell_ro.prototype.setCValue;

})($p);
