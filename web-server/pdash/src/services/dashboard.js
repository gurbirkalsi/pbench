import request from '../utils/request';
import moment from 'moment';
import axios from 'axios';

import storeConfig from '../../dist/datastore.json';

const elasticsearch = storeConfig.elasticsearch;
const production = storeConfig.production;
const prefix = storeConfig.prefix;
const runIndex = storeConfig.run_index;

function parseMonths(startMonth, endMonth) {
  let months = '';

  if (endMonth.isBefore(moment().endOf('month'))) {
    months = months.concat(prefix + runIndex + endMonth.format('YYYY-MM') + ',');
  }
  while (startMonth.isBefore(endMonth) && startMonth.isBefore(moment().endOf('month'))) {
    months = months.concat(prefix + runIndex + startMonth.format('YYYY-MM') + ',');
    startMonth.add(1, 'month');
  }

  return months;
}

export async function queryControllers(params) {
  const { startMonth, endMonth } = params;

  const endpoint = elasticsearch + parseMonths(startMonth, endMonth) + '/_search';

  return request(endpoint, {
    method: 'POST',
    body: {
      aggs: {
        controllers: {
          terms: {
            field: 'controller',
            size: 0,
            order: {
              runs: 'desc',
            },
          },
          aggs: {
            runs: {
              min: {
                field: 'run.start_run',
              },
            },
          },
        },
      },
    },
  });
}

export async function queryResults(params) {
  const { startMonth, endMonth, controller } = params;

  const endpoint = elasticsearch + parseMonths(startMonth, endMonth) + '/_search';

  return request(endpoint, {
    method: 'POST',
    body: {
      fields: ['run.controller', 'run.start_run', 'run.end_run', 'run.name', 'run.config'],
      sort: {
        'run.end_run': {
          order: 'desc',
          ignore_unmapped: true,
        },
      },
      query: {
        term: {
          'run.controller': controller,
        },
      },
      size: 5000,
    },
  });
}

export async function queryResult(params) {
  const { startMonth, endMonth, result } = params;

  const endpoint = elasticsearch + parseMonths(startMonth, endMonth) + '/_search?source=';

  return request(endpoint, {
    method: 'POST',
    body: {
      query: {
        match: {
          'run.name': result,
        },
      },
      sort: '_index',
    },
  });
}

export async function queryIterations(params) {
  const { selectedResults } = params;

  let iterationRequests = [];
  if (typeof params.selectedResults != undefined) {
    selectedResults.map(result => {
      if (result.controller.includes('.')) {
        axios.get(
          production +
            '/results/' +
            encodeURI(result.controller.slice(0, result.controller.indexOf('.'))) +
            '/' +
            encodeURI(result.result) +
            '/result.json'
        );
      }
      iterationRequests.push(
        axios.get(
          production +
            '/results/' +
            encodeURI(result.controller.slice(0, result.controller.indexOf('.'))) +
            '/' +
            encodeURI(result.result) +
            '/result.json'
        )
      );
    });

    return Promise.all(iterationRequests)
      .then(response => {
        let iterations = [];
        response.map((iteration, index) => {
          iterations.push({
            iterationData: iteration.data,
            controllerName: iteration.config.url.split('/')[4],
            resultName: iteration.config.url.split('/')[5],
            tableId: index,
          });
        });

        return iterations;
      })
      .catch(error => {
        console.log(error);
      });
  }
}
