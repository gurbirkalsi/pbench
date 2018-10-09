import ReactJS from 'react';
import { connect } from 'dva';
import { routerRedux } from 'dva/router';
import { Select, Card, Spin, Tag, Table, Button } from 'antd';
import PageHeaderLayout from '../../layouts/PageHeaderLayout';
import cloneDeep from 'lodash/cloneDeep';

@connect(({ dashboard, loading }) => ({
  selectedController: dashboard.selectedController,
  selectedResults: dashboard.selectedResults,
  iterations: dashboard.iterations,
  results: dashboard.results,
  controllers: dashboard.controllers,
  startMonth: dashboard.startMonth,
  endMonth: dashboard.endMonth,
  loading: loading.effects['dashboard/fetchIterations'],
}))
class CompareResults extends ReactJS.Component {
  constructor(props) {
    super(props);

    this.state = {
      responseData: [],
      responseDataAll: [],
      loading: true,
      loadingButton: false,
      tables: [],
      selectedRowKeys: [],
      rowSelections: [],
      selectedPort: 'all',
      ports: [],
      configData: [],
      selectedConfig: [],
    };
  }

  componentDidMount() {
    this.setState({ loading: true });
    const { dispatch, selectedResults, iterations } = this.props;

    dispatch({
      type: 'dashboard/fetchIterations',
      payload: { selectedResults: selectedResults },
    }).then((res) => {
      console.log(res)
      let selectedRowKeys = [];
      let iterationData = [];
      iterations.map(iteration => {
        iterationData.push(
          this.parseJSONData(
            iteration.iterationData,
            iteration.resultName,
            iteration.controllerName,
            iteration.tableId
          )
        );
        selectedRowKeys.push([]);
      });
      this.setState({ responseData: iterationData });
      this.setState({ selectedRowKeys: selectedRowKeys });
    });
  }

  openNotificationWithIcon = type => {
    notification[type]({
      message: 'Please select two results for comparison.',
      placement: 'bottomRight',
    });
  };

  onCompareIterations = () => {
    const { selectedRowKeys, responseData } = this.state;
    if (selectedRowKeys.length < 2) {
      this.openNotificationWithIcon('error');
    }
    var selectedRowData = [];
    for (var item in selectedRowKeys) {
      if (selectedRowKeys[item].length > 0) {
        for (var row in selectedRowKeys[item]) {
          selectedRowData.push(responseData[item].iterations[selectedRowKeys[item][row]]);
        }
      }
    }
    this.compareIterations(selectedRowData);
  };

  updateSelection = table => {
    this.setState({ tableSelected: table });
  };

  onSelectChange = (record, selected, selectedRows) => {
    var { selectedRowKeys } = this.state;
    selectedRowKeys[record.table].push(record.key);
    this.setState({ selectedRowKeys });
  };

  parseJSONData(response, resultName, controllerName, table) {
    var responseData = [];
    var columns = [
      {
        title: 'Iteration Number',
        dataIndex: 'iteration_number',
        fixed: 'left',
        width: 75,
        key: 'iteration_number',
        sorter: (a, b) => a.iteration_number - b.iteration_number,
      },
      {
        title: 'Iteration Name',
        dataIndex: 'iteration_name',
        fixed: 'left',
        width: 150,
        key: 'iteration_name',
      },
    ];
    var iterations = [];
    var ports = [];
    var configCategories = {};

    for (var iteration in response) {
      if (!response[iteration].iteration_name.includes('fail')) {
        var iterationObject = {
          iteration_name: response[iteration].iteration_name,
          iteration_number: response[iteration].iteration_number,
          result_name: resultName,
          controller_name: controllerName,
          table: table,
        };
        var configObject = {};
        var keys = [];
        if (response[iteration].iteration_data.parameters.benchmark[0] != undefined) {
          var keys = Object.keys(response[iteration].iteration_data.parameters.benchmark[0]);
          for (var key in keys) {
            if (
              (keys[key] != 'uid') &
              (keys[key] != 'clients') &
              (keys[key] != 'servers') &
              (keys[key] != 'max_stddevpct')
            ) {
              if (!Object.keys(configCategories).includes(keys[key])) {
                var obj = {};
                configCategories[keys[key]] = [
                  response[iteration].iteration_data.parameters.benchmark[0][keys[key]],
                ];
              } else {
                if (
                  !configCategories[keys[key]].includes(
                    response[iteration].iteration_data.parameters.benchmark[0][keys[key]]
                  )
                ) {
                  configCategories[keys[key]].push(
                    response[iteration].iteration_data.parameters.benchmark[0][keys[key]]
                  );
                }
              }
              configObject[keys[key]] =
                response[iteration].iteration_data.parameters.benchmark[0][keys[key]];
            }
          }
        }
        var iterationObject = Object.assign({}, iterationObject, configObject);
        for (var iterationType in response[iteration].iteration_data) {
          if (iterationType != 'parameters') {
            if (!this.containsTitle(columns, iterationType)) {
              columns.push({ title: iterationType });
            }
            for (var iterationNetwork in response[iteration].iteration_data[iterationType]) {
              var parentColumnIndex = this.getColumnIndex(columns, iterationType);
              if (!this.containsIteration(columns[parentColumnIndex], iterationNetwork)) {
                if (columns[parentColumnIndex]['children'] == undefined) {
                  columns[parentColumnIndex]['children'] = [{ title: iterationNetwork }];
                } else {
                  columns[parentColumnIndex]['children'].push({ title: iterationNetwork });
                }
                for (var iterationData in response[iteration].iteration_data[iterationType][
                  iterationNetwork
                ]) {
                  var columnTitle =
                    'client_hostname:' +
                    response[iteration].iteration_data[iterationType][iterationNetwork][
                      iterationData
                    ].client_hostname +
                    '-server_hostname:' +
                    response[iteration].iteration_data[iterationType][iterationNetwork][
                      iterationData
                    ].server_hostname +
                    '-server_port:' +
                    response[iteration].iteration_data[iterationType][iterationNetwork][
                      iterationData
                    ].server_port;
                  if (columns[parentColumnIndex]['children'] == undefined) {
                    var childColumnIndex = 0;
                  } else {
                    var childColumnIndex = this.getColumnIndex(
                      columns[parentColumnIndex].children,
                      iterationNetwork
                    );
                  }
                  if (
                    !this.containsIteration(
                      columns[parentColumnIndex].children[childColumnIndex],
                      columnTitle
                    )
                  ) {
                    if (
                      columns[parentColumnIndex].children[childColumnIndex]['children'] == undefined
                    ) {
                      columns[parentColumnIndex].children[childColumnIndex]['children'] = [
                        { title: columnTitle, dataIndex: columnTitle },
                      ];
                    } else {
                      columns[parentColumnIndex].children[childColumnIndex]['children'].push({
                        title: columnTitle,
                      });
                    }
                    var columnValue = columnTitle.split(':')[3];
                    if (!ports.includes(columnValue)) {
                      ports.push(columnValue);
                    }
                    var columnMean =
                      iterationType + '-' + iterationNetwork + '-' + columnTitle + '-' + 'mean';
                    var columnStdDev =
                      iterationType +
                      '-' +
                      iterationNetwork +
                      '-' +
                      columnTitle +
                      '-' +
                      'stddevpct';
                    var columnSample =
                      iterationType +
                      '-' +
                      iterationNetwork +
                      '-' +
                      columnTitle +
                      '-' +
                      'closestsample';
                    var dataChildColumnIndex = this.getColumnIndex(
                      columns[parentColumnIndex].children[childColumnIndex]['children'],
                      columnTitle
                    );
                    if (dataChildColumnIndex == undefined) {
                      dataChildColumnIndex = 0;
                    }
                    if (!this.containsKey(columns, columnMean)) {
                      if (
                        columns[parentColumnIndex].children[childColumnIndex].children[
                          dataChildColumnIndex
                        ]['children'] == undefined
                      ) {
                        columns[parentColumnIndex].children[childColumnIndex].children[
                          dataChildColumnIndex
                        ]['children'] = [
                          {
                            title: 'mean',
                            dataIndex: columnMean,
                            key: columnMean,
                            sorter: (a, b) => a[columnMean] - b[columnMean],
                          },
                        ];
                        iterationObject[columnMean] =
                          response[iteration].iteration_data[iterationType][iterationNetwork][
                            iterationData
                          ].mean;
                      } else {
                        columns[parentColumnIndex].children[childColumnIndex].children[
                          dataChildColumnIndex
                        ]['children'].push({
                          title: 'mean',
                          dataIndex: columnMean,
                          key: columnMean,
                          sorter: (a, b) => a[columnMean] - b[columnMean],
                        });
                        iterationObject[columnMean] =
                          response[iteration].iteration_data[iterationType][iterationNetwork][
                            iterationData
                          ].mean;
                      }
                    }
                    if (!this.containsKey(columns, columnStdDev)) {
                      if (
                        columns[parentColumnIndex].children[childColumnIndex].children[
                          dataChildColumnIndex
                        ]['children'] == undefined
                      ) {
                        columns[parentColumnIndex].children[childColumnIndex].children[
                          dataChildColumnIndex
                        ]['children'] = [
                          {
                            title: 'stddevpct',
                            dataIndex: columnStdDev,
                            key: columnStdDev,
                            sorter: (a, b) => a[columnStdDev] - b[columnStdDev],
                          },
                        ];
                        iterationObject[columnStdDev] =
                          response[iteration].iteration_data[iterationType][iterationNetwork][
                            iterationData
                          ].stddevpct;
                      } else {
                        columns[parentColumnIndex].children[childColumnIndex].children[
                          dataChildColumnIndex
                        ]['children'].push({
                          title: 'stddevpct',
                          dataIndex: columnStdDev,
                          key: columnStdDev,
                          sorter: (a, b) => a[columnStdDev] - b[columnStdDev],
                        });
                        iterationObject[columnStdDev] =
                          response[iteration].iteration_data[iterationType][iterationNetwork][
                            iterationData
                          ].stddevpct;
                      }
                    }
                    if (!this.containsKey(columns, columnSample)) {
                      if (
                        columns[parentColumnIndex].children[childColumnIndex].children[
                          dataChildColumnIndex
                        ]['children'] == undefined
                      ) {
                        columns[parentColumnIndex].children[childColumnIndex].children[
                          dataChildColumnIndex
                        ]['children'] = [
                          {
                            title: 'closest sample',
                            dataIndex: columnSample,
                            key: columnSample,
                            sorter: (a, b) => a[columnSample] - b[columnSample],
                            render: (text, record) => {
                              return <div>{text}</div>;
                            },
                          },
                        ];
                        iterationObject[columnSample] =
                          response[iteration].iteration_data[iterationType][iterationNetwork][
                            iterationData
                          ]['closest sample'];
                        iterationObject['closest_sample'] =
                          response[iteration].iteration_data[iterationType][iterationNetwork][
                            iterationData
                          ]['closest sample'];
                      } else {
                        columns[parentColumnIndex].children[childColumnIndex].children[
                          dataChildColumnIndex
                        ]['children'].push({
                          title: 'closest sample',
                          dataIndex: columnSample,
                          key: columnSample,
                          sorter: (a, b) => a[columnSample] - b[columnSample],
                          render: (text, record) => {
                            return <div>{text}</div>;
                          },
                        });
                        iterationObject[columnSample] =
                          response[iteration].iteration_data[iterationType][iterationNetwork][
                            iterationData
                          ]['closest sample'];
                        iterationObject['closest_sample'] =
                          response[iteration].iteration_data[iterationType][iterationNetwork][
                            iterationData
                          ]['closest sample'];
                      }
                    }
                  }
                }
              } else {
                for (var iterationData in response[iteration].iteration_data[iterationType][
                  iterationNetwork
                ]) {
                  var columnTitle =
                    'client_hostname:' +
                    response[iteration].iteration_data[iterationType][iterationNetwork][
                      iterationData
                    ].client_hostname +
                    '-server_hostname:' +
                    response[iteration].iteration_data[iterationType][iterationNetwork][
                      iterationData
                    ].server_hostname +
                    '-server_port:' +
                    response[iteration].iteration_data[iterationType][iterationNetwork][
                      iterationData
                    ].server_port;
                  var columnMean =
                    iterationType + '-' + iterationNetwork + '-' + columnTitle + '-' + 'mean';
                  var columnStdDev =
                    iterationType + '-' + iterationNetwork + '-' + columnTitle + '-' + 'stddevpct';
                  var columnSample =
                    iterationType +
                    '-' +
                    iterationNetwork +
                    '-' +
                    columnTitle +
                    '-' +
                    'closestsample';
                  iterationObject[columnMean] =
                    response[iteration].iteration_data[iterationType][iterationNetwork][
                      iterationData
                    ].mean;
                  iterationObject[columnStdDev] =
                    response[iteration].iteration_data[iterationType][iterationNetwork][
                      iterationData
                    ].stddevpct;
                  iterationObject[columnSample] =
                    response[iteration].iteration_data[iterationType][iterationNetwork][
                      iterationData
                    ]['closest sample'];
                  iterationObject['closest_sample'] =
                    response[iteration].iteration_data[iterationType][iterationNetwork][
                      iterationData
                    ]['closest sample'];
                }
              }
            }
          }
        }

        iterations.push(iterationObject);
      }
    }
    iterations.sort(function(a, b) {
      return a.iteration_number - b.iteration_number;
    });
    for (var iteration in iterations) {
      iterations[iteration]['key'] = iteration;
    }
    responseData['resultName'] = resultName;
    responseData['columns'] = columns;
    responseData['iterations'] = iterations;
    this.setState({ ports: ports });
    this.setState({ configData: configCategories });
    this.setState({ responseDataAll: this.state.responseDataAll.concat(iterations) });
    return responseData;
  }

  containsKey(columns, item) {
    var contains = false;
    for (var column in columns) {
      if (columns[column].key == item) {
        return true;
      }
      var keys = Object.keys(columns[column]);
      for (var key in keys) {
        if (keys[key] == 'children') {
          this.containsKey(columns[column].children, item);
        }
      }
    }
    return contains;
  }

  containsTitle(columns, item) {
    var contains = false;
    for (var column in columns) {
      if (columns[column].title == item) {
        return true;
      }
      var keys = Object.keys(columns[column]);
      for (var key in keys) {
        if (keys[key] == 'children') {
          this.containsTitle(columns[column].children, item);
        }
      }
    }
    return contains;
  }

  containsIteration(columns, item) {
    if (columns.children == undefined) {
      return false;
    }
    var contains = false;
    for (var column in columns.children) {
      if (columns.children[column].title == item) {
        return true;
      }
    }
    return contains;
  }

  getColumnIndex(columns, item) {
    for (var column in columns) {
      if (columns[column].title == item) {
        return column;
      }
    }
  }

  compareIterations = params => {
    const { configData } = this.state;
    const { results, selectedController } = this.props;
    const { dispatch } = this.props;
    const configCategories = Object.keys(configData);

    dispatch({
      type: 'dashboard/modifyConfigCategories',
      payload: configCategories,
    });
    dispatch({
      type: 'dashboard/modifyConfigData',
      payload: configData,
    });
    dispatch({
      type: 'dashboard/modifySelectedResults',
    });

    dispatch(
      routerRedux.push({
        pathname: '/dashboard/comparison',
        state: {
          iterations: params,
          configCategories: configCategories,
          configData: configData,
          results: results,
          controller: selectedController,
        },
      })
    );
  };

  compareAllIterations = () => {
    const { responseDataAll, configData } = this.state;
    const { results, selectedController } = this.props;
    const { dispatch } = this.props;
    const configCategories = Object.keys(configData);

    dispatch({
      type: 'dashboard/modifyConfigCategories',
      payload: configCategories,
    });
    dispatch({
      type: 'dashboard/modifyConfigData',
      payload: configData,
    });
    dispatch({
      type: 'dashboard/modifySelectedResults',
    });

    dispatch(
      routerRedux.push({
        pathname: '/dashboard/comparison',
        state: {
          iterations: responseDataAll,
          configCategories: configCategories,
          configData: configData,
          results: results,
          controller: selectedController,
        },
      })
    );
  };

  configChange = (value, category) => {
    var { selectedConfig } = this.state;
    if (value == undefined) {
      delete selectedConfig[category];
    } else {
      selectedConfig[category] = value;
    }
    this.setState({ selectedConfig: selectedConfig });
  };

  clearFilters = () => {
    this.setState({ selectedConfig: [] });
    this.setState({ selectedPort: 'all' });
  };

  portChange = value => {
    this.setState({ selectedPort: value });
  };

  render() {
    const {
      responseData,
      loadingButton,
      selectedRowKeys,
      selectedPort,
      ports,
      configData,
      selectedConfig,
    } = this.state;
    const { selectedController, loading } = this.props;

    var selectedRowNames = [];
    for (var item in selectedRowKeys) {
      if (selectedRowKeys[item].length > 0) {
        for (var row in selectedRowKeys[item]) {
          selectedRowNames.push(
            responseData[item].iterations[selectedRowKeys[item][row]].iteration_name
          );
        }
      }
    }

    var responseDataCopy = [];
    for (var response in responseData) {
      responseDataCopy[response] = [];
      responseDataCopy[response]['columns'] = cloneDeep(responseData[response].columns);
      responseDataCopy[response]['iterations'] = cloneDeep(responseData[response].iterations);
      responseDataCopy[response]['resultName'] = cloneDeep(responseData[response].resultName);
    }

    for (var response in responseDataCopy) {
      var responseColumns = responseDataCopy[response].columns;
      var responseIterations = responseDataCopy[response].iterations;
      for (var column in responseColumns) {
        if (responseColumns[column]['children'] != undefined) {
          for (var networkColumn in responseColumns[column]['children']) {
            if (responseColumns[column]['children'][networkColumn]['children'] != undefined) {
              for (var portColumn in responseColumns[column]['children'][networkColumn][
                'children'
              ]) {
                if (
                  !responseColumns[column]['children'][networkColumn]['children'][portColumn][
                    'title'
                  ].includes(selectedPort)
                ) {
                  responseColumns[column]['children'][networkColumn]['children'].splice(
                    portColumn,
                    1
                  );
                }
              }
            }
          }
        }
      }
      var selectedConfigLength = Object.keys(selectedConfig).length;
      if (selectedConfigLength > 0) {
        var filteredResponseData = [];
        for (var iteration in responseIterations) {
          var found = [];
          for (var config in selectedConfig) {
            if (
              (selectedConfig[config] !== undefined) &
              (selectedConfig[config] == responseIterations[iteration][config])
            ) {
              found.push(true);
            }
          }
          if (found.length == selectedConfigLength) {
            filteredResponseData.push(responseIterations[iteration]);
          }
        }
        responseDataCopy[response].iterations = filteredResponseData;
      }
    }

    return (
      <PageHeaderLayout title={selectedController}>
        <Spin style={{ marginTop: 200, alignSelf: 'center' }} spinning={loading}>
          <Card style={{ marginBottom: 16 }}>
            {selectedRowNames.length > 0 ? (
              <div
                style={{ marginTop: 16 }}
                title={
                  <Button
                    type="primary"
                    onClick={this.onCompareIterations}
                    disabled={selectedRowNames.length == 0}
                    loading={loadingButton}
                  >
                    {'Compare Iterations'}
                  </Button>
                }
                type="inner"
              >
                {selectedRowNames.map((row, i) => (
                  <Tag key={i} id={i}>{row}</Tag>
                ))}
              </div>
            ) : (
              <div />
            )}
            <Button
              type="primary"
              style={{ alignSelf: 'flex-start' }}
              onClick={this.compareAllIterations}
              loading={loadingButton}
            >
              {'Compare All Iterations'}
            </Button>
            <Button style={{ marginLeft: 8 }} onClick={this.clearFilters} loading={loadingButton}>
              {'Clear Filters'}
            </Button>
            <br />
            <Select
              allowClear={true}
              placeholder={'Filter Hostname & Port'}
              style={{ marginTop: 16, width: 160 }}
              onChange={this.portChange}
              value={selectedPort}
            >
              {ports.map((port, i) => (
                <Select.Option value={port}>{port}</Select.Option>
              ))}
            </Select>
            {Object.keys(configData).map((category, i) => (
              <Select
                key={i}
                allowClear={true}
                placeholder={category}
                style={{ marginLeft: 8, width: 160 }}
                value={selectedConfig[category]}
                onChange={value => this.configChange(value, category)}
              >
                {configData[category].map((categoryData, i) => (
                  <Select.Option key={i} value={categoryData}>{categoryData}</Select.Option>
                ))}
              </Select>
            ))}
          </Card>
          {responseDataCopy.map((response, i) => {
            const rowSelection = {
              selectedRowKeys: selectedRowKeys[i],
              onSelect: (record, selected, selectedRows) =>
                this.onSelectChange(record, selected, selectedRows),
              hideDefaultSelections: true,
              fixed: true,
            };
            return (
              <Card key={i} style={{ marginBottom: 16 }}>
                <h2>{response.resultName}</h2>
                <Table
                  key={i}
                  style={{ marginTop: 16 }}
                  rowSelection={rowSelection}
                  columns={response.columns}
                  dataSource={response.iterations}
                  bordered
                />
              </Card>
            );
          })}
        </Spin>
      </PageHeaderLayout>
    );
  }
}

export default connect(() => ({}))(CompareResults);
