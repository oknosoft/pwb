/**
 * ### Форма добавления услуг и комплектуюущих
 * список групп (подоконники, услуги и т.д.)
 * Здесь есть немного работы с данными - создаём экземпляр обработки, находим варианты настроек
 *
 * Created by Evgeniy Malyarov on 13.11.2017.
 */

import React from 'react';
import PropTypes from 'prop-types';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import AdditionsGroup from './AdditionsGroup';
import {alasql_schemas, fill_data} from './connect';


export default class AdditionsGroups extends React.Component {

  constructor(props, context) {
    super(props, context);

    this.state = {schemas: null};
    this.groups = new Map();
  }

  // заполняет соответствие схем и типов вставок в state компонента
  fill_schemas(docs = []) {
    const schemas = new Map();
    const {scheme_settings} = $p.cat;
    for (const doc of docs) {
      for (const item of this.items) {
        if(item && doc.name == item.name) {
          schemas.set(item, scheme_settings.get(doc));
          break;
        }
      }
    }
    this.setState({schemas});
  }

  componentDidMount() {
    fill_data.call(this, this.props.dialog.ref);
    this.fill_schemas(alasql_schemas());
    $p.dp.buyers_order.on('update', this.inset_change);
  }

  componentWillUnmount() {
    $p.dp.buyers_order.off('update', this.inset_change);
  }

  inset_change = (obj, fields) => {
    const {groups, dp} = this;
    if(fields && fields.inset && obj._owner == dp.production) {
      const group = groups.get(obj.inset.insert_type);
      group && group.forceUpdate();
    }
  }

  render() {
    const {items, components, dp} = this;
    const {schemas} = this.state || {};

    return <List>
      {schemas ?
        items.map(group => {
          if(!group) {
            return null;
          }
          const cmp = components.get(group);
          return <AdditionsGroup
            key={`${group.ref}`}
            ref={el => this.groups.set(group, el)}
            dp={dp}
            group={group}
            {...cmp}
            scheme={schemas.get(group)}
          />;

        })
        :
        <ListItem>
          <ListItemText primary="Чтение настроек компоновки..."/>
        </ListItem>
      }
    </List>;
  }
}

AdditionsGroups.propTypes = {
  dialog: PropTypes.object.isRequired,
};


