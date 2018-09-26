import React, { Component } from 'react';
import axios from 'axios';
import { routerRedux } from 'dva/router';
import { connect } from 'dva';
import { Tag, Card, Table, Input, Button } from 'antd';
import PageHeaderLayout from '../../layouts/PageHeaderLayout';
import { getRoutes } from '../../utils/utils';

@connect()
export default class SearchList extends Component {
  constructor(props) {
    super(props);

    this.state = {
      results: [],
      resultSearch: [],
      selectedRowKeys: [],
      loading: false,
      loadingButton: false,
      searchText: '',
      filtered: false,
    };
  }

  componentDidMount() {
    const { query } = this.props.location.state;

    axios
      .post('http://es-perf44.perf.lab.eng.bos.redhat.com:9280/_search', {
        fields: ['run.controller', 'run.start_run', 'run.end_run', 'run.name', 'run.config'],
        sort: {
          'run.end_run': {
            order: 'desc',
            ignore_unmapped: true,
          },
        },
        size: 5000,
      })
      .then(res => {
        var res = res.data.hits.hits;
        var results = [];
        for (var response in res) {
          results.push({
            result: res[response].fields['run.name'][0],
            config: res[response].fields['run.config'][0],
            startRunUnixTimestamp: Date.parse(res[response].fields['run.start_run'][0]),
            startRun: res[response].fields['run.start_run'][0],
            endRun: res[response].fields['run.end_run'][0],
          });
        }
        this.setState({ results: results });
        this.setState({ loading: false });
      })
      .catch(error => {});
  }

  onInputChange = e => {
    this.setState({ searchText: e.target.value });
  };

  onSearch = searchText => {
    const { results } = this.state;
    const reg = new RegExp(searchText, 'gi');
    var resultSearch = results.slice();
    this.setState({
      filtered: !!searchText,
      resultSearch: resultSearch
        .map(record => {
          const match = record.result.match(reg);
          if (!match) {
            return null;
          }
          return {
            ...record,
            result: (
              <span>
                {record.result
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

  render() {
    const { results, resultSearch, loading, loadingButton, selectedRowKeys } = this.state;
    for (var result in results) {
      results[result]['key'] = result;
    }

    const columns = [
      {
        title: 'Result',
        dataIndex: 'result',
        key: 'result',
        sorter: (a, b) => compareByAlph(a.result, b.result),
      },
      {
        title: 'Config',
        dataIndex: 'config',
        key: 'config',
      },
      {
        title: 'Start Time',
        dataIndex: 'startRun',
        key: 'startRun',
        sorter: (a, b) => a.startRunUnixTimestamp - b.startRunUnixTimestamp,
      },
      {
        title: 'End Time',
        dataIndex: 'endRun',
        key: 'endRun',
      },
    ];

    const mainSearch = (
      <div style={{ textAlign: 'center' }}>
        <Input.Search
          placeholder="Search controllers and results"
          enterButton="Search"
          size="large"
          onSearch={this.handleFormSubmit}
          style={{ width: 522 }}
        />
      </div>
    );

    const { match, location } = this.props;

    return (
      <PageHeaderLayout content={mainSearch}>
        <Table
          style={{ marginTop: 20 }}
          columns={columns}
          dataSource={resultSearch.length > 0 ? resultSearch : results}
          loading={loading}
          bordered
        />
      </PageHeaderLayout>
    );
  }
}
