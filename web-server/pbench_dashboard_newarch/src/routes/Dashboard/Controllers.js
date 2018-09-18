import React, { Component } from 'react';
import axios from 'axios';
import { connect } from 'dva';
import { routerRedux } from 'dva/router';
import { Card, Table, Input, Button, Icon } from 'antd';
import PageHeaderLayout from '../../layouts/PageHeaderLayout';
import styles from './Controllers.less';

class Controllers extends Component {
  constructor(props) {
    super(props);

    this.state = {
      controllers: [],
      controllerSearch: [],
      loading: false,
      searchText: '',
      filtered: false
    };
  }

  componentDidMount() {
    this.setState({loading: true});

    axios.post('http://es-perf44.perf.lab.eng.bos.redhat.com:9280/dsa.pbench.*/_search',
    {
      "aggs": {
        "controllers": {
          "terms": {
            "field": "controller",
            "size": 0,
            "order": {
              "runs": "desc"
            }
          },
          "aggs": {
            "runs": {
              "min": {
                "field": "run.start_run"
              }
            }
          }
        }
      }
    }).then(res => {
      const response = res.data.aggregations.controllers.buckets;
      var controllers = [];
      response.map(function(controller) {
        controllers.push({key: controller.key, controller: controller.key, results: controller.doc_count, last_modified_value: controller.runs.value, last_modified_string: controller.runs.value_as_string});
      });
      this.setState({controllers: controllers})
      this.setState({loading: false})
    }).catch(error => {
      console.log(error);
      this.setState({loading: false});
    });
  }

  onInputChange = (e) => {
    this.setState({ searchText: e.target.value });
  }

  onSearch = () => {
    const { searchText, controllers } = this.state;
    const reg = new RegExp(searchText, 'gi');
    var controllerSearch = controllers.slice();
    this.setState({
      filtered: !!searchText,
      controllerSearch: controllerSearch.map((record) => {
        const match = record.controller.match(reg);
        if (!match) {
          return null;
        }
        return {
          ...record,
          controller: (
            <span>
              {record.controller.split(reg).map((text, i) => (
                i > 0 ? [<span style={{color: 'orange'}}>{match[0]}</span>, text] : text
              ))}
            </span>
          )
        }
      }).filter(record => !!record),
    });
  }

  retrieveResults = (params) => {
    const { dispatch } = this.props;
 
    dispatch(routerRedux.push({
      pathname: '/dashboard/results',
      state: { controller: params.key }
    }));
  }

  emitEmpty = () => {
    this.searchInput.focus();
    this.setState({ controllerSearch: '' });
  }

  render() {
    const {controllers, controllerSearch, searchText, loading} = this.state;

    const suffix = searchText ? <Icon type="close-circle" onClick={this.emitEmpty} /> : null;
    const columns = [
      {
        title: 'Controller',
        dataIndex: 'controller',
        key: 'controller',
        sorter: (a, b) => compareByAlph(a.controller, b.controller)
      }, {
        title: 'Last Modified',
        dataIndex: 'last_modified_string',
        key: 'last_modified_string', 
        sorter: (a, b) => a.last_modified_value - b.last_modified_value
      }, {
        title: 'Results',
        dataIndex: 'results',
        key: 'results',
        sorter: (a, b) => a.results - b.results
      }
    ];
    
    return (
      <PageHeaderLayout title="Controllers">
        <Card bordered={false}>
          <Input
            style={{width: 300, marginRight: 8}}
            ref={ele => this.searchInput = ele}
            prefix={<Icon type="user" style={{ color: 'rgba(0,0,0,.25)' }} />}
            suffix={suffix}
            placeholder = "Search controllers"
            value = {this.state.searchText}
            onChange = {this.onInputChange}
            onPressEnter = {this.onSearch}
          />
          <Button type="primary" onClick={this.onSearch}>Search</Button>
          <Table style={{marginTop: 20}} columns={columns} dataSource={controllerSearch.length > 0 ? controllerSearch : controllers} defaultPageSize={20} onRowClick={this.retrieveResults.bind(this)} loading={loading} showSizeChanger={true} showTotal={true} bordered/>
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

export default connect(() => ({}))(Controllers);

