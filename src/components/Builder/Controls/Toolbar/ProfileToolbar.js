import React from 'react';
import PropTypes from 'prop-types';
import Toolbar from '@material-ui/core/Toolbar';
import IconButton from '@material-ui/core/IconButton';
import VerticalAlignTopIcon from '@material-ui/icons/VerticalAlignTop';
import ZoomOutMapIcon from '@material-ui/icons/ZoomOutMap';
import LinkOffIcon from '@material-ui/icons/LinkOff';
import Link from '@material-ui/icons/Link';
import FlipIcon from '@material-ui/icons/Flip';
import BelowIcon from '@material-ui/icons/LowPriority';
import Tip from 'metadata-react/App/Tip';
import InfoButton from 'metadata-react/App/InfoButton';
import SmallButton from '../../Toolbar/IconButton';
import GoUp from './GoUp';
import {useStyles} from '../../Toolbar/styles';

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
  const isElm = !Array.isArray(elm);
  const inset = isElm && elm.inset;
  const allowFlip = isElm && !elm.nearest(true);
  let unlink = isElm && ((elm.b.selected && !elm.e.selected) || (elm.e.selected && !elm.b.selected));
  let link = false;
  if(unlink) {
    if(((elm.b.selected && elm.rays.b.is_i) || (elm.e.selected && elm.rays.e.is_i))) {
      unlink = false;
      link = true;
    }
  }

  return <Toolbar disableGutters>
    <Tip title={msg.align_node_left}>
      <SmallButton onClick={btnClick(editor, 'left')}><VerticalAlignTopIcon style={{transform: 'rotate(0.75turn)'}} /></SmallButton>
    </Tip>
    <Tip title={msg.align_node_bottom}>
      <SmallButton onClick={btnClick(editor, 'bottom')}><VerticalAlignTopIcon style={{transform: 'rotate(0.5turn)'}} /></SmallButton>
    </Tip>
    <Tip title={msg.align_node_top}>
      <SmallButton onClick={btnClick(editor, 'top')}><VerticalAlignTopIcon /></SmallButton>
    </Tip>
    <Tip title={msg.align_node_right}>
      <SmallButton onClick={btnClick(editor, 'right')}><VerticalAlignTopIcon style={{transform: 'rotate(0.25turn)'}} /></SmallButton>
    </Tip>
    <Tip title={msg.align_all}>
      <SmallButton onClick={btnClick(editor, 'all')}><ZoomOutMapIcon /></SmallButton>
    </Tip>
    {unlink && <>
      <Tip title="Оторвать узел">
        <SmallButton onClick={() => elm.unlink?.()}><LinkOffIcon /></SmallButton>
      </Tip>
      <Tip title="На задний план">
        <SmallButton onClick={() => elm.bringDown?.()}><BelowIcon /></SmallButton>
      </Tip>
      <Tip title="На передний план">
        <SmallButton onClick={() => elm.bringUp?.()}><BelowIcon style={{transform: 'scaleY(-1)'}} /></SmallButton>
      </Tip>
    </>}
    {link && <Tip title="Привязать узел">
      <SmallButton onClick={() => {
        try {
          elm.link?.();
        }
        catch (e) {
          $p.ui.dialogs.alert({
            title: 'Привязка узла',
            text: e.message,
          });
        }
      }}><Link /></SmallButton>
    </Tip>}
    {allowFlip && <Tip title="Перевернуть профиль">
      <SmallButton onClick={() => elm.flip?.()}><FlipIcon /></SmallButton>
    </Tip>}

    <div className={classes.title}/>
    <GoUp elm={elm} editor={editor}/>
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
