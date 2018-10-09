export const parseIterationData = (response, resultName, controllerName, table) => {
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