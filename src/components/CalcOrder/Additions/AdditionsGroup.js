/**
 * ### Форма добавления услуг и комплектуюущих
 * список элементов группы - конкретные подоконники, отливы и т.д.
 *
 * Created by Evgeniy Malyarov on 13.11.2017.
 */

import React from 'react';
import PropTypes from 'prop-types';
import ListItem from '@material-ui/core/ListItem';
import ListItemSecondaryAction from '@material-ui/core/ListItemSecondaryAction';
import ListItemText from '@material-ui/core/ListItemText';
import IconButton from '@material-ui/core/IconButton';
import AddIcon from '@material-ui/icons/AddCircleOutline';
import CopyIcon from '@material-ui/icons/FileCopyOutlined';
import RemoveIcon from '@material-ui/icons/Delete';
import Divider from '@material-ui/core/Divider';
import Collapse from '@material-ui/core/Collapse';
import withStyles from './styles';
import {handleAdd, handleCopy, handleRemove} from './connect';


class AdditionsGroup extends React.Component {

  constructor(props) {
    super(props);
    this.selectedRow = null;
    this.handleAdd = handleAdd.bind(this);
    this.handleCopy = handleCopy.bind(this);
    this.handleRemove = handleRemove.bind(this);
    this.state = {count: props.count};
  }


  onRowUpdated = (updated, row) => {
    if(updated){
      if(updated.hasOwnProperty('inset')) {
        const {inset} = row;
        $p.cat.clrs.selection_exclude_service(this.props.meta.fields.clr, inset);
        // проверим доступность цветов, при необходимости обновим
        inset.clr_group.default_clr(row);
      }
      const {calc_order_row} = row.characteristic;
      if(calc_order_row) {
        Object.assign(calc_order_row, {
          amount: 0,
          amount_internal: 0,
          price: 0,
          price_internal: 0,
          first_cost: 0,
        });
      }
    }
  }

  onCellSelected = (e) => {
    const {props: {meta}, tabular} = this;
    if(tabular && tabular.state._columns){
      const column = tabular.state._columns[e.idx];
      const {key} = column;
      const mf = meta.fields[key] || {
        choice_params: [],
        type: {
          is_ref: true,
          types: ["cat.property_values"],
          _mgr: $p.cat.property_values,
        }
      };
      this.selectedRow = tabular.rowGetter(e.rowIdx);
      if(key === 'clr') {
        $p.cat.clrs.selection_exclude_service(mf, this.selectedRow.inset);
      }
      else if($p.utils.is_guid(key)) {
        this.selectedRow.tune(key, mf, column);
      }
    }
  }

  render() {

    const {props, state: {count}} = this;
    const {Renderer, group, dp, classes, scheme, meta} = props;
    const {ref, presentation} = group;
    const style = {flex: 'initial'};
    if(count) {
      style.minHeight = 80 + (33 * (count - 1));
      //style.maxHeight = 320;
    }

    function pieces() {
      return scheme.filter(dp.production).reduce((sum, row) => sum + row.quantity, 0);
    }

    return <div style={style}>
      <ListItem disableGutters className={classes.listitem}>
        <IconButton title="Добавить строку" onClick={this.handleAdd}><AddIcon/></IconButton>
        <IconButton title="Скопировать строку" onClick={this.handleCopy}><CopyIcon/></IconButton>
        <IconButton title="Удалить строку" disabled={!count} onClick={this.handleRemove}><RemoveIcon/></IconButton>
        <ListItemText classes={count ? {primary: classes.groupTitle} : {}} primary={presentation}/>
        <ListItemSecondaryAction className={classes.secondary}>{count ? `${pieces()} шт` : ''}</ListItemSecondaryAction>
      </ListItem>

      <Collapse in={!!count} timeout={100} classes={{entered: classes.entered}}>
        <div style={{height: (style.minHeight || 0) + 35}}>
          <Renderer
            tref={(el) => this.tabular = el}
            minHeight={style.minHeight}
            dp={dp}
            group={group}
            scheme={scheme}
            meta={meta}
            onRowUpdated={this.onRowUpdated}
            onCellSelected={this.onCellSelected}
            onCellDeSelected={() => this.selectedRow = null}
          />
        </div>
      </Collapse>

      {!count && <Divider key={`d${ref}`}/>}

    </div>;
  }

}

AdditionsGroup.propTypes = {
  dp: PropTypes.object.isRequired,
  group: PropTypes.object.isRequired,
  classes: PropTypes.object.isRequired,
  scheme: PropTypes.object.isRequired,
  meta: PropTypes.object.isRequired,
  count: PropTypes.number.isRequired,
  Renderer: PropTypes.func,
};

export default withStyles(AdditionsGroup);

