import React from 'react';
import PropTypes from 'prop-types';
import Toolbar from '@material-ui/core/Toolbar';
import BorderHorizontalIcon from '@material-ui/icons/BorderHorizontal';
import BorderVerticalIcon from '@material-ui/icons/BorderVertical';
import OpenWithIcon from '@material-ui/icons/OpenWith';
import AddBoxIcon from '@material-ui/icons/AddBox';
import Tip from 'metadata-react/App/Tip';
import InfoButton from 'metadata-react/App/InfoButton';
import SmallButton from '../../Toolbar/IconButton';
import IconButton from '@material-ui/core/IconButton';
import GoLayer from './GoLayer';
import {useStyles} from '../../Toolbar/styles';

function addImpost(elm, orienattion) {

  const {elm_types, positions} = $p.enm;
  const inset = elm.project.default_inset({
    elm,
    elm_type: elm_types.impost,
    pos: positions[orienattion],
  });
  const pt = elm.interiorPoint();
  const {top, bottom, left, right} = elm.profiles_by_side();
  const {layer} = elm;

  const gen = (profile) => !layer.level || profile.elm_type.is('impost') ? profile.generatrix : profile.rays.outer;

  let path;
  if(orienattion == 'vert') {
    path = new paper.Path([pt.add([0, 10000]), pt.add([0, -10000])]);
    path.firstSegment.point = path.intersect_point(gen(bottom.profile));
    path.lastSegment.point = path.intersect_point(gen(top.profile));
  }
  else {
    path = new paper.Path([pt.add([-10000, 0]), pt.add([10000, 0])]);
    path.firstSegment.point = path.intersect_point(gen(left.profile));
    path.lastSegment.point = path.intersect_point(gen(right.profile));
  }

  const {profiles} = layer;
  const impost = new $p.EditorInvisible.Profile({
    generatrix: path,
    layer,
    parent: layer.children?.profiles,
    proto: {inset, clr: top.profile.clr}
  });
  for(const inode of 'be') {
    const pt = impost[inode];
    for(const profile of profiles) {
      for(const pnode of 'be') {
        if(profile[pnode].is_nearest(pt, true) && impost.isAbove(profile)) {
          impost.insertBelow(profile);
        }
      }
    }
  }
}

function GlassToolbar({editor, elm, classes}) {
  const {inset, reflect_grp} = elm;

  return <Toolbar disableGutters>
    <Tip title="Вставить Створку ">
      <SmallButton onClick={() => elm.create_leaf()}>
        <AddBoxIcon/>
      </SmallButton>
    </Tip>
    <Tip title="Вставить вертикальный импост">
      <SmallButton onClick={() => addImpost(elm, 'vert')}>
        <BorderVerticalIcon/>
      </SmallButton>
    </Tip>
    <Tip title="Вставить горизонтальный импост">
      <SmallButton onClick={() => addImpost(elm, 'hor')}>
        <BorderHorizontalIcon/>
      </SmallButton>
    </Tip>
    <Tip title="Уравнять">
      <SmallButton disabled={!reflect_grp} onClick={() => editor.glass_align()}>
        <OpenWithIcon/>
      </SmallButton>
    </Tip>
    <div className={classes.title}/>
    <GoLayer elm={elm} editor={editor}/>
    <Tip title={$p.msg.elm_spec}>
      <IconButton onClick={() => editor.elm_spec(elm)}>
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

export default useStyles(GlassToolbar);

GlassToolbar.propTypes = {
  editor: PropTypes.object.isRequired,
  elm: PropTypes.object.isRequired,
  classes: PropTypes.object.isRequired,
};
