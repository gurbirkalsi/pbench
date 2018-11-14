import { PureComponent } from 'react';
import { connect } from 'dva';
import moment from 'moment';
import { Icon, Divider, Tooltip, DatePicker, Button, notification } from 'antd';
import Debounce from 'lodash-decorators/debounce';
import { Link } from 'dva/router';
import styles from './index.less';

const { MonthPicker } = DatePicker;

@connect(({ global, dashboard, routing, loading }) => ({
  startMonth: dashboard.startMonth,
  endMonth: dashboard.endMonth,
  indices: dashboard.indices,
  datastoreConfig: global.datastoreConfig,
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

  openErrorNotification = () => {
    notification.error({
      message: 'Index Unavailable',
      description: 'This index does not contain any documents. Please select a different month.',
    });
  }

  changeStartMonth = month => {
    const { dispatch, datastoreConfig, indices } = this.props;

    if (indices.includes(datastoreConfig.run_index + datastoreConfig.prefix + month.format('YYYY-MM').toString())) {
      dispatch({
        type: 'dashboard/modifyControllerStartMonth',
        payload: month.toString(),
      });
    } else {
      this.openErrorNotification()
    }
  };

  changeEndMonth = month => {
    const { dispatch, datastoreConfig, indices } = this.props;

    if (indices.includes(datastoreConfig.run_index + datastoreConfig.prefix + month.format('YYYY-MM').toString())) {
      dispatch({
        type: 'dashboard/modifyControllerEndMonth',
        payload: month.toString(),
      });
    } else {
      this.openErrorNotification()
    }
  };

  handleDateChange = () => {
    const { dispatch, datastoreConfig, startMonth, endMonth } = this.props;

    dispatch({
      type: 'dashboard/fetchControllers',
      payload: { datastoreConfig: datastoreConfig, startMonth: moment(startMonth), endMonth: moment(endMonth) },
    });
  };

  disabledStartMonth = (current) => {
    const { endMonth } = this.props;

    return current && current > moment(endMonth);
  }

  disabledEndMonth = (current) => {
    const { startMonth } = this.props;

    return current && current < moment(startMonth); 
  }

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
                disabledDate={this.disabledStartMonth}
                onChange={this.changeStartMonth}
                allowClear={false}
                renderExtraFooter={() =>
                  'Select the start month to adjust the time range for controllers to query.'
                }
              />
              <MonthPicker
                style={{ marginLeft: 16, marginRight: 8 }}
                placeholder={'End month'}
                value={moment(endMonth)}
                disabledDate={this.disabledEndMonth}
                onChange={this.changeEndMonth}
                allowClear={false}
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
