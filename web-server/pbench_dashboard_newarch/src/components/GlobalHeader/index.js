import React, { PureComponent } from 'react';
import { connect } from 'dva';
import { routerRedux } from 'dva/router';
import moment from 'moment';
import { Icon, Divider, Tooltip, DatePicker, Button } from 'antd';
import Debounce from 'lodash-decorators/debounce';
import { Link } from 'dva/router';
import HeaderSearch from 'components/HeaderSearch';
import styles from './index.less';

const { MonthPicker } = DatePicker;

@connect(({ dashboard, routing, loading }) => ({
  startMonth: dashboard.startMonth,
  endMonth: dashboard.endMonth,
  location: routing.location.pathname,
}))
class GlobalHeader extends PureComponent {
  componentWillUnmount() {
    this.triggerResizeEvent.cancel();
  }

  toggle = () => {
    const { collapsed, onCollapse } = this.props;
    onCollapse(!collapsed);
    this.triggerResizeEvent();
  };

  changeStartMonth = month => {
    const { dispatch } = this.props;

    dispatch({
      type: 'dashboard/modifyControllerStartMonth',
      payload: month.toString(),
    });
  };

  changeEndMonth = month => {
    const { dispatch } = this.props;

    dispatch({
      type: 'dashboard/modifyControllerEndMonth',
      payload: month.toString(),
    });
  };

  handleDateChange = () => {
    const { dispatch, startMonth, endMonth } = this.props;

    dispatch({
      type: 'dashboard/fetchControllers',
      payload: [moment(startMonth), moment(endMonth)],
    });
  };

  /* eslint-disable*/
  @Debounce(600)
  triggerResizeEvent() {
    const event = document.createEvent('HTMLEvents');
    event.initEvent('resize', true, false);
    window.dispatchEvent(event);
  }

  render() {
    const { collapsed, isMobile, logo, dispatch, startMonth, endMonth, location } = this.props;
    console.log('header rendered');

    return (
      <div className={styles.header}>
        <div style={{ display: 'flex', flexDirection: 'row' }}>
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
          {location == '/dashboard/controllers' ? (
            <div>
              <MonthPicker
                style={{ marginBottom: 16 }}
                placeholder={'Start month'}
                value={moment(startMonth)}
                disabledDate={this.disabledDate}
                onChange={this.changeStartMonth}
                renderExtraFooter={() =>
                  'Select the start month to adjust the time range for controllers to query.'
                }
              />
              <MonthPicker
                style={{ marginLeft: 16, marginRight: 8 }}
                placeholder={'End month'}
                value={moment(endMonth)}
                disabledDate={this.disabledDate}
                onChange={this.changeEndMonth}
                renderExtraFooter={() =>
                  'Select the end month to adjust the time range for controllers to query.'
                }
              />
              <Button type="primary" onClick={this.handleDateChange}>
                {'Filter'}
              </Button>
            </div>
          ) : (
            <div />
          )}
        </div>
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
