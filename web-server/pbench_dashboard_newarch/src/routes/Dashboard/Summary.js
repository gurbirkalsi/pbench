import React from 'react';
import { connect } from 'dva';
import { Select, Spin, Tag, Table, Button, Card } from 'antd';
import axios from 'axios';
import cloneDeep from 'lodash/cloneDeep';
import PageHeaderLayout from '../../layouts/PageHeaderLayout';

const tabList = [{
  key: 'summary',
  tab: 'Summary',
}, {
  key: 'iterations',
  tab: 'Iterations',
},{
  key: 'metadata',
  tab: 'Metadata',
}, {
  key: 'tools',
  tab: 'Tools & Parameters',
}, {
  key: 'jschart',
  tab: 'Test JSChart'
}];

class Summary extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      summaryResult: [],
      iterations: [],
      iterationSearch: [],
      columns: [],
      configData: {},
      selectedConfig: [],
      responseData: {},
      selectedPort: "all",
      ports: [],
      loading: true,
      searchText: '',
      activeTab: 'summary'
    }
  }

  componentDidMount() {
    this.setState({loading: true});
    const { result, controller } = this.props.location.state;
    axios.get('http://es-perf44.perf.lab.eng.bos.redhat.com:9280/dsa.pbench.*/_search?source={ "query": { "match": { "run.name": "' + result + '" } }, "sort": "_index" }').then(res => {
      var result = [];
      result.push(res.data.hits.hits[0]);
      this.setState({summaryResult: result});
    });

    var iterationEndpoint = "";
    if (controller != null && controller.includes('.')) {
      iterationEndpoint = 'http://perf42.perf.lab.eng.bos.redhat.com:8081/results/' + encodeURI((controller).slice(0, (controller).indexOf("."))) +'/'+ encodeURI(result) + '/result.json';
    } else {
      iterationEndpoint = 'http://perf42.perf.lab.eng.bos.redhat.com:8081/results/' + encodeURI(controller) +'/'+ encodeURI(result) + '/result.json';
    }
    axios.get(iterationEndpoint).then(res => {
      const response = res.data;
      const responseData = this.parseJSONData(response, result, controller);
      this.setState({responseData: responseData});
      this.setState({loading: false});
    })
    .catch(error => {
      console.log(error);
      this.setState({loading: false});
    });
  }

  retrieveResults(params) {
    const { result, controller } = this.props.location.state;

    history.push({
      pathname: '/dashboard/results/' + controller.slice(0, controller.indexOf(".")) + '/' + result + '/'+ params[1].iteration_number + '-' + params[1].iteration_name + '/sample' + params[0],
      state: {
        controllerName: params[1].controller_name, 
        resultName: params[1].result_name, 
        iterationNumber: params[1].iteration_number,
        iterationName: params[1].iteration_name, 
        closestSample: params[1].closest_sample
      }
    })
  }

  parseJSONData(response, resultName, controllerName) {
    var responseData = [];
    var columns = [{
      title: 'Iteration Number',
      dataIndex: 'iteration_number',
      fixed: 'left',
      width: 75,
      key: 'iteration_number',
      sorter: (a, b) => a.iteration_number - b.iteration_number
    }, {
      title: 'Iteration Name',
      dataIndex: 'iteration_name',
      fixed: 'left',
      width: 150,
      key: 'iteration_name'
    }];
    var iterations = [];
    var ports = [];
    var configCategories = {};

    for (var iteration in response) {
      if (!response[iteration].iteration_name.includes("fail")) {
        var iterationObject = {iteration_name: response[iteration].iteration_name, iteration_number: response[iteration].iteration_number, result_name: resultName, controller_name: controllerName};
        var configObject = {};
        var keys = [];
        if (response[iteration].iteration_data.parameters.benchmark[0] != undefined ) {
          var keys = Object.keys(response[iteration].iteration_data.parameters.benchmark[0])
          for (var key in keys) {
            if (keys[key] != "uid" & keys[key] != "clients" & keys[key] != "servers" & keys[key] != "max_stddevpct") {
              if (!Object.keys(configCategories).includes(keys[key])) {
                var obj = {};
                configCategories[keys[key]] = [response[iteration].iteration_data.parameters.benchmark[0][keys[key]]]
              } else {
                if (!configCategories[keys[key]].includes(response[iteration].iteration_data.parameters.benchmark[0][keys[key]])) {
                  configCategories[keys[key]].push(response[iteration].iteration_data.parameters.benchmark[0][keys[key]])
                }
              }
              configObject[keys[key]] = response[iteration].iteration_data.parameters.benchmark[0][keys[key]]
            }
          }
        }
        var iterationObject = Object.assign({}, iterationObject, configObject)
        for (var iterationType in response[iteration].iteration_data) {
          if (iterationType != "parameters") {
            if (!this.containsTitle(columns, iterationType)) {
              columns.push({title: iterationType});
            }
            for (var iterationNetwork in (response[iteration].iteration_data[iterationType])) {
              var parentColumnIndex = this.getColumnIndex(columns, iterationType);
              if (!this.containsIteration(columns[parentColumnIndex], iterationNetwork)) {
                if (columns[parentColumnIndex]["children"] == undefined) {
                  columns[parentColumnIndex]["children"] = [{title: iterationNetwork}];
                } else {
                  columns[parentColumnIndex]["children"].push({title: iterationNetwork});
                }
                for (var iterationData in (response[iteration].iteration_data[iterationType][iterationNetwork])) {
                  var columnTitle = "client_hostname:" + response[iteration].iteration_data[iterationType][iterationNetwork][iterationData].client_hostname + "-server_hostname:" + response[iteration].iteration_data[iterationType][iterationNetwork][iterationData].server_hostname + "-server_port:" + response[iteration].iteration_data[iterationType][iterationNetwork][iterationData].server_port;
                  if (columns[parentColumnIndex]["children"] == undefined) {
                    var childColumnIndex = 0;
                  } else {
                    var childColumnIndex = this.getColumnIndex(columns[parentColumnIndex].children, iterationNetwork);
                  }
                  if (!this.containsIteration(columns[parentColumnIndex].children[childColumnIndex], columnTitle)) {
                    if (columns[parentColumnIndex].children[childColumnIndex]["children"] == undefined) {
                      columns[parentColumnIndex].children[childColumnIndex]["children"] = [{title: columnTitle, dataIndex: columnTitle}];
                    } else {
                      columns[parentColumnIndex].children[childColumnIndex]["children"].push({title: columnTitle});
                    }
                    var columnValue = columnTitle.split(":")[3];
                    if (!ports.includes(columnValue)) {
                      ports.push(columnValue)
                    }
                    var columnMean = iterationType + "-" + iterationNetwork + "-" + columnTitle + "-" + "mean";
                    var columnStdDev = iterationType + "-" + iterationNetwork + "-" + columnTitle + "-" + "stddevpct";
                    var columnSample = iterationType + "-" + iterationNetwork + "-" + columnTitle + "-" + "closestsample";
                    var dataChildColumnIndex = this.getColumnIndex(columns[parentColumnIndex].children[childColumnIndex]["children"], columnTitle);
                    if (dataChildColumnIndex == undefined) {
                      dataChildColumnIndex = 0;
                    }
                    if (!this.containsKey(columns, columnMean)) {
                      if (columns[parentColumnIndex].children[childColumnIndex].children[dataChildColumnIndex]["children"] == undefined) {
                          columns[parentColumnIndex].children[childColumnIndex].children[dataChildColumnIndex]["children"] = [{title: "mean", dataIndex: columnMean, key: columnMean, sorter: (a, b) => a[columnMean] - b[columnMean]}];
                          iterationObject[columnMean] = response[iteration].iteration_data[iterationType][iterationNetwork][iterationData].mean;
                      } else {
                          columns[parentColumnIndex].children[childColumnIndex].children[dataChildColumnIndex]["children"].push({title: "mean", dataIndex: columnMean, key: columnMean, sorter: (a, b) => a[columnMean] - b[columnMean]});
                          iterationObject[columnMean] = response[iteration].iteration_data[iterationType][iterationNetwork][iterationData].mean;
                      }
                    }
                    if (!this.containsKey(columns, columnStdDev)) {
                      if (columns[parentColumnIndex].children[childColumnIndex].children[dataChildColumnIndex]["children"] == undefined) {
                          columns[parentColumnIndex].children[childColumnIndex].children[dataChildColumnIndex]["children"] = [{title: "stddevpct", dataIndex: columnStdDev, key: columnStdDev, sorter: (a, b) => a[columnStdDev] - b[columnStdDev]}];
                          iterationObject[columnStdDev] = response[iteration].iteration_data[iterationType][iterationNetwork][iterationData].stddevpct;
                      } else {
                          columns[parentColumnIndex].children[childColumnIndex].children[dataChildColumnIndex]["children"].push({title: "stddevpct", dataIndex: columnStdDev, key: columnStdDev, sorter: (a, b) => a[columnStdDev] - b[columnStdDev]});
                          iterationObject[columnStdDev] = response[iteration].iteration_data[iterationType][iterationNetwork][iterationData].stddevpct;
                      }
                    }
                    if (!this.containsKey(columns, columnSample)) {
                      if (columns[parentColumnIndex].children[childColumnIndex].children[dataChildColumnIndex]["children"] == undefined) {
                          columns[parentColumnIndex].children[childColumnIndex].children[dataChildColumnIndex]["children"] = [{title: "closest sample", dataIndex: columnSample, key: columnSample, sorter: (a, b) => a[columnSample] - b[columnSample], render: (text, record) => {
                              return (
                                <a onClick={() => this.retrieveResults([text, record])}>{text}</a>
                              );
                            },
                          }];
                          iterationObject[columnSample] = response[iteration].iteration_data[iterationType][iterationNetwork][iterationData]['closest sample'];
                          iterationObject['closest_sample'] = response[iteration].iteration_data[iterationType][iterationNetwork][iterationData]['closest sample'];
                      } else {
                          columns[parentColumnIndex].children[childColumnIndex].children[dataChildColumnIndex]["children"].push({title: "closest sample", dataIndex: columnSample, key: columnSample, sorter: (a, b) => a[columnSample] - b[columnSample], render: (text, record) => {
                              return (
                                <a onClick={() => this.retrieveResults([text, record])}>{text}</a>
                              );
                            },
                          });
                          iterationObject[columnSample] = response[iteration].iteration_data[iterationType][iterationNetwork][iterationData]['closest sample'];
                          iterationObject['closest_sample'] = response[iteration].iteration_data[iterationType][iterationNetwork][iterationData]['closest sample'];
                      }
                    }
                  }
                }
              } else {
                for (var iterationData in (response[iteration].iteration_data[iterationType][iterationNetwork])) {
                  var columnTitle = "client_hostname:" + response[iteration].iteration_data[iterationType][iterationNetwork][iterationData].client_hostname + "-server_hostname:" + response[iteration].iteration_data[iterationType][iterationNetwork][iterationData].server_hostname + "-server_port:" + response[iteration].iteration_data[iterationType][iterationNetwork][iterationData].server_port;
                  var columnMean = iterationType + "-" + iterationNetwork + "-" + columnTitle + "-" + "mean";
                  var columnStdDev = iterationType + "-" + iterationNetwork + "-" + columnTitle + "-" + "stddevpct";
                  var columnSample = iterationType + "-" + iterationNetwork + "-" + columnTitle + "-" + "closestsample";
                  iterationObject[columnMean] = response[iteration].iteration_data[iterationType][iterationNetwork][iterationData].mean;
                  iterationObject[columnStdDev] = response[iteration].iteration_data[iterationType][iterationNetwork][iterationData].stddevpct;
                  iterationObject[columnSample] = response[iteration].iteration_data[iterationType][iterationNetwork][iterationData]['closest sample'];
                  iterationObject['closest_sample'] = response[iteration].iteration_data[iterationType][iterationNetwork][iterationData]['closest sample'];
                }
              }
            }
          }
        }

        iterations.push(iterationObject);
      }
    };
    iterations.sort(function(a, b){return a.iteration_number - b.iteration_number});
    responseData["resultName"] = resultName;
    responseData["columns"] = columns;
    responseData["iterations"] = iterations;
    this.setState({ports: ports})
    this.setState({configData: configCategories});
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
        if (keys[key] == "children") {
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
        if (keys[key] == "children") {
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

  onInputChange = (e) => {
    this.setState({ searchText: e.target.value });
  }

  onSearch = () => {
    const { searchText, iterations } = this.state;
    const reg = new RegExp(searchText, 'gi');
    var iterationSearch = iterations.slice();
    this.setState({
      filtered: !!searchText,
      iterationSearch: iterationSearch.map((record) => {
        const match = record.iteration_name.match(reg);
        if (!match) {
          return null;
        }
        return {
          ...record,
          iteration_name: (
            <span>
              {record.iteration_name.split(reg).map((text, i) => (
                i > 0 ? [<span style={{color: 'orange'}}>{match[0]}</span>, text] : text
              ))}
            </span>
          )
        }
      }).filter(record => !!record),
    });
  }

  configChange = (value, category) => {
    var { selectedConfig } = this.state;
    if (value == undefined) {
      delete selectedConfig[category];
    } else {
      selectedConfig[category] = value;
    }
    this.setState({selectedConfig: selectedConfig})
  }

  clearFilters = () => {
    this.setState({selectedConfig: []})
    this.setState({selectedPort: "all"})
  }

  portChange = (value) => {
    if (value == "all") {
      this.setState({selectedPort: value})
      this.forceUpdate();
    }
    this.setState({selectedPort: value})
  }

  onTabChange = (key) => {
    this.setState({ activeTab: key });
  }

  render() {
    var { summaryResult, responseData, loading, selectedConfig, selectedPort, ports, configData, activeTab } = this.state;
    const { result, controller } = this.props.location.state;

    var responseDataCopy = {};
    responseDataCopy["columns"] = cloneDeep(responseData.columns)
    responseDataCopy["iterations"] = cloneDeep(responseData.iterations)
    responseDataCopy["resultName"] = cloneDeep(responseData.resultName)

    var responseColumns = responseDataCopy.columns;
    var responseIterations = responseDataCopy.iterations;
    for (var column in responseColumns) {
      if (responseColumns[column]["children"] != undefined) {
        for (var networkColumn in responseColumns[column]["children"]) {
          if (responseColumns[column]["children"][networkColumn]["children"] != undefined) {
            for (var portColumn in responseColumns[column]["children"][networkColumn]["children"]) {
              if (!responseColumns[column]["children"][networkColumn]["children"][portColumn]["title"].includes(selectedPort)) {
                responseColumns[column]["children"][networkColumn]["children"].splice(portColumn, 1);
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
            if (selectedConfig[config] !== undefined & selectedConfig[config] == responseIterations[iteration][config]) {
              found.push(true)
            }
          }
          if (found.length == selectedConfigLength) {
            filteredResponseData.push(responseIterations[iteration])
          }
        }
        responseDataCopy.iterations = filteredResponseData;
      }
    }

    if (summaryResult.length > 0 && Object.keys(summaryResult[0]).length !== 0) {
      var metadataTag = '';
      const hostTools = summaryResult[0]._source.host_tools_info;

      if (typeof summaryResult[0]._source['@metadata'] !== 'undefined') {
          metadataTag = '@metadata';
      } else {
          metadataTag = '_metadata';
      }

      const contentList = {
        summary: (
          <div>
            <Card style={{marginTop: 32, marginBottom: 16}}>
              <iframe src="http://10.18.81.12:2690/d/Dtsbj1iiz/rhcs-test-results?orgId=1&from=1529424980229&to=1529425669878&var-Test_ID=Bluestore-Tuned-2xOSDtoNVMeSSD-10min-Test-1-2018-06-19T12-25-17-UTC" width="1200" height="800" frameBorder="0"> </iframe>
            </Card>
            <Card style={{marginBottom: 16}}>
              <iframe src="http://10.18.81.12:2690/d-solo/Dtsbj1iiz/rhcs-test-results?orgId=1&panelId=38&from=1529424980229&to=1529425669878&var-Test_ID=Bluestore-Tuned-2xOSDtoNVMeSSD-10min-Test-1-2018-06-19T12-25-17-UTC" width="1000" height="400" frameborder="0"></iframe>            
            </Card>
            <Card style={{marginBottom: 16}}>
              <iframe src="http://10.18.81.12:2690/d-solo/Dtsbj1iiz/rhcs-test-results?orgId=1&panelId=39&from=1529424980229&to=1529425669878&var-Test_ID=Bluestore-Tuned-2xOSDtoNVMeSSD-10min-Test-1-2018-06-19T12-25-17-UTC" width="1000" height="400" frameborder="0"></iframe>            
            </Card>
            <Card style={{marginBottom: 16}}>
              <iframe src="http://10.18.81.12:2690/d-solo/Dtsbj1iiz/rhcs-test-results?panelId=27&orgId=1&from=1529424980229&to=1529425669878&var-Test_ID=Bluestore-Tuned-2xOSDtoNVMeSSD-10min-Test-1-2018-06-19T12-25-17-UTC" width="1000" height="400" frameborder="0"></iframe>            
            </Card>
            <Card style={{marginBottom: 16}}>
              <iframe src="http://10.18.81.12:2690/d-solo/Dtsbj1iiz/rhcs-test-results?panelId=25&orgId=1&from=1529424980229&to=1529425669878&var-Test_ID=Bluestore-Tuned-2xOSDtoNVMeSSD-10min-Test-1-2018-06-19T12-25-17-UTC" width="1000" height="400" frameborder="0"></iframe>            
            </Card>
          </div>
        ),
        iterations: (
          <Card title="Result Iterations" style={{marginTop: 32}}>
            <Button onClick={this.clearFilters}>Clear Filters</Button>
            <br />
            <Select
              allowClear={true}
              placeholder="Filter Hostname & Port"
              style={{ marginTop: 16, width: 160 }}
              onChange={this.portChange}
            >
              {ports.map((port, i) => (
                <Select.Option value={port}>{port}</Select.Option>
              ))}
            </Select>
            {Object.keys(configData).map((category, i) => (
              <Select
                allowClear={true}
                placeholder={category}
                style={{ marginLeft: 8, width: 160 }}
                value={selectedConfig[category]}
                onChange={value => this.configChange(value, category)}
              >
                {configData[category].map((categoryData, i) => (
                  <Select.Option value={categoryData}>
                    {categoryData}
                  </Select.Option>
                ))}
              </Select>
            ))}
            <Table
              style={{ marginTop: 16 }}
              columns={responseDataCopy.columns}
              dataSource={responseDataCopy.iterations}
              onRowClick={this.retrieveResults.bind(this)}
              bordered
            />
          </Card>
        ),
        metadata: (
          <Card title="Result Metadata" style={{ marginTop: 32 }}>
            <ul className="list-group">
              <li className="list-group-item">
                <h5 className="list-group-item-heading">Script</h5>
                <p className="list-group-item-text" id="script">
                  {summaryResult[0]._source.run.script}
                </p>
              </li>
              <li className="list-group-item">
                <h5 className="list-group-item-heading">Configuration</h5>
                <p className="list-group-item-text" id="config">
                  {summaryResult[0]._source.run.config}
                </p>
              </li>
              <li className="list-group-item">
                <h5 className="list-group-item-heading">Controller</h5>
                <p className="list-group-item-text" id="controller">
                  {summaryResult[0]._source.run.controller}
                </p>
              </li>
              <li className="list-group-item">
                <h5 className="list-group-item-heading">File Name</h5>
                <p
                  className="list-group-item-text"
                  style={{ overflowWrap: "break-word" }}
                  id="file_name"
                >
                  {summaryResult[0]._source[metadataTag]["file-name"]}
                </p>
              </li>
              <li className="list-group-item">
                <h5 className="list-group-item-heading">
                  Pbench Agent Version
                </h5>
                <p className="list-group-item-text" id="pbench_version">
                  {
                    summaryResult[0]._source[metadataTag][
                      "pbench-agent-version"
                    ]
                  }
                </p>
              </li>
              <li className="list-group-item">
                <h5 className="list-group-item-heading">Indexer Name</h5>
                <p className="list-group-item-text" id="generated_by">
                  {summaryResult[0]._source[metadataTag]["generated-by"]}
                </p>
              </li>
              <li className="list-group-item">
                <h5 className="list-group-item-heading">Indexer Version</h5>
                <p
                  className="list-group-item-text"
                  id="generated_by_version"
                >
                  {summaryResult[0]._source[metadataTag]["md5"]}
                </p>
              </li>
            </ul>
          </Card>
        ),
        tools: (
          <Card title="Tools and Parameters" style={{ marginTop: 32 }}>
            {hostTools.map((host, i) => (
              <div key={i}>
                <br />
                <li className="list-group-item">
                  <h5 className="list-group-item-heading">Host</h5>
                  <p className="list-group-item-text">{host.hostname}</p>
                </li>
                <li className="list-group-item">
                  <h5 className="list-group-item-heading">mpstat</h5>
                  <p className="list-group-item-text">
                    {host.tools.mpstat}
                  </p>
                </li>
                <li className="list-group-item">
                  <h5 className="list-group-item-heading">perf</h5>
                  <p className="list-group-item-text">{host.tools.perf}</p>
                </li>
                <li className="list-group-item">
                  <h5 className="list-group-item-heading">
                    proc-interrupts
                  </h5>
                  <p className="list-group-item-text">
                    {host.tools["proc-interrupts"]}
                  </p>
                </li>
                <li className="list-group-item">
                  <h5 className="list-group-item-heading">proc-vmstat</h5>
                  <p className="list-group-item-text">
                    {host.tools["proc-vmstat"]}
                  </p>
                </li>
                <li className="list-group-item">
                  <h5 className="list-group-item-heading">sar</h5>
                  <p className="list-group-item-text">{host.tools.sar}</p>
                </li>
                <li className="list-group-item">
                  <h5 className="list-group-item-heading">pidstat</h5>
                  <p className="list-group-item-text">
                    {host.tools.pidstat}
                  </p>
                </li>
                <li className="list-group-item">
                  <h5 className="list-group-item-heading">turbostat</h5>
                  <p className="list-group-item-text">
                    {host.tools.turbostat}
                  </p>
                </li>
                <li className="list-group-item">
                  <h5 className="list-group-item-heading">iostat</h5>
                  <p className="list-group-item-text">
                    {host.tools.iostat}
                  </p>
                </li>
              </div>
            ))}
          </Card>
        ),
        jschart: (
          <div></div>
        )
      };

      return (
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div>
              <PageHeaderLayout
                title={result}
                content={
                  <Tag color="blue" key={controller}>
                    {"controller: " + controller}
                  </Tag>
                }
                tabList={tabList}
                tabActiveKey={activeTab}
                onTabChange={this.onTabChange}
              />
              {contentList[activeTab]}
            </div>
          </div>
      );
    } else {
      return (
        <Spin></Spin>
      );
    }
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

export default connect(() => ({}))(Summary);

