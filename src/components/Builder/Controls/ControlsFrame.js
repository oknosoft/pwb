/**
 * Компактный вариант элементов управления рисовалкой
 */

import React from 'react';
import PropTypes from 'prop-types';
import {withStyles} from '@material-ui/core/styles';

import ProductProps from './ProductProps';
import LayerProps from './LayerProps';
import ElmProps from './ElmProps';
import ElmInsets from './ElmInsets';
import GrpProps from './GrpProps';
import PairProps from './PairProps';
import GlassProps from './GlassProps';
import OrderProps from './OrderProps';
import BProps from './BProps';

const styles = (theme) => ({
  root: {
    paddingLeft: theme.spacing() / 2,
  },
});

class ControlsFrame extends React.Component {

  componentDidMount() {
    const {eve, project} = this.props.editor;
    eve.on({
      layer_activated: this.layer_activated,
      tool_activated: this.tool_activated,
      furn_changed: this.furn_changed,
      refresh_prm_links: this.refresh_prm_links,
      contour_redrawed: this.contour_redrawed,
      scheme_changed: this.scheme_changed,
      loaded: this.scheme_changed,
      set_inset: this.set_inset,
      elm_removed: this.elm_removed,
      coordinates_calculated: this.coordinates_calculated,
    });
    project._dp._manager.on('update', this.dp_listener);
  }

  componentWillUnmount() {
    const {eve, project} = this.props.editor;
    eve.off({
      layer_activated: this.layer_activated,
      tool_activated: this.tool_activated,
      furn_changed: this.furn_changed,
      refresh_prm_links: this.refresh_prm_links,
      contour_redrawed: this.contour_redrawed,
      scheme_changed: this.scheme_changed,
      loaded: this.scheme_changed,
      set_inset: this.set_inset,
      elm_removed: this.elm_removed,
      coordinates_calculated: this.coordinates_calculated,
    });
    project && project._dp._manager.off('update', this.dp_listener);
  }

  // при активации слоя
  layer_activated = () => {
    this.forceUpdate();
  };

  // при активации инструмента
  tool_activated = () => {
    this.forceUpdate();
  };

  elm_removed = (elm) => {
    const {eve} = this.props.editor;
    eve.emit('elm_activated', null);
  };

  // при смене фурнитуры
  furn_changed = () => {

  };

  // при смене вставки элемента
  set_inset = () => {

  };

  // при пересчете связей параметров
  refresh_prm_links = () => {

  };

  // следим за изменениями размеров при перерисовке контуров
  contour_redrawed = () => {

  };

  // при пересчете координат
  coordinates_calculated = () => {
    const {project} = this.props.editor;
    if(project) {
      const {ox, _dp} = project;
      $p.utils._mixin(_dp, ox.calc_order_row, ['note', 'price_internal', 'amount', 'amount_internal']);
      this.forceUpdate();
    }
  };

  // при готовности снапшота, обновляем суммы и цены
  scheme_changed = () => {
    this.forceUpdate();
  };

  dp_listener = (/* obj, fields */) => {

  };

  render() {
    const {type, classes, ...other} = this.props;
    const {editor: {project, tool}, elm} = other;
    const {ToolWnd} = tool;
    let panel;
    if(ToolWnd) {
      panel = <ToolWnd {...other}/>;
    }
    else {
      other.ox = project ? project.ox : null;
      if(!other.ox || other.ox.empty()) {
        return 'Загрузка...';
      }

      const {Filling} = $p.EditorInvisible;

      switch (type) {
      case 'elm':
        panel = <ElmProps key={`elm-${elm?.elm}`} {...other}/>;
        break;
      case 'pair':
        panel = elm.every((elm) => elm instanceof Filling) ? <GlassProps {...other}/> : <PairProps {...other}/>;
        break;
      case 'grp':
        panel = elm.every((elm) => elm instanceof Filling) ? <GlassProps {...other}/> : <GrpProps {...other}/>;
        break;
      case 'layer':
        panel = <LayerProps {...other}/>;
        break;
      case 'order':
        panel = <OrderProps {...other}/>;
        break;
      case 'settings':
        panel = <BProps {...other}/>;
        break;
      case 'ins':
        if(!other.elm) {
          other.elm = new project.constructor.FakePrmElm(other.layer);
        }
        panel = <ElmInsets {...other}/>;
        break;
      default:
        panel = <ProductProps {...other}/>;
      }
    }

    return <div className={classes.root}>
        {panel}
     </div>;
  }
}

ControlsFrame.propTypes = {
  editor: PropTypes.object.isRequired,
  type: PropTypes.string,
  elm: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
  layer: PropTypes.object,
  classes: PropTypes.object,
};

export default withStyles(styles)(ControlsFrame);

