import React, { Component } from 'react';
import moment from 'moment';
import { connect } from 'dva';
import { routerRedux } from 'dva/router';
import { DatePicker, Card, Table, Input, Button, Icon } from 'antd';
import PageHeaderLayout from '../../layouts/PageHeaderLayout';
import styles from './Controllers.less';

const { MonthPicker } = DatePicker;

@connect(({ dashboard, loading }) => ({
  dashboard,
  loading: loading.effects['dashboard/fetchControllers'],
}))
export default class Controllers extends Component {
  constructor(props) {
    super(props);

    this.state = {
      controllerSearch: [],
      loading: false,
      searchText: '',
      filtered: false,
      startMonth: moment(new Date(), 'YYYY-MM'),
      endMonth: moment(new Date(), 'YYYY-MM'),
    };
  }

  componentDidMount() {
    this.handleDateChange();
  }

  changeStartMonth = month => {
    this.setState({ startMonth: month }, () => {
      console.log('setState completed', this.state.startMonth);
      this.handleDateChange();
    });
  };

  changeEndMonth = month => {
    this.setState({ endMonth: month }, () => {
      console.log('setState completed', this.state.startMonth);
      this.handleDateChange();
    });
  };

  handleDateChange = () => {
    const { dispatch } = this.props;
    const { startMonth, endMonth } = this.state;

    dispatch({
      type: 'dashboard/fetchControllers',
      payload: [startMonth, endMonth],
    });
  };

  disabledDate = current => {
    return current > moment().endOf('month');
  };

  onInputChange = e => {
    this.setState({ searchText: e.target.value });
  };

  onSearch = () => {
    const { dashboard } = this.props;
    let { controllers } = dashboard;
    const { searchText } = this.state;
    const reg = new RegExp(searchText, 'gi');
    var controllerSearch = controllers.slice();
    this.setState({
      filtered: !!searchText,
      controllerSearch: controllerSearch
        .map(record => {
          const match = record.controller.match(reg);
          if (!match) {
            return null;
          }
          return {
            ...record,
            controller: (
              <span>
                {record.controller
                  .split(reg)
                  .map(
                    (text, i) =>
                      i > 0 ? [<span style={{ color: 'orange' }}>{match[0]}</span>, text] : text
                  )}
              </span>
            ),
          };
        })
        .filter(record => !!record),
    });
  };

  retrieveResults = params => {
    const { dispatch } = this.props;

    dispatch(
      routerRedux.push({
        pathname: '/dashboard/results',
        state: { controller: params.key },
      })
    );
  };

  emitEmpty = () => {
    this.searchInput.focus();
    this.setState({ controllerSearch: '' });
    this.setState({ searchText: '' });
  };

  render() {
    const { controllerSearch, searchText, startMonth, endMonth } = this.state;
    const { dashboard, loading } = this.props;
    const { controllers } = dashboard;

    const suffix = searchText ? <Icon type="close-circle" onClick={this.emitEmpty} /> : null;
    const columns = [
      {
        title: 'Controller',
        dataIndex: 'controller',
        key: 'controller',
        sorter: (a, b) => compareByAlph(a.controller, b.controller),
      },
      {
        title: 'Last Modified',
        dataIndex: 'last_modified_string',
        key: 'last_modified_string',
        sorter: (a, b) => a.last_modified_value - b.last_modified_value,
      },
      {
        title: 'Results',
        dataIndex: 'results',
        key: 'results',
        sorter: (a, b) => a.results - b.results,
      },
    ];

    return (
      <PageHeaderLayout title="Controllers">
        <Card bordered={false}>
          <div style={{ flexDirection: 'column' }}>
            <MonthPicker
              style={{ marginBottom: 16 }}
              placeholder={'Start month'}
              value={startMonth}
              disabledDate={this.disabledDate}
              onChange={this.changeStartMonth}
            />
            <MonthPicker
              style={{ marginLeft: 16 }}
              placeholder={'End month'}
              value={endMonth}
              disabledDate={this.disabledDate}
              onChange={this.changeEndMonth}
            />
            <div>
              <Input
                style={{ width: 300, marginRight: 8 }}
                ref={ele => (this.searchInput = ele)}
                prefix={<Icon type="user" style={{ color: 'rgba(0,0,0,.25)' }} />}
                suffix={suffix}
                placeholder="Search controllers"
                value={this.state.searchText}
                onChange={this.onInputChange}
                onPressEnter={this.onSearch}
              />
              <Button type="primary" onClick={this.onSearch}>
                Search
              </Button>
            </div>
          </div>
          <Table
            style={{ marginTop: 20 }}
            columns={columns}
            dataSource={controllerSearch.length > 0 ? controllerSearch : controllers}
            defaultPageSize={20}
            onRowClick={this.retrieveResults.bind(this)}
            loading={loading}
            showSizeChanger={true}
            showTotal={true}
            bordered
          />
        </Card>
      </PageHeaderLayout>
    );
  }
}

function compareByAlph(a, b) {
  if (a > b) {
    return -1;
  }
  if (a < b) {
    return 1;
  }
  return 0;
}
