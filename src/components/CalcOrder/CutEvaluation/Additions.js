import React from 'react';
import PropTypes from 'prop-types';

import {withStyles} from '@material-ui/core/styles';
import Stepper from '@material-ui/core/Stepper';
import Step from '@material-ui/core/Step';
import StepLabel from '@material-ui/core/StepLabel';
import Button from '@material-ui/core/Button';
import List from '@material-ui/core/List';

import SelectMode from './Mode';
import Progress from 'wb-forms/dist/WorkCentersTask/Progress';
import Report1D from 'wb-forms/dist/WorkCentersTask/Report1D';

const styles = theme => ({
  root: {
    width: '100%',
  },
  head: {
    padding: theme.spacing(),
  },
  backButton: {
    marginRight: theme.spacing(),
  },
  instructions: {
    marginTop: theme.spacing(),
    marginBottom: theme.spacing(),
    maxHeight: 'calc(100vh - 320px)',
    overflow: 'auto',
  },
});

const steps = ['Выбор профилей', 'Раскрой', 'Анализ'];


class Additions extends React.Component {

  state = {
    activeStep: 0,
    evaluating: true,
    statuses: [],
    mode: 'all',
  };

  componentDidMount() {
    $p.doc.work_centers_task.create().then((doc) => {
      this.doc = doc;
      doc.fill_by_orders([this.props.dialog.ref])
        .then(() => this.setState({evaluating: false}));
    });
  }

  componentWillUnmount() {
    this.doc && this.doc.unload();
  }

  handlePre(attr) {
    console.log(attr);
  }

  // закидываем обрезки в заказ или продукции заказа
  handleCalck(attr) {
    const {props: {dialog}, doc} = this;
    const {doc: {calc_order: mgr}, CatClrs} = $p;
    const calc_order = mgr.get(dialog.ref);

    // attr.pre - удалить обрезь
    // attr.calck - добавить в изделия
    // !attr.calck - добавить в заказ

    // чистим возможные прежние распределения
    calc_order.reset_specify('1D');
    if(attr?.pre) {
      calc_order.production.sync_grid(dialog.wnd.elmnts.grids.production);
      return Promise.resolve({close: true});
    }

    const {production} = dialog.wnd ? dialog.wnd.elmnts.grids : {};
    // группируем данные во временном документе
    const tmp = doc._manager.create({}, false, true);
    doc.cuts.find_rows({record_kind: 'Расход', _top: 10e6}, ({nom, characteristic, len}) => {
      tmp.cuts.add({nom, characteristic, len});
    });
    for(const {nom, characteristic, len} of doc.cutting) {
      tmp.cutting.add({nom, characteristic, len});
    }
    tmp.cuts.group_by(['nom', 'characteristic'], ['len']);
    tmp.cutting.group_by(['nom', 'characteristic'], ['len']);

    // сводная спецификация заказа поставщику
    const full = calc_order.aggregate_specification();
    const aggregates = new Map();

    for(const {nom, characteristic, len} of tmp.cuts) {
      const crow = tmp.cutting.find({nom, characteristic});
      if(crow && len > crow.len) {
        // строка потребности всего заказа
        const frow = characteristic instanceof CatClrs ?
          full.specification.find({nom, clr: characteristic}) :
          full.specification.find({nom, nom_characteristic: characteristic});
        if(frow) {
          // общая дельта
          const adelta = (len / 1000) - frow.quantity;
          if(attr?.calck) {
            for(const orow of calc_order.production) {
              if(orow.characteristic.calc_order === calc_order) {
                // строка потребности текущего изделия
                if(!aggregates.has(orow)) {
                  aggregates.set(orow, calc_order.aggregate_specification(orow));
                }
                const curr = aggregates.get(orow);
                // строка потребности текущей продукции
                const ccrow = characteristic instanceof CatClrs ?
                  curr.specification.find({nom, clr: characteristic}) :
                  curr.specification.find({nom, nom_characteristic: characteristic});
                if(ccrow) {

                  // взвешенная дельта в единицах хранения
                  const ddelta = (adelta * ccrow.quantity / frow.quantity) / (orow.quantity || 1);

                  // вклад в рублях deposit += ddelta * prow.price;
                  if(ddelta) {
                    const erow = characteristic instanceof CatClrs ?
                      orow.characteristic.specification.find({nom, clr: characteristic}) :
                      orow.characteristic.specification.find({nom, characteristic});
                    if(erow && erow.len && !nom.cutting_optimization_type.is('no') ) {
                      const {nom, characteristic, clr, price, amount_marged, totqty1} = erow;
                      const drow = orow.characteristic.specification.add({
                        nom,
                        characteristic,
                        clr,
                        dop: -3,
                        qty: 1,
                        len: ddelta,
                        totqty: ddelta,
                        totqty1: ddelta,
                        price,
                        amount: price * ddelta,
                        amount_marged: (amount_marged / totqty1) * ddelta,
                      });
                    }
                  }
                }
              }
            }
          }
          else {
            if(adelta > 0) {
              const orow = calc_order.production.add({nom, characteristic, qty: 1, changed: 3});
              orow.quantity = adelta.round(3);
              production?.refresh_row(orow);
            }
          }
        }
      }
    }
    if(attr?.calck) {
      calc_order._slave_recalc = true;
      for(const orow of calc_order.production) {
        orow.value_change('quantity', 'update', orow.quantity);
        production.refresh_row(orow);
      }
      calc_order._slave_recalc = false;
    }
    tmp.unload();
    calc_order.production.sync_grid(dialog.wnd.elmnts.grids.production);
    return Promise.resolve({close: true});
  }

  handleNext = () => {
    const {activeStep} = this.state;
    this.setState({activeStep: activeStep + 1});

    if(activeStep === 0) {
      this.fillAndRun()
        .then(() => {

        })
        .catch(() => null)
        .then(() => {
          this.setState({evaluating: false}, this.handleNext);
        });
    }
  };

  handleBack = () => {
    const {activeStep} = this.state;
    this.setState({activeStep: activeStep - 1});
  };

  handleReset = () => {
    this.setState({activeStep: 0});
  };

  setMode = (mode) => {
    this.setState({mode});
  };

  // вызывается из раскроя
  handleOnStep = (status) => {
    const {nom, characteristic} = status.cut_row;
    const statuses = $p.utils._clone(this.state.statuses);
    let row;
    if(!statuses.some((elm) => {
      if(elm.nom === nom && elm.characteristic === characteristic) {
        row = elm;
        return true;
      }
    })) {
      row = {nom, characteristic};
      statuses.push(row);
    }
    Object.assign(row, status);

    this.setState({statuses});
  };

  fillAndRun() {
    const {state: {mode}, doc} = this;
    this.setState({evaluating: true, statuses: []});

    // чистим документ
    doc.demand.clear();
    doc.cuts.clear();
    doc.cutting.clear();

    // заполняем
    return doc.fill_cutting({clr_only: mode === 'clrs'})
      .then(() => {
        // подключаем визуализацию процесса раскроя и запускаем
        return doc.optimize({onStep: this.handleOnStep});
      });

  }

  getStepContent() {
    const {state: {mode, activeStep, statuses}, setMode, doc} = this;
    switch (activeStep) {
    case 0:
      return <SelectMode mode={mode} setMode={setMode}/>;
    case 1:
      return <List>
        {statuses.map((status, index) => <Progress key={`p-${index}`} status={status}/>)}
      </List>;
    case 2:
      return doc ? <Report1D _obj={doc} hide_head/> : 'Документ пуст';
    default:
      return 'Ошибка шага';
    }
  }

  render() {
    const {props: {classes}, state: {activeStep, evaluating}, doc} = this;

    return (
      <div className={classes.root}>
        <Stepper activeStep={activeStep} classes={{root: classes.head}}>
          {steps.map(label => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        <div>
          <div className={classes.instructions}>{this.getStepContent()}</div>
          {!doc && <div>Подготовка данных</div>}
          <div>
            <Button
              disabled={(activeStep === 0) || (activeStep === steps.length - 1) || evaluating}
              onClick={this.handleBack}
              className={classes.backButton}
            >
              Назад
            </Button>
            <Button
              disabled={evaluating}
              variant="contained"
              color="primary"
              onClick={activeStep === steps.length - 1 ? this.handleReset : this.handleNext}
            >
              {activeStep === steps.length - 1 ? 'Сброс' : 'Далее'}
            </Button>
          </div>
        </div>
      </div>
    );
  }
}

Additions.propTypes = {
  dialog: PropTypes.object,
  classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(Additions);
