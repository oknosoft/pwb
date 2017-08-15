import {connect} from 'react-redux';
import {withRouter} from 'react-router';
import {push} from 'react-router-redux';

import withMeta from 'metadata-redux/src/withMeta';

// Redux action creator
const mapDispatchToProps = (dispatch) => ({
  handleNavigate: (path) => dispatch(push(path)),
});

const mapStateToProps = (state, props) => {
  return {
    path_log_in: !!props.location.pathname.match(/\/(login|about|settings)$/),
  };
};


export default (View) => {
  const withNavigate = connect(mapStateToProps, mapDispatchToProps)(withRouter(View));
  return withMeta(withNavigate);
};
