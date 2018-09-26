import React, { PureComponent } from 'react';
import { connect } from 'dva';
import { routerRedux } from 'dva/router';
import { Icon, Divider, Tooltip } from 'antd';
import Debounce from 'lodash-decorators/debounce';
import { Link } from 'dva/router';
import HeaderSearch from 'components/HeaderSearch';
import styles from './index.less';

class GlobalHeader extends PureComponent {
  componentWillUnmount() {
    this.triggerResizeEvent.cancel();
  }

  toggle = () => {
    const { collapsed, onCollapse } = this.props;
    onCollapse(!collapsed);
    this.triggerResizeEvent();
  };
  /* eslint-disable*/
  @Debounce(600)
  triggerResizeEvent() {
    const event = document.createEvent('HTMLEvents');
    event.initEvent('resize', true, false);
    window.dispatchEvent(event);
  }
  render() {
    const { collapsed, isMobile, logo, dispatch } = this.props;
    return (
      <div className={styles.header}>
        {isMobile && [
          <Link to="/" className={styles.logo} key="logo">
            <img src={logo} alt="logo" width="32" />
          </Link>,
          <Divider type="vertical" key="line" />,
        ]}
        <Icon
          className={styles.trigger}
          type={collapsed ? 'menu-unfold' : 'menu-fold'}
          onClick={this.toggle}
        />
        <div className={styles.right}>
          <HeaderSearch
            className={`${styles.action} ${styles.search}`}
            placeholder="Search controllers and results"
            onPressEnter={value => {
              dispatch(
                routerRedux.push({
                  pathname: '/search',
                  state: {
                    query: value,
                  },
                })
              );
            }}
          />
          <Tooltip title="Help">
            <a
              target="_blank"
              href="https://docs.google.com/document/d/1W4-vUpMzClBxQmwODDG4WLENmHXrL-adf-5GOF-NYg8/edit"
              rel="noopener noreferrer"
              className={styles.action}
            >
              <Icon type="question-circle-o" />
            </a>
          </Tooltip>
        </div>
      </div>
    );
  }
}

export default connect(() => ({}))(GlobalHeader);
