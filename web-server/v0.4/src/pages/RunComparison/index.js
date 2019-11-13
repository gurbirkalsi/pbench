import React from 'react';
import { connect } from 'dva';
import {
  Row,
  Col,
  Card,
  Select,
  Spin,
  Tag,
  Table,
  Button,
  Form,
  Modal,
  Input,
  Switch,
  message,
  Descriptions,
} from 'antd';
import { ResponsiveBar } from '@nivo/bar';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import moment from 'moment';
import PageHeaderLayout from '../../layouts/PageHeaderLayout';
import { generateIterationClusters } from '../../utils/parse';
import TimeseriesGraph from '@/components/TimeseriesGraph';

const FormItem = Form.Item;

const tabList = [
  {
    key: 'summary',
    tab: 'Summary',
  },
  {
    key: 'timeseries',
    tab: 'Timeseries',
  },
];

@connect(({ dashboard, global, datastore }) => ({
  iterationParams: dashboard.iterationParams,
  selectedControllers: global.selectedControllers,
  selectedResults: global.selectedResults,
  selectedIterations: global.selectedIterations,
  datastoreConfig: datastore.datastoreConfig,
}))
class RunComparison extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      timeseriesData: [],
      timeseriesDropdown: [],
      timeseriesDropdownSelected: [],
      clusteredIterations: [],
      clusteredGraphData: [],
      graphKeys: [],
      tableData: [],
      selectedConfig: [],
      loadingClusters: false,
      loadingPdf: false,
      exportModalVisible: false,
      defaultComponents: ['details', 'summary', 'table', 'timeseries'],
      selectedComponents: [],
      pdfHeader: '',
      pdfName: '',
      activeSummaryTab: 'summary',
      activeClusterTab: 'Gb_sec',
    };
  }

  componentDidMount = () => {
    const { iterationParams, selectedIterations } = this.props;

    this.onGenerateIterationClusters(Object.keys(iterationParams), selectedIterations);
  };

  onGenerateIterationClusters = (clusters, iterations) => {
    const { datastoreConfig, dispatch } = this.props;

    this.setState({ loadingClusters: true });
    Promise.resolve(generateIterationClusters(clusters, iterations)).then(iterationClusters => {
      this.setState({
        ...iterationClusters,
      });
      dispatch({
        type: 'dashboard/fetchTimeseriesData',
        payload: {
          clusteredIterations: iterationClusters.clusteredIterations,
          datastoreConfig,
        },
      }).then(timeseriesData => {
        this.setState({ loadingClusters: false });
        this.setState({
          ...timeseriesData,
        });
      });
    });
  };

  onResetIterationClusters = () => {
    const { iterationParams, selectedIterations } = this.props;

    this.onGenerateIterationClusters(Object.keys(iterationParams), selectedIterations);
  };

  onChangeIterationClusters = clusters => {
    const { selectedIterations } = this.props;

    this.onGenerateIterationClusters(clusters, selectedIterations);
  };

  onTimeseriesClusterChange = (value, primaryMetric) => {
    const { timeseriesDropdownSelected } = this.state;
    timeseriesDropdownSelected[primaryMetric] = value;
    this.setState({ timeseriesDropdownSelected });
  };

  savePDF = () => {
    const { pdfHeader, pdfName, selectedComponents } = this.state;

    // eslint-disable-next-line new-cap
    let doc = new jsPDF('p', 'mm', 'a4', true);
    let position = 5;
    let fullIHeight = 0;
    const promises = selectedComponents.map(async (check, index) => {
      await html2canvas(document.querySelector(`#${check}`), { allowTaint: true }).then(canvas => {
        doc.setPage(index);
        canvas.getContext('2d');
        const imgData = canvas.toDataURL();
        const imgWidth = 210;
        const pageHeight = 295;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        position = fullIHeight + 5;
        fullIHeight += imgHeight;
        let heightLeft = fullIHeight;
        doc = doc.addImage(imgData, 'PNG', 3, position, imgWidth, imgHeight, '', 'FAST');
        doc.text(pdfHeader, 115, 10, 'center');
        heightLeft -= pageHeight;
        while (heightLeft >= 0) {
          position = heightLeft - fullIHeight;
          doc.addPage();
          doc = doc.addImage(imgData, 'PNG', 3, position, imgWidth, imgHeight, '', 'FAST');
          heightLeft -= pageHeight;
        }
      });
    });
    Promise.all(promises).then(() => {
      doc.save(`${pdfName}.pdf`);
      this.setState({
        exportModalVisible: false,
        loadingPdf: false,
      });
    });
  };

  showExportModal = () => {
    this.setState({
      exportModalVisible: true,
    });
  };

  hideExportModal = () => {
    this.setState({
      exportModalVisible: false,
    });
  };

  onExportPdf = () => {
    const { pdfName, pdfHeader, defaultComponents } = this.state;

    this.setState(
      {
        pdfName: document.getElementById('pdfName').value,
        pdfHeader: document.getElementById('pdfHeader').value,
      },
      () => {
        if (pdfName === '') {
          this.setState({
            pdfName: moment().format(),
          });
        }
        if (pdfHeader === '') {
          message.error('Add PDF description');
        } else {
          this.setState(
            {
              loadingPdf: true,
              selectedComponents: defaultComponents.length === 4 ? ['all'] : [...defaultComponents],
            },
            () => {
              this.savePDF();
            }
          );
        }
      }
    );
  };

  onTabChange = key => {
    this.setState({ activeSummaryTab: key });
  };

  onClusterChange = key => {
    this.setState({ activeClusterTab: key });
  };

  onSelectPageSection = id => {
    const { defaultComponents } = this.state;

    if (defaultComponents.includes(id)) {
      const components = defaultComponents.filter(check => check !== id);
      this.setState({
        defaultComponents: components,
      });
    } else {
      this.setState({
        defaultComponents: [...defaultComponents, id],
      });
    }
  };

  render() {
    const {
      graphKeys,
      tableData,
      clusteredGraphData,
      clusteredIterations,
      selectedConfig,
      timeseriesData,
      timeseriesDropdown,
      timeseriesDropdownSelected,
      loadingPdf,
      exportModalVisible,
      loadingClusters,
      activeSummaryTab,
      activeClusterTab,
    } = this.state;
    const { selectedControllers, selectedResults, iterationParams } = this.props;

    const legendColumns = [
      {
        title: 'cluster ID',
        dataIndex: 'clusterID',
        key: 'clusterID',
      },
    ];

    Object.keys(iterationParams).forEach(config => {
      legendColumns.push({
        title: config,
        dataIndex: config,
        key: config,
      });
    });

    const description = (
      <div>
        <Descriptions bordered>
          <Descriptions.Item label="Selected Controllers">
            {selectedControllers.join(',')}
          </Descriptions.Item>
          <Descriptions.Item label="Selected Results">
            {selectedResults.map(result => (
              <Tag key={result}>{result['run.name']}</Tag>
            ))}
          </Descriptions.Item>
        </Descriptions>
        <Descriptions bordered style={{ marginTop: 16 }}>
          <Descriptions.Item label="Clustering Config">
            <Select
              addonBefore="Cluster Parameters"
              mode="tags"
              placeholder="Select cluster config"
              value={selectedConfig}
              defaultValue={Object.keys(iterationParams)}
              onChange={this.onChangeIterationClusters}
            >
              {Object.keys(iterationParams).map(category => (
                <Select.Option value={category} key={category}>
                  {category}
                </Select.Option>
              ))}
            </Select>
            <Button
              type="primary"
              onClick={this.onResetIterationClusters}
              style={{ marginLeft: 8 }}
            >
              Reset
            </Button>
          </Descriptions.Item>
        </Descriptions>
      </div>
    );

    const action = (
      <div>
        <Button style={{}} type="primary" onClick={this.showExportModal}>
          Export
        </Button>
      </div>
    );

    const exportModal = (
      <Modal
        title="Export to PDF"
        visible={exportModalVisible}
        onOk={this.onExportPdf}
        okText="Save"
        onCancel={this.hideExportModal}
      >
        <Spin spinning={loadingPdf}>
          <Form>
            <Form.Item
              colon={false}
              label="File Name"
              extra="(Optional) Timestamp will be used if left blank"
            >
              <Input addonAfter=".pdf" id="pdfName" />
            </Form.Item>
            <Form.Item colon={false} label="Description" extra="(Optional)">
              <Input id="pdfHeader" />
            </Form.Item>
          </Form>

          <Card type="inner" title="Render Options">
            <Form layout="inline">
              <Form.Item colon={false} label="Details">
                <Switch
                  defaultChecked
                  onSelectPageSection={() => this.onSelectPageSection('details')}
                />
              </Form.Item>
              <Form.Item colon={false} label="Summary Graphs">
                <Switch
                  defaultChecked
                  onSelectPageSection={() => this.onSelectPageSection('summary')}
                />
              </Form.Item>
              <Form.Item colon={false} label="Timeseries Graphs">
                <Switch
                  defaultChecked
                  onSelectPageSection={() => this.onSelectPageSection('timeseries')}
                />
              </Form.Item>
              <Form.Item colon={false} label="Cluster Tables">
                <Switch
                  defaultChecked
                  onSelectPageSection={() => this.onSelectPageSection('table')}
                />
              </Form.Item>
            </Form>
          </Card>
        </Spin>
      </Modal>
    );

    const clusterTabList = [];
    Object.keys(clusteredGraphData).forEach(cluster => {
      clusterTabList.push({
        key: cluster,
        tab: cluster,
      });
    });

    const clusterTabContent = [];
    // eslint-disable-next-line array-callback-return
    Object.keys(clusteredGraphData).map(cluster => {
      clusterTabContent[cluster] = (
        <div>
          <Row style={{ marginTop: 16 }}>
            <Col xl={16} lg={12} md={12} sm={24} xs={24} style={{ height: 500 }}>
              <ResponsiveBar
                data={clusteredGraphData[cluster]}
                keys={graphKeys[cluster]}
                indexBy="cluster"
                groupMode="grouped"
                padding={0.3}
                width={1500}
                labelSkipWidth={18}
                labelSkipHeight={18}
                tooltip={({ id, index, value }) => (
                  <div style={{ backgroundColor: 'white', color: 'grey' }}>
                    <Row>
                      <Col>Result</Col>
                      <Col>{clusteredIterations[cluster][index][id].result_name}</Col>
                    </Row>
                    <br />
                    <Row>
                      <Col>Iteration</Col>
                      <Col>{clusteredIterations[cluster][index][id].iteration_name}</Col>
                    </Row>
                    <br />
                    <Row>
                      <Col>Mean</Col>
                      <Col>{value}</Col>
                    </Row>
                    <br />
                    <Row>
                      <Col>Matched Configurations</Col>
                      <Col>
                        <div>
                          {tableData[cluster][index].cluster
                            .split('-')
                            .map(
                              tag => (tag.length > 0 ? <Tag color="#2db7f5">{tag}</Tag> : <div />)
                            )}
                        </div>
                      </Col>
                    </Row>
                  </div>
                )}
                borderColor="inherit:darker(1.6)"
                margin={{
                  top: 32,
                  left: 64,
                  bottom: 64,
                  right: 32,
                }}
                axisLeft={{
                  orient: 'left',
                  tickSize: 5,
                  tickPadding: 5,
                  tickRotation: 0,
                  legend: 'mean',
                  legendPosition: 'center',
                  legendOffset: -40,
                }}
                axisBottom={{
                  orient: 'bottom',
                  tickSize: 5,
                  tickPadding: 5,
                  tickRotation: 0,
                  legend: 'cluster ID',
                  legendPosition: 'center',
                  legendOffset: 36,
                }}
                labelTextColor="inherit:darker(1.6)"
                theme={{
                  tooltip: {
                    container: {
                      background: 'white',
                      fontSize: '13px',
                    },
                  },
                  labels: {
                    textColor: '#555',
                  },
                }}
              />
            </Col>
          </Row>
          <Table
            style={{ marginTop: 16 }}
            size="small"
            columns={legendColumns}
            dataSource={tableData[cluster]}
          />
        </div>
      );
    });

    const contentList = {
      summary: (
        <Spin spinning={loadingClusters}>
          <Card
            type="inner"
            style={{ marginBottom: 16 }}
            tabList={clusterTabList}
            activeTabKey={activeClusterTab}
            onTabChange={key => {
              this.onClusterChange(key);
            }}
          >
            {clusterTabContent[activeClusterTab]}
          </Card>
        </Spin>
      ),
      timeseries: (
        <div>
          {Object.keys(timeseriesData).length > 0 &&
            Object.keys(timeseriesDropdown).length > 0 && (
              <div id="timeseries">
                {Object.keys(tableData).map(table => (
                  <Card
                    type="inner"
                    title={table}
                    style={{ marginBottom: 16 }}
                    extra={
                      <Form layout="inline">
                        <FormItem
                          label="Selected Cluster"
                          colon={false}
                          style={{ marginLeft: 16, fontWeight: '500' }}
                        >
                          <Select
                            defaultValue={`Cluster ${0}`}
                            style={{ width: 120, marginLeft: 16 }}
                            value={timeseriesDropdownSelected[table]}
                            onChange={value => this.onTimeseriesClusterChange(value, table)}
                          >
                            {timeseriesDropdown[table].map(cluster => (
                              <Select.Option value={cluster}>{`Cluster ${cluster}`}</Select.Option>
                            ))}
                          </Select>
                        </FormItem>
                      </Form>
                    }
                  >
                    <TimeseriesGraph
                      key={table}
                      graphId={table}
                      graphName={table}
                      data={timeseriesData[table][timeseriesDropdownSelected[table]][0].data}
                      dataSeriesNames={
                        timeseriesData[table][timeseriesDropdownSelected[table]][0]
                          .data_series_names
                      }
                      xAxisSeries={
                        timeseriesData[table][timeseriesDropdownSelected[table]][0].x_axis_series
                      }
                    />
                  </Card>
                ))}
              </div>
            )}
        </div>
      ),
    };

    return (
      <div id="all">
        <div id="details">
          <PageHeaderLayout
            title="Run Comparison"
            content={description}
            action={action}
            tabList={tabList}
            tabActiveKey={activeSummaryTab}
            onTabChange={this.onTabChange}
          >
            {contentList[activeSummaryTab]}
          </PageHeaderLayout>
        </div>
        {exportModal}
      </div>
    );
  }
}

export default RunComparison;
