import React from 'react';
import PropTypes from 'prop-types';
import Toolbar from '@material-ui/core/Toolbar';
import IconButton from '../../Toolbar/IconButton';
import VerticalAlignTopIcon from '@material-ui/icons/VerticalAlignTop';
import ZoomOutMapIcon from '@material-ui/icons/ZoomOutMap';
import Tip from 'metadata-react/App/Tip';
import InfoButton from 'metadata-react/App/InfoButton';
import {useStyles} from '../../Toolbar/styles';
import GoLayer from './GoLayer';

const btnClick = (editor, name) => {

  if(name === 'delete') {
    return () => editor.project.selectedItems.forEach(({parent}) => {
      if(parent instanceof editor.constructor.ProfileItem){
        if(parent.elm_type == 'Створка') {
          $p.ui.dialogs.alert({
            text: `Нельзя удалять сегменты створок. Используйте вместо этого, служебный цвет "Не включать в спецификацию"`,
            title: 'Сегмент створки'
          });
        }
        else {
          parent.removeChildren();
          parent.remove();
        }
      }
    });
  }
  else if(name === 'spec') {
    return () => editor.elm_spec();
  }

  if(['left', 'right', 'top', 'bottom', 'all'].includes(name)) {
    return () => editor.profile_align(name);
  }

  return () => $p.msg.show_not_implemented();

  // switch (name) {
  // case 'arc':
  //   return () => editor.profile_radius();
  //
  //
  // }
};

function ProfileToolbar({editor, elm, classes}) {
  const {msg} = $p;
  const {inset} = elm;
  return <Toolbar disableGutters>
    <Tip title={msg.align_node_left}>
      <IconButton onClick={btnClick(editor, 'left')}><VerticalAlignTopIcon style={{transform: 'rotate(0.75turn)'}} /></IconButton>
    </Tip>
    <Tip title={msg.align_node_bottom}>
      <IconButton onClick={btnClick(editor, 'bottom')}><VerticalAlignTopIcon style={{transform: 'rotate(0.5turn)'}} /></IconButton>
    </Tip>
    <Tip title={msg.align_node_top}>
      <IconButton onClick={btnClick(editor, 'top')}><VerticalAlignTopIcon /></IconButton>
    </Tip>
    <Tip title={msg.align_node_right}>
      <IconButton onClick={btnClick(editor, 'right')}><VerticalAlignTopIcon style={{transform: 'rotate(0.25turn)'}} /></IconButton>
    </Tip>
    <Tip title={msg.align_all}>
      <IconButton onClick={btnClick(editor, 'all')}><ZoomOutMapIcon /></IconButton>
    </Tip>
    <div className={classes.title}/>
    <GoLayer elm={elm} editor={editor}/>
    <Tip title={msg.elm_spec}>
      <IconButton onClick={btnClick(editor, 'spec')}>
        <i className="fa fa-table" />
      </IconButton>
    </Tip>
    {inset?.note &&
      <Tip title='Информация' >
        <InfoButton text={inset.note} />
      </Tip>
    }
  </Toolbar>;
}

ProfileToolbar.propTypes = {
  editor: PropTypes.object.isRequired,
  elm: PropTypes.object.isRequired,
  classes: PropTypes.object.isRequired,
};

export default useStyles(ProfileToolbar);
